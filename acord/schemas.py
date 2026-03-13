from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Union

# --- Request Reader Schemas ---
class RequestDemands(BaseModel):
    certificate_holder_name: Optional[str] = Field(None, description="Name of the Certificate Holder")
    certificate_holder_address: Optional[str] = Field(None, description="Address of the Certificate Holder")
    
    # General Liability Demands
    gl_each_occurrence: Optional[str] = Field(None, description="Requested General Liability Each Occurrence Limit")
    gl_general_aggregate: Optional[str] = Field(None, description="Requested General Liability Aggregate Limit")
    gl_additional_insured_required: Optional[bool] = Field(None, description="Is an Additional Insured endorsement demanded for GL?")
    gl_waiver_of_subrogation_required: Optional[bool] = Field(None, description="Is a Waiver of Subrogation demanded for GL?")
    
    # Auto Liability Demands
    auto_combined_single_limit: Optional[str] = Field(None, description="Requested Auto Combined Single Limit")
    auto_any_auto_required: Optional[bool] = Field(None, description="Is Any Auto coverage demanded?")
    
    # Umbrella/Excess Demands
    umbrella_each_occurrence: Optional[str] = Field(None, description="Requested Umbrella/Excess Each Occurrence Limit")
    
    # Workers Comp Demands
    wc_statutory_limits_required: Optional[bool] = Field(None, description="Are WC Statutory limits demanded?")
    wc_el_each_accident: Optional[str] = Field(None, description="Requested Employers Liability Each Accident limit")
    wc_waiver_of_subrogation_required: Optional[bool] = Field(None, description="Is a Waiver of Subrogation demanded for WC?")
    
    # Special instructions
    description_of_operations: Optional[str] = Field(None, description="Specific language demanded for the Description of Operations box")

# --- Policy Reader Schemas ---
class AutoPolicyDetails(BaseModel):
    insurer_name: Optional[str] = None
    naic_code: Optional[Union[str, int, float]] = None
    policy_number: Optional[Union[str, int, float]] = None
    effective_date: Optional[str] = None
    expiration_date: Optional[str] = None
    combined_single_limit: Optional[Union[str, int, float]] = None
    bodily_injury_per_person: Optional[Union[str, int, float]] = None
    bodily_injury_per_accident: Optional[Union[str, int, float]] = None
    property_damage_per_accident: Optional[Union[str, int, float]] = None
    covers_any_auto: Optional[bool] = None
    covers_all_owned_autos: Optional[bool] = None
    covers_scheduled_autos: Optional[bool] = None
    covers_hired_autos: Optional[bool] = None
    covers_non_owned_autos: Optional[bool] = None

class GLPolicyDetails(BaseModel):
    insurer_name: Optional[str] = None
    naic_code: Optional[Union[str, int, float]] = None
    policy_number: Optional[Union[str, int, float]] = None
    effective_date: Optional[str] = None
    expiration_date: Optional[str] = None
    is_occurrence: Optional[bool] = None
    is_claims_made: Optional[bool] = None
    each_occurrence: Optional[Union[str, int, float]] = None
    damage_to_rented_premises: Optional[Union[str, int, float]] = None
    med_exp: Optional[Union[str, int, float]] = None
    personal_and_adv_injury: Optional[Union[str, int, float]] = None
    general_aggregate: Optional[Union[str, int, float]] = None
    products_comp_op_agg: Optional[Union[str, int, float]] = None
    has_additional_insured: Optional[bool] = None
    has_waiver_of_subrogation: Optional[bool] = None

class UmbrellaPolicyDetails(BaseModel):
    insurer_name: Optional[str] = None
    naic_code: Optional[Union[str, int, float]] = None
    policy_number: Optional[Union[str, int, float]] = None
    effective_date: Optional[str] = None
    expiration_date: Optional[str] = None
    is_umbrella: Optional[bool] = None
    is_excess: Optional[bool] = None
    is_occurrence: Optional[bool] = None
    is_claims_made: Optional[bool] = None
    each_occurrence: Optional[Union[str, int, float]] = None
    aggregate: Optional[Union[str, int, float]] = None
    retention: Optional[Union[str, int, float]] = None

class WCPolicyDetails(BaseModel):
    insurer_name: Optional[str] = None
    naic_code: Optional[Union[str, int, float]] = None
    policy_number: Optional[Union[str, int, float]] = None
    effective_date: Optional[str] = None
    expiration_date: Optional[str] = None
    proprietor_excluded: Optional[bool] = None
    el_each_accident: Optional[Union[str, int, float]] = None
    el_disease_ea_employee: Optional[Union[str, int, float]] = None
    el_disease_policy_limit: Optional[Union[str, int, float]] = None
    has_waiver_of_subrogation: Optional[bool] = None

# --- Client Settings Schema ---
class ClientSettings(BaseModel):
    managedAuto: bool = True
    managedGL: bool = True
    managedUmb: bool = True
    managedWC: bool = True
    clientName: Optional[str] = None
    clientAddress: Optional[str] = None
    clientCity: Optional[str] = None
    clientState: Optional[str] = None
    clientZip: Optional[str] = None
    brokerName: Optional[str] = None
    brokerAddress: Optional[str] = None
    brokerCity: Optional[str] = None
    brokerState: Optional[str] = None
    brokerZip: Optional[str] = None
    brokerPhone: Optional[str] = None
    brokerFax: Optional[str] = None
    brokerContactName: Optional[str] = None
    brokerContactEmail: Optional[str] = None

# --- Completer Schema ---
class FieldMapping(BaseModel):
    acord_field_name: str = Field(description="The exact name of the ACORD 25 PDF form field")
    value: str = Field(description="The string value to place in that field")

class CompleterOutput(BaseModel):
    acord_fields: List[FieldMapping] = Field(description="A list of mappings for the ACORD 25 form fields.")

# --- Reviewer Schema ---
class PolicyReview(BaseModel):
    policy_type: str = Field(description="The name of the policy, e.g. 'General Liability'")
    status: str = Field(description="The status for this specific policy: 'PASSED', 'FAILED', or 'NEEDS REVIEW'")
    comments: List[str] = Field(description="A list of specific comments explaining any gaps or stating 'All demands met.'")

class ReviewerOutput(BaseModel):
    passed: bool = Field(description="True if all requested coverages are met, False otherwise.")
    gaps: List[str] = Field(description="A list of all missing coverages or shortcomings across all policies.")
    policy_reviews: List[PolicyReview] = Field(description="A structured list of feedback broken down per policy type.")
