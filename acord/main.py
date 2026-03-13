from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, Response
import json
import os
import tempfile
import base64
from datetime import datetime

# Local imports
from agents import run_request_reader, run_completer, run_reviewer, client
from schemas import RequestDemands, AutoPolicyDetails, GLPolicyDetails, UmbrellaPolicyDetails, WCPolicyDetails, ClientSettings
from pdf_utils import fill_acord_25, extract_text_from_pdf

app = FastAPI(title="ACORD Generation Engine API", description="Microservice for processing and filling ACORD 25 COIs.")

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/generate-coi")
async def generate_coi(
    request_pdf: UploadFile = File(...),
    policies_json: str = Form(...), # JSON string containing auto, gl, umb, wc policy data
    client_settings_json: str = Form(...) # JSON string containing managedAuto, managedGL, etc.
):
    print(f"Received request to generate COI.")
    
    # 1. Parse Policy JSON
    try:
        policy_data = json.loads(policies_json)
        # Parse into Pydantic Models for type safety and LLM compatibility
        auto_policy = AutoPolicyDetails(**policy_data.get("auto", {}))
        gl_policy = GLPolicyDetails(**policy_data.get("gl", {}))
        umb_policy = UmbrellaPolicyDetails(**policy_data.get("umbrella", {}))
        wc_policy = WCPolicyDetails(**policy_data.get("wc", {}))
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid policies_json format: {str(e)}")

    # 1.5 Parse Client Settings
    try:
        settings_data = json.loads(client_settings_json)
        client_settings = ClientSettings(**settings_data)
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid client_settings_json format: {str(e)}")

    # 2. Upload Request PDF to Gemini File API
    temp_dir = tempfile.gettempdir()
    temp_pdf_path = os.path.join(temp_dir, f"request_{datetime.now().timestamp()}.pdf")
    
    try:
        # Save uploaded file temporarily
        with open(temp_pdf_path, "wb") as f:
            content = await request_pdf.read()
            f.write(content)
            
        print("Uploading request document to Gemini...")
        req_file = client.files.upload(file=temp_pdf_path)
        
        # 3. Read the Demands
        print("Running Request Reader...")
        demands = run_request_reader(req_file)
        print(f"Demands Extracted: {demands.model_dump_json(indent=2)}")
        
        # 4. Map ACORD Fields Deterministically (Baseline)
        print("Mapping Deterministic Fields...")
        acord_fields = map_preview_fields(demands, auto_policy, gl_policy, umb_policy, wc_policy, client_settings)
        
        # 4.5 Map the Complex Contract-Dependent Fields via LLM
        print("Running Completer for Description and Checkboxes...")
        llm_fields = run_completer(demands, auto_policy, gl_policy, umb_policy, wc_policy, client_settings)
        
        # Merge LLM choices into the deterministic baseline
        for key, val in llm_fields.items():
            if val is not None and val != "":
                acord_fields[key] = str(val)
        
        # --- DYNAMIC INSURER LETTER ASSIGNMENT ---
        insurers = {}
        target_letters = ['A', 'B', 'C', 'D', 'E', 'F']
        current_letter_idx = 0
        
        def assign_insurer(policy_details):
            nonlocal current_letter_idx
            if not policy_details or not policy_details.insurer_name:
                return None
                
            name = policy_details.insurer_name.strip()
            if not name:
                return None
                
            # If we already assigned a letter to this insurer, reuse it
            for letter, info in insurers.items():
                if info['name'].lower() == name.lower():
                    return letter
                    
            # Assign new letter if available
            if current_letter_idx < len(target_letters):
                letter = target_letters[current_letter_idx]
                insurers[letter] = {
                    'name': name,
                    'naic': getattr(policy_details, 'naic_code', '') or ''
                }
                current_letter_idx += 1
                return letter
            return None

        auto_letter = assign_insurer(auto_policy)
        gl_letter = assign_insurer(gl_policy)
        umb_letter = assign_insurer(umb_policy)
        wc_letter = assign_insurer(wc_policy)
        
        # Inject the dynamically assigned insurers into the PDF fields
        def add_field(field_name: str, val: str):
            if val is not None and val != "":
                acord_fields[field_name] = str(val)

        for letter, info in insurers.items():
            add_field(f"F[0].P1[0].Insurer_FullName_{letter}[0]", info['name'])
            add_field(f"F[0].P1[0].Insurer_NAICCode_{letter}[0]", info['naic'])

        if gl_letter:
            add_field("F[0].P1[0].GeneralLiability_InsurerLetterCode_A[0]", gl_letter)
        if auto_letter:
            add_field("F[0].P1[0].Vehicle_InsurerLetterCode_A[0]", auto_letter)
        if umb_letter:
            add_field("F[0].P1[0].ExcessUmbrella_InsurerLetterCode_A[0]", umb_letter)
        if wc_letter:
            add_field("F[0].P1[0].WorkersCompensationEmployersLiability_InsurerLetterCode_A[0]", wc_letter)
        
        # 5. Check missing/non-compliant gaps
        print("Running Reviewer...")
        review = run_reviewer(demands, auto_policy, gl_policy, umb_policy, wc_policy, acord_fields, client_settings)
        
        # 6. Fill PDF if passed (or we can always fill what we can and return it regardless)
        pdf_base64 = None
        template_path = os.path.join(os.path.dirname(__file__), "templates", "ACORD 25 COI.pdf")
        
        if os.path.exists(template_path):
            temp_output_path = os.path.join(temp_dir, f"coi_output_{datetime.now().timestamp()}.pdf")
            fill_acord_25(template_path, temp_output_path, acord_fields)
            
            with open(temp_output_path, "rb") as f:
                pdf_bytes = f.read()
                pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
                
            # Cleanup output pdf
            os.remove(temp_output_path)
        else:
            print("Template not found, unable to generate PDF.")
            
        # Cleanup gemini file
        client.files.delete(name=req_file.name)

        return JSONResponse(
            status_code=200,
            content={
                "demands": demands.model_dump(),
                "status": "PASSED" if review.passed else "FAILED",
                "policy_reviews": [p.model_dump() for p in review.policy_reviews],
                "pdf_base64": pdf_base64 # Return the PDF natively
            }
        )

    except Exception as e:
        print(f"Error processing COI: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup uploaded local file
        if os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)

def map_preview_fields(demands, auto, gl, umb, wc, settings) -> dict:
    fields = {}
    
    # Demands (Cert Holder and Desc of Operations)
    if demands:
        fields["F[0].P1[0].CertificateHolder_FullName_A[0]"] = demands.certificate_holder_name or ""
        fields["F[0].P1[0].CertificateOfLiabilityInsurance_ACORDForm_RemarkText_A[0]"] = demands.description_of_operations or ""
        address = demands.certificate_holder_address or ""
        if address:
            addr_parts = address.split('\n')
            fields["F[0].P1[0].CertificateHolder_MailingAddress_LineOne_A[0]"] = addr_parts[0]
            if len(addr_parts) > 1:
                fields["F[0].P1[0].CertificateHolder_MailingAddress_CityName_A[0]"] = ", ".join(addr_parts[1:])
    
    # Basic Client and Broker Info
    from datetime import datetime
    fields["F[0].P1[0].Form_CompletionDate_A[0]"] = datetime.now().strftime("%m/%d/%Y")
    
    fields["F[0].P1[0].NamedInsured_FullName_A[0]"] = settings.clientName or ""
    fields["F[0].P1[0].NamedInsured_MailingAddress_LineOne_A[0]"] = settings.clientAddress or ""
    fields["F[0].P1[0].NamedInsured_MailingAddress_CityName_A[0]"] = settings.clientCity or ""
    fields["F[0].P1[0].NamedInsured_MailingAddress_StateOrProvinceCode_A[0]"] = settings.clientState or ""
    fields["F[0].P1[0].NamedInsured_MailingAddress_PostalCode_A[0]"] = settings.clientZip or ""

    fields["F[0].P1[0].Producer_FullName_A[0]"] = settings.brokerName or ""
    fields["F[0].P1[0].Producer_MailingAddress_LineOne_A[0]"] = settings.brokerAddress or ""
    fields["F[0].P1[0].Producer_MailingAddress_CityName_A[0]"] = settings.brokerCity or ""
    fields["F[0].P1[0].Producer_MailingAddress_StateOrProvinceCode_A[0]"] = settings.brokerState or ""
    fields["F[0].P1[0].Producer_MailingAddress_PostalCode_A[0]"] = settings.brokerZip or ""
    fields["F[0].P1[0].Producer_ContactPerson_PhoneNumber_A[0]"] = settings.brokerPhone or ""
    fields["F[0].P1[0].Producer_FaxNumber_A[0]"] = settings.brokerFax or ""
    fields["F[0].P1[0].Producer_ContactPerson_FullName_A[0]"] = settings.brokerContactName or ""
    fields["F[0].P1[0].Producer_ContactPerson_EmailAddress_A[0]"] = settings.brokerContactEmail or ""
    
    # Auto
    if settings.managedAuto and auto:
        fields["F[0].P1[0].Vehicle_CombinedSingleLimit_EachAccidentAmount_A[0]"] = str(auto.combined_single_limit or "")
        fields["F[0].P1[0].Vehicle_BodilyInjury_PerPersonLimitAmount_A[0]"] = str(auto.bodily_injury_per_person or "")
        fields["F[0].P1[0].Vehicle_BodilyInjury_PerAccidentLimitAmount_A[0]"] = str(auto.bodily_injury_per_accident or "")
        fields["F[0].P1[0].Vehicle_PropertyDamage_PerAccidentLimitAmount_A[0]"] = str(auto.property_damage_per_accident or "")
        if getattr(auto, "covers_any_auto", False): fields["F[0].P1[0].Vehicle_AnyAutoIndicator_A[0]"] = "/1"
        if getattr(auto, "covers_all_owned_autos", False): fields["F[0].P1[0].Vehicle_AllOwnedAutosIndicator_A[0]"] = "/1"
        if getattr(auto, "covers_scheduled_autos", False): fields["F[0].P1[0].Vehicle_ScheduledAutosIndicator_A[0]"] = "/1"
        if getattr(auto, "covers_hired_autos", False): fields["F[0].P1[0].Vehicle_HiredAutosIndicator_A[0]"] = "/1"
        if getattr(auto, "covers_non_owned_autos", False): fields["F[0].P1[0].Vehicle_NonOwnedAutosIndicator_A[0]"] = "/1"
        
        if getattr(auto, "has_additional_insured", False): fields["F[0].P1[0].CertificateOfInsurance_AutomobileLiability_AdditionalInsuredCode_A[0]"] = "X"
        if getattr(auto, "has_waiver_of_subrogation", False): fields["F[0].P1[0].Policy_AutomobileLiability_SubrogationWaivedCode_A[0]"] = "X"

        fields["F[0].P1[0].Policy_AutomobileLiability_PolicyNumberIdentifier_A[0]"] = str(auto.policy_number or "")
        fields["F[0].P1[0].Policy_AutomobileLiability_EffectiveDate_A[0]"] = str(auto.effective_date or "")
        fields["F[0].P1[0].Policy_AutomobileLiability_ExpirationDate_A[0]"] = str(auto.expiration_date or "")

    # GL
    if settings.managedGL and gl:
        fields["F[0].P1[0].GeneralLiability_CoverageIndicator_A[0]"] = "/1"
        fields["F[0].P1[0].GeneralLiability_EachOccurrence_LimitAmount_A[0]"] = str(gl.each_occurrence or "")
        fields["F[0].P1[0].GeneralLiability_FireDamageRentedPremises_EachOccurrenceLimitAmount_A[0]"] = str(gl.damage_to_rented_premises or "")
        fields["F[0].P1[0].GeneralLiability_MedicalExpense_EachPersonLimitAmount_A[0]"] = str(gl.med_exp or "")
        fields["F[0].P1[0].GeneralLiability_PersonalAndAdvertisingInjury_LimitAmount_A[0]"] = str(gl.personal_and_adv_injury or "")
        fields["F[0].P1[0].GeneralLiability_GeneralAggregate_LimitAmount_A[0]"] = str(gl.general_aggregate or "")
        fields["F[0].P1[0].GeneralLiability_ProductsAndCompletedOperations_AggregateLimitAmount_A[0]"] = str(gl.products_comp_op_agg or "")
        if getattr(gl, "is_occurrence", False): fields["F[0].P1[0].GeneralLiability_OccurrenceIndicator_A[0]"] = "/1"
        if getattr(gl, "is_claims_made", False): fields["F[0].P1[0].GeneralLiability_ClaimsMadeIndicator_A[0]"] = "/1"
        
        if getattr(gl, "has_additional_insured", False): fields["F[0].P1[0].CertificateOfInsurance_GeneralLiability_AdditionalInsuredCode_A[0]"] = "X"
        if getattr(gl, "has_waiver_of_subrogation", False): fields["F[0].P1[0].Policy_GeneralLiability_SubrogationWaivedCode_A[0]"] = "X"

        fields["F[0].P1[0].Policy_GeneralLiability_PolicyNumberIdentifier_A[0]"] = str(gl.policy_number or "")
        fields["F[0].P1[0].Policy_GeneralLiability_EffectiveDate_A[0]"] = str(gl.effective_date or "")
        fields["F[0].P1[0].Policy_GeneralLiability_ExpirationDate_A[0]"] = str(gl.expiration_date or "")
        
    # Umbrella
    if settings.managedUmb and umb:
        fields["F[0].P1[0].ExcessUmbrella_Umbrella_EachOccurrenceAmount_A[0]"] = str(umb.each_occurrence or "")
        fields["F[0].P1[0].ExcessUmbrella_Umbrella_AggregateAmount_A[0]"] = str(umb.aggregate or "")
        fields["F[0].P1[0].ExcessUmbrella_Umbrella_DeductibleOrRetentionAmount_A[0]"] = str(umb.retention or "")
        if umb.is_umbrella: fields["F[0].P1[0].Policy_PolicyType_UmbrellaIndicator_A[0]"] = "/1"
        if umb.is_excess: fields["F[0].P1[0].Policy_PolicyType_ExcessIndicator_A[0]"] = "/1"
        if umb.is_occurrence: fields["F[0].P1[0].ExcessUmbrella_OccurrenceIndicator_A[0]"] = "/1"
        if umb.is_claims_made: fields["F[0].P1[0].ExcessUmbrella_ClaimsMadeIndicator_A[0]"] = "/1"
        fields["F[0].P1[0].Policy_ExcessLiability_PolicyNumberIdentifier_A[0]"] = str(umb.policy_number or "")
        fields["F[0].P1[0].Policy_ExcessLiability_EffectiveDate_A[0]"] = str(umb.effective_date or "")
        fields["F[0].P1[0].Policy_ExcessLiability_ExpirationDate_A[0]"] = str(umb.expiration_date or "")

    # WC
    if settings.managedWC and wc:
        fields["F[0].P1[0].WorkersCompensationEmployersLiability_EmployersLiability_EachAccidentLimitAmount_A[0]"] = str(wc.el_each_accident or "")
        fields["F[0].P1[0].WorkersCompensationEmployersLiability_EmployersLiability_DiseaseEachEmployeeLimitAmount_A[0]"] = str(wc.el_disease_ea_employee or "")
        fields["F[0].P1[0].WorkersCompensationEmployersLiability_EmployersLiability_DiseasePolicyLimitAmount_A[0]"] = str(wc.el_disease_policy_limit or "")
        
        if getattr(wc, "proprietor_excluded", None) is True:
            fields["F[0].P1[0].WorkersCompensationEmployersLiability_AnyPersonsExcludedIndicator_A[0]"] = "Y"
        elif getattr(wc, "proprietor_excluded", None) is False:
            fields["F[0].P1[0].WorkersCompensationEmployersLiability_AnyPersonsExcludedIndicator_A[0]"] = "N"
            
        if getattr(wc, "has_waiver_of_subrogation", False): 
            fields["F[0].P1[0].Policy_WorkersCompensation_SubrogationWaivedCode_A[0]"] = "X"
            
        fields["F[0].P1[0].Policy_WorkersCompensationAndEmployersLiability_PolicyNumberIdentifier_A[0]"] = str(wc.policy_number or "")
        fields["F[0].P1[0].Policy_WorkersCompensationAndEmployersLiability_EffectiveDate_A[0]"] = str(wc.effective_date or "")
        fields["F[0].P1[0].Policy_WorkersCompensationAndEmployersLiability_ExpirationDate_A[0]"] = str(wc.expiration_date or "")
        fields["F[0].P1[0].WorkersCompensationEmployersLiability_WorkersCompensationStatutoryLimitIndicator_A[0]"] = "/1" # Defaults to true if managed

    # --- explicitly clear all unsupported fields to guarantee 100% coverage ---
    fields["F[0].P1[0].CertificateOfInsurance_CertificateNumberIdentifier_A[0]"] = ""
    fields["F[0].P1[0].CertificateOfInsurance_RevisionNumberIdentifier_A[0]"] = ""
    
    fields["F[0].P1[0].NamedInsured_MailingAddress_LineTwo_A[0]"] = ""
    fields["F[0].P1[0].Producer_MailingAddress_LineTwo_A[0]"] = ""
    fields["F[0].P1[0].Producer_AuthorizedRepresentative_Signature_A[0]"] = ""
    
    fields["F[0].P1[0].GeneralLiability_GeneralAggregate_LimitAppliesPerLocationIndicator_A[0]"] = ""
    fields["F[0].P1[0].GeneralLiability_GeneralAggregate_LimitAppliesPerPolicyIndicator_A[0]"] = ""
    fields["F[0].P1[0].GeneralLiability_GeneralAggregate_LimitAppliesPerProjectIndicator_A[0]"] = ""
    fields["F[0].P1[0].GeneralLiability_GeneralAggregate_LimitAppliesToCode_A[0]"] = ""
    fields["F[0].P1[0].GeneralLiability_GeneralAggregate_LimitAppliesToOtherIndicator_A[0]"] = ""
    
    fields["F[0].P1[0].GeneralLiability_OtherCoverageDescription_A[0]"] = ""
    fields["F[0].P1[0].GeneralLiability_OtherCoverageDescription_B[0]"] = ""
    fields["F[0].P1[0].GeneralLiability_OtherCoverageIndicator_A[0]"] = ""
    fields["F[0].P1[0].GeneralLiability_OtherCoverageIndicator_B[0]"] = ""
    fields["F[0].P1[0].GeneralLiability_OtherCoverageLimitAmount_A[0]"] = ""
    fields["F[0].P1[0].GeneralLiability_OtherCoverageLimitDescription_A[0]"] = ""
    
    fields["F[0].P1[0].Vehicle_OtherCoverage_CoverageDescription_A[0]"] = ""
    fields["F[0].P1[0].Vehicle_OtherCoverage_LimitAmount_A[0]"] = ""
    fields["F[0].P1[0].Vehicle_OtherCoveredAutoDescription_A[0]"] = ""
    fields["F[0].P1[0].Vehicle_OtherCoveredAutoDescription_B[0]"] = ""
    fields["F[0].P1[0].Vehicle_OtherCoveredAutoIndicator_A[0]"] = ""
    fields["F[0].P1[0].Vehicle_OtherCoveredAutoIndicator_B[0]"] = ""

    fields["F[0].P1[0].ExcessUmbrella_DeductibleIndicator_A[0]"] = ""
    fields["F[0].P1[0].ExcessUmbrella_RetentionIndicator_A[0]"] = ""
    fields["F[0].P1[0].ExcessUmbrella_OtherCoverageDescription_A[0]"] = ""
    fields["F[0].P1[0].ExcessUmbrella_OtherCoverageLimitAmount_A[0]"] = ""
    fields["F[0].P1[0].CertificateOfInsurance_ExcessLiability_AdditionalInsuredCode_A[0]"] = ""
    fields["F[0].P1[0].Policy_ExcessLiability_SubrogationWaivedCode_A[0]"] = ""

    fields["F[0].P1[0].WorkersCompensationEmployersLiability_OtherCoverageDescription_A[0]"] = ""
    fields["F[0].P1[0].WorkersCompensationEmployersLiability_OtherCoverageIndicator_A[0]"] = ""
    
    fields["F[0].P1[0].OtherPolicy_CoverageCode_A[0]"] = ""
    fields["F[0].P1[0].OtherPolicy_CoverageCode_B[0]"] = ""
    fields["F[0].P1[0].OtherPolicy_CoverageCode_C[0]"] = ""
    fields["F[0].P1[0].OtherPolicy_CoverageLimitAmount_A[0]"] = ""
    fields["F[0].P1[0].OtherPolicy_CoverageLimitAmount_B[0]"] = ""
    fields["F[0].P1[0].OtherPolicy_CoverageLimitAmount_C[0]"] = ""
    fields["F[0].P1[0].OtherPolicy_InsurerLetterCode_A[0]"] = ""
    fields["F[0].P1[0].OtherPolicy_OtherPolicyDescription_A[0]"] = ""
    fields["F[0].P1[0].OtherPolicy_PolicyEffectiveDate_A[0]"] = ""
    fields["F[0].P1[0].OtherPolicy_PolicyExpirationDate_A[0]"] = ""
    fields["F[0].P1[0].OtherPolicy_PolicyNumberIdentifier_A[0]"] = ""
    fields["F[0].P1[0].OtherPolicy_SubrogationWaivedCode_A[0]"] = ""
    fields["F[0].P1[0].CertificateOfInsurance_OtherPolicy_AdditionalInsuredCode_A[0]"] = ""

    return fields

@app.post("/generate-coi-manual")
async def generate_coi_manual(
    certificate_holder_name: str = Form(...),
    description_of_operations: str = Form(""),
    policies_json: str = Form(...),
    client_settings_json: str = Form(...)
):
    print(f"Received request to manually generate COI for {certificate_holder_name}.")
    
    try:
        policy_data = json.loads(policies_json)
        client_settings_data = json.loads(client_settings_json)
        
        client_settings = ClientSettings(**client_settings_data)
        auto_policy = AutoPolicyDetails(**policy_data.get("auto", {}))
        gl_policy = GLPolicyDetails(**policy_data.get("gl", {}))
        umb_policy = UmbrellaPolicyDetails(**policy_data.get("umbrella", {}))
        wc_policy = WCPolicyDetails(**policy_data.get("wc", {}))
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid policies_json format: {str(e)}")

    # 1.5 Parse Client Settings
    try:
        settings_data = json.loads(client_settings_json)
        client_settings = ClientSettings(**settings_data)
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid client_settings_json format: {str(e)}")

    try:
        # Create minimal demands object for the manual inputs
        demands = RequestDemands(
            certificate_holder_name=certificate_holder_name if certificate_holder_name != "PREVIEW BLANK" else "",
            description_of_operations=description_of_operations,
            # Everything else is None/False since this is manual
        )
        
        # 4. Map ACORD Fields
        print("Using deterministic python mapper for Manual COI...")
        acord_fields = map_preview_fields(demands, auto_policy, gl_policy, umb_policy, wc_policy, client_settings)
        
        # --- DYNAMIC INSURER LETTER ASSIGNMENT ---
        insurers = {}
        target_letters = ['A', 'B', 'C', 'D', 'E', 'F']
        current_letter_idx = 0
        
        def assign_insurer(policy_details):
            nonlocal current_letter_idx
            if not policy_details or not policy_details.insurer_name:
                return None
                
            name = policy_details.insurer_name.strip()
            if not name:
                return None
                
            for letter, info in insurers.items():
                if info['name'].lower() == name.lower():
                    return letter
                    
            if current_letter_idx < len(target_letters):
                letter = target_letters[current_letter_idx]
                insurers[letter] = {
                    'name': name,
                    'naic': getattr(policy_details, 'naic_code', '') or ''
                }
                current_letter_idx += 1
                return letter
            return None

        auto_letter = assign_insurer(auto_policy)
        gl_letter = assign_insurer(gl_policy)
        umb_letter = assign_insurer(umb_policy)
        wc_letter = assign_insurer(wc_policy)
        
        def add_field(field_name: str, val: str):
            if val is not None and val != "":
                acord_fields[field_name] = str(val)

        for letter, info in insurers.items():
            add_field(f"F[0].P1[0].Insurer_FullName_{letter}[0]", info['name'])
            add_field(f"F[0].P1[0].Insurer_NAICCode_{letter}[0]", info['naic'])

        if gl_letter:
            add_field("F[0].P1[0].GeneralLiability_InsurerLetterCode_A[0]", gl_letter)
        if auto_letter:
            add_field("F[0].P1[0].Vehicle_InsurerLetterCode_A[0]", auto_letter)
        if umb_letter:
            add_field("F[0].P1[0].ExcessUmbrella_InsurerLetterCode_A[0]", umb_letter)
        if wc_letter:
            add_field("F[0].P1[0].WorkersCompensationEmployersLiability_InsurerLetterCode_A[0]", wc_letter)
            
        # 5. Skip Reviewer. Manual generation assumes PASSED because it just outputs whatever they have.
        print("Skipping Reviewer for Manual Generation...")
        
        # 6. Fill PDF
        pdf_base64 = None
        template_path = os.path.join("templates", "ACORD 25 COI.pdf")
        
        if os.path.exists(template_path):
            temp_dir = tempfile.gettempdir()
            temp_output_path = os.path.join(temp_dir, f"coi_output_{datetime.now().timestamp()}.pdf")
            fill_acord_25(template_path, temp_output_path, acord_fields)
            
            with open(temp_output_path, "rb") as f:
                pdf_bytes = f.read()
                pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
                
            os.remove(temp_output_path)
        else:
            print("Template not found, unable to generate PDF.")

        return JSONResponse(
            status_code=200,
            content={
                "demands": demands.model_dump(),
                "status": "PASSED", # Always PASSED for manual
                "policy_reviews": [], # No reviews needed
                "pdf_base64": pdf_base64
            }
        )
        
    except Exception as e:
        print(f"Error processing Manual COI: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
