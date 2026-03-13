# ACORD 25 Data Extraction Schemas

This document defines the exact data fields our Artificial Intelligence system explicitly extracts from raw insurance policy PDFs. These specific fields are structured and stored to perfectly populate the **ACORD 25 (Certificate of Liability Insurance)** forms automatically. 

Please review these lists to ensure no critical ACORD 25 mapping fields are missing for each policy type.

---

### Commercial Auto Liability (`AUTO`)
These fields are extracted to fill the "AUTOMOBILE LIABILITY" section of the ACORD 25 form.

* **Carrier Name** (`insurer_name`)
* **Policy Number** (`policy_number`)
* **Policy Effective Date** (`effective_date`)
* **Policy Expiration Date** (`expiration_date`)
* **Combined Single Limit** (`combined_single_limit`)
* **Bodily Injury (Per Person)** (`bodily_injury_per_person`)
* **Bodily Injury (Per Accident)** (`bodily_injury_per_accident`)
* **Property Damage (Per Accident)** (`property_damage_per_accident`)
* **Any Auto** (`covers_any_auto`) - *Boolean Checkbox*
* **All Owned Autos** (`covers_all_owned_autos`) - *Boolean Checkbox*
* **Scheduled Autos** (`covers_scheduled_autos`) - *Boolean Checkbox*
* **Hired Autos** (`covers_hired_autos`) - *Boolean Checkbox*
* **Non-Owned Autos** (`covers_non_owned_autos`) - *Boolean Checkbox*

---

### Commercial General Liability (`GL`)
These fields are extracted to fill the "COMMERCIAL GENERAL LIABILITY" section of the ACORD 25 form.

* **Carrier Name** (`insurer_name`)
* **Policy Number** (`policy_number`)
* **Policy Effective Date** (`effective_date`)
* **Policy Expiration Date** (`expiration_date`)
* **Claims-Made vs. Occurrence**
  * Applies per occurrence? (`is_occurrence`) - *Boolean Checkbox*
  * Applies per claim? (`is_claims_made`) - *Boolean Checkbox*
* **Policy Limits**
  * Each Occurrence (`each_occurrence`)
  * Damage to Rented Premises (`damage_to_rented_premises`)
  * Medical Expenses (`med_exp`)
  * Personal & Adv Injury (`personal_and_adv_injury`)
  * General Aggregate (`general_aggregate`)
  * Products - Comp/Op Agg (`products_comp_op_agg`)
* **Special Endorsements**
  * Additional Insured Included? (`has_additional_insured`) - *Boolean Checkbox*
  * Waiver of Subrogation Included? (`has_waiver_of_subrogation`) - *Boolean Checkbox*

---

### Workers Compensation & Employers' Liability (`WC`)
These fields are extracted to fill the "WORKERS COMPENSATION AND EMPLOYERS' LIABILITY" section of the ACORD 25 form.

* **Carrier Name** (`insurer_name`)
* **Policy Number** (`policy_number`)
* **Policy Effective Date** (`effective_date`)
* **Policy Expiration Date** (`expiration_date`)
* **Proprietor / Partner / Executive Officer Excluded?** (`proprietor_excluded`) - *Boolean (Y/N box)*
* **Employers' Liability Limits**
  * E.L. Each Accident (`el_each_accident`)
  * E.L. Disease - Each Employee (`el_disease_ea_employee`)
  * E.L. Disease - Policy Limit (`el_disease_policy_limit`)
* **Special Endorsements**
  * Waiver of Subrogation Included? (`has_waiver_of_subrogation`) - *Boolean Checkbox*

---

### Umbrella / Excess Liability (`UMBRELLA`)
These fields are extracted to fill the "UMBRELLA LIAB / EXCESS LIAB" section of the ACORD 25 form.

* **Carrier Name** (`insurer_name`)
* **Policy Number** (`policy_number`)
* **Policy Effective Date** (`effective_date`)
* **Policy Expiration Date** (`expiration_date`)
* **Policy Type**
  * Is Umbrella? (`is_umbrella`) - *Boolean Checkbox*
  * Is Excess Liability? (`is_excess`) - *Boolean Checkbox*
* **Claims-Made vs. Occurrence**
  * Applies per occurrence? (`is_occurrence`) - *Boolean Checkbox*
  * Applies per claim? (`is_claims_made`) - *Boolean Checkbox*
* **Policy Limits**
  * Each Occurrence (`each_occurrence`)
  * Aggregate (`aggregate`)
* **Retention** (`retention`)
