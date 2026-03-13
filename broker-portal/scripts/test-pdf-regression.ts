import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const prisma = new PrismaClient();
const brokerId = 'TEST_BROKER_REGRESSION';
const clientId = 'TEST_CLIENT_1';

async function setupClient(allTrue: boolean) {
    console.log(`\n--- Setting up TEST_CLIENT_1 (allTrue: ${allTrue}) ---`);
    
    await prisma.$executeRawUnsafe(`
        INSERT INTO "Broker" (id, name, "ingestionDomain", "brokerAdminIds", "addressLine1", "city", "state", "postalCode", "phoneNumber", "updatedAt")
        VALUES ('TEST_BROKER_REGRESSION', 'Regression Test Broker LLC', 'regression.test', '', '100 Regression Way', 'Testville', 'TX', '75001', '555-0199', NOW())
        ON CONFLICT (id) DO UPDATE SET 
            "addressLine1" = '100 Regression Way',
            "updatedAt" = NOW();
    `);

    await prisma.$executeRawUnsafe(`
        INSERT INTO "Client" (id, name, "brokerId", "authorizedDomains", "addressLine1", "city", "state", "postalCode", "updatedAt")
        VALUES ('TEST_CLIENT_1', 'Test Client 1 Corporation', 'TEST_BROKER_REGRESSION', 'test.com', '200 Client Street', 'Clientburg', 'CA', '90210', NOW())
        ON CONFLICT (id) DO UPDATE SET 
            "addressLine1" = '200 Client Street',
            "updatedAt" = NOW();
    `);

    // Clean out old policies
    await prisma.policy.deleteMany({ where: { clientId } });

    const createPolicyPayload = (type: string, fields: any) => ({
        clientId,
        fileType: type,
        filename: `regression_${type}.pdf`,
        expirationDate: fields.expiration_date ? new Date(fields.expiration_date) : new Date(),
        gcsUri: `gs://test/${type.toLowerCase()}.pdf`,
        acord_fields_json: JSON.stringify(fields),
        uploadedAt: new Date(),
    });

    const autoFields = {
        insurer_name: "Auto Insurer Corp",
        naic_code: "11111",
        combined_single_limit: "1000000",
        bodily_injury_per_person: "250000",
        bodily_injury_per_accident: "500000",
        property_damage_per_accident: "100000",
        covers_any_auto: allTrue,
        covers_all_owned_autos: allTrue,
        covers_scheduled_autos: allTrue,
        covers_hired_autos: allTrue,
        covers_non_owned_autos: allTrue,
        has_additional_insured: allTrue,
        has_waiver_of_subrogation: allTrue,
        policy_number: "AUTO-9999",
        effective_date: "01/01/2026",
        expiration_date: "01/01/2027"
    };

    const glFields = {
        insurer_name: "GL Insurer LLC",
        naic_code: "22222",
        each_occurrence: "2000000",
        damage_to_rented_premises: "300000",
        med_exp: "15000",
        personal_and_adv_injury: "2000000",
        general_aggregate: "4000000",
        products_comp_op_agg: "4000000",
        is_occurrence: allTrue,
        is_claims_made: !allTrue, // Inverse
        has_additional_insured: allTrue,
        has_waiver_of_subrogation: allTrue,
        policy_number: "GL-8888",
        effective_date: "02/01/2026",
        expiration_date: "02/01/2027"
    };

    const umbFields = {
        insurer_name: "Umbrella Insurer Inc",
        naic_code: "33333",
        each_occurrence: "5000000",
        aggregate: "5000000",
        retention: "10000",
        is_umbrella: allTrue,
        is_excess: !allTrue, // Inverse
        is_occurrence: allTrue,
        is_claims_made: !allTrue, // Inverse
        policy_number: "UMB-7777",
        effective_date: "03/01/2026",
        expiration_date: "03/01/2027"
    };

    const wcFields = {
        insurer_name: "WC Insurer Co",
        naic_code: "44444",
        el_each_accident: "1000000",
        el_disease_ea_employee: "1000000",
        el_disease_policy_limit: "1000000",
        proprietor_excluded: allTrue,
        has_waiver_of_subrogation: allTrue,
        policy_number: "WC-6666",
        effective_date: "04/01/2026",
        expiration_date: "04/01/2027"
    };

    await prisma.policy.create({ data: createPolicyPayload("AUTO", autoFields) });
    await prisma.policy.create({ data: createPolicyPayload("GL", glFields) });
    await prisma.policy.create({ data: createPolicyPayload("UMBRELLA", umbFields) });
    await prisma.policy.create({ data: createPolicyPayload("WC", wcFields) });

    const expected = {
        "F[0].P1[0].CertificateHolder_FullName_A[0]": "Regression Certificate Holder",
        "F[0].P1[0].CertificateOfLiabilityInsurance_ACORDForm_RemarkText_A[0]": "Regression Description Of Operations block text.",
        "F[0].P1[0].NamedInsured_FullName_A[0]": "Test Client 1 Corporation",
        "F[0].P1[0].NamedInsured_MailingAddress_LineOne_A[0]": "200 Client Street",
        "F[0].P1[0].NamedInsured_MailingAddress_CityName_A[0]": "Clientburg",
        "F[0].P1[0].NamedInsured_MailingAddress_StateOrProvinceCode_A[0]": "CA",
        "F[0].P1[0].NamedInsured_MailingAddress_PostalCode_A[0]": "90210",
        
        "F[0].P1[0].Vehicle_AnyAutoIndicator_A[0]": allTrue ? "/1" : "",
        "F[0].P1[0].Vehicle_AllOwnedAutosIndicator_A[0]": allTrue ? "/1" : "",
        "F[0].P1[0].Vehicle_ScheduledAutosIndicator_A[0]": allTrue ? "/1" : "",
        "F[0].P1[0].Vehicle_HiredAutosIndicator_A[0]": allTrue ? "/1" : "",
        "F[0].P1[0].Vehicle_NonOwnedAutosIndicator_A[0]": allTrue ? "/1" : "",
        "F[0].P1[0].CertificateOfInsurance_AutomobileLiability_AdditionalInsuredCode_A[0]": "",
        "F[0].P1[0].Policy_AutomobileLiability_SubrogationWaivedCode_A[0]": "",
        
        "F[0].P1[0].GeneralLiability_OccurrenceIndicator_A[0]": allTrue ? "/1" : "",
        "F[0].P1[0].GeneralLiability_ClaimsMadeIndicator_A[0]": !allTrue ? "/1" : "",
        "F[0].P1[0].CertificateOfInsurance_GeneralLiability_AdditionalInsuredCode_A[0]": allTrue ? "X" : "",
        "F[0].P1[0].Policy_GeneralLiability_SubrogationWaivedCode_A[0]": allTrue ? "X" : "",
        
        "F[0].P1[0].Policy_PolicyType_UmbrellaIndicator_A[0]": allTrue ? "/1" : "",
        "F[0].P1[0].Policy_PolicyType_ExcessIndicator_A[0]": !allTrue ? "/1" : "",
        "F[0].P1[0].ExcessUmbrella_OccurrenceIndicator_A[0]": allTrue ? "/1" : "",
        "F[0].P1[0].ExcessUmbrella_ClaimsMadeIndicator_A[0]": !allTrue ? "/1" : "",
        
        "F[0].P1[0].WorkersCompensationEmployersLiability_AnyPersonsExcludedIndicator_A[0]": allTrue ? "Y" : "N",
        "F[0].P1[0].Policy_WorkersCompensation_SubrogationWaivedCode_A[0]": allTrue ? "X" : ""
    };

    return { expected, autoFields, glFields, umbFields, wcFields };
}

async function runPass(passName: string, allTrue: boolean) {
    const { expected, autoFields, glFields, umbFields, wcFields } = await setupClient(allTrue);
    
    // Write expectations to disk
    const expectedJsonPath = path.join(__dirname, `expected_${passName}.json`);
    fs.writeFileSync(expectedJsonPath, JSON.stringify(expected, null, 2));

    const apiUrl = `http://127.0.0.1:8001/generate-coi-manual`;
    const formData = new FormData();
    formData.append("certificate_holder_name", "Regression Certificate Holder");
    formData.append("description_of_operations", "Regression Description Of Operations block text.");

    // Manually pass what Next.js would normally map
    const policyDataPayload = {
        auto: autoFields,
        gl: glFields,
        umbrella: umbFields,
        wc: wcFields
    };
    formData.append("policies_json", JSON.stringify(policyDataPayload));

    const clientSettingsPayload = {
        managedAuto: true,
        managedGL: true,
        managedUmb: true,
        managedWC: true,
        clientName: "Test Client 1 Corporation",
        clientAddress: "200 Client Street",
        clientCity: "Clientburg",
        clientState: "CA",
        clientZip: "90210",
        brokerName: "Regression Test Broker LLC",
        brokerAddress: "100 Regression Way",
        brokerCity: "Testville",
        brokerState: "TX",
        brokerZip: "75001",
        brokerPhone: "555-0199"
    };
    formData.append("client_settings_json", JSON.stringify(clientSettingsPayload));

    console.log(`Sending direct payload to FastAPI ${apiUrl}...`);
    const res = await fetch(apiUrl, { method: "POST", body: formData as any });
    if (!res.ok) {
        throw new Error(`FastAPI call failed: ${res.status} ${await res.text()}`);
    }

    const payload = await res.json();
    console.log(`Received FastAPI Payload Keys: ${Object.keys(payload)}`);
    if (payload.pdf_base64 === null) {
        throw new Error("FastAPI returned pdf_base64 as null! Template path resolution failed.");
    }

    const { pdf_base64 } = payload;
    if (!pdf_base64) {
        console.error("Payload:", payload);
        throw new Error("FastAPI returned no pdf_base64!");
    }

    const outputPdfPath = path.join(__dirname, `regression_output_${passName}.pdf`);
    fs.writeFileSync(outputPdfPath, Buffer.from(pdf_base64, "base64"));
    console.log(`Saved PDF: ${outputPdfPath}`);

    const pythonScriptPath = path.resolve(__dirname, "../../acord/verify_regression.py");
    const defaultPythonExe = process.platform === 'win32'
        ? path.resolve(__dirname, "../../acord/venv/Scripts/python.exe")
        : path.resolve(__dirname, "../../acord/venv/bin/python");
        
    const pythonExePath = process.env.PYTHON_BIN || defaultPythonExe;
    try {
        const output = execSync(`"${pythonExePath}" "${pythonScriptPath}" "${outputPdfPath}" "${expectedJsonPath}"`, { encoding: 'utf-8' });
        console.log(output);
    } catch (e: any) {
        console.error(`❌ Python Verification Failed for pass '${passName}':\n`, (e.stderr && e.stderr.toString()) || e.message);
        process.exit(1);
    }
}

async function main() {
    console.log("Starting Multi-pass PDF Generation Regression Test...");
    await runPass("ALL_TRUE_FLAGS", true);
    await runPass("ALL_FALSE_FLAGS", false);
    console.log("\n✅ ALL REGRESSION TESTS PASSED SUCCESSFULLY!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
