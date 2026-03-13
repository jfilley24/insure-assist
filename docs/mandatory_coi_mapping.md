# ACORD 25 COI Mandatory Fields Mapping & Gap Analysis

This document maps the required fields for generating an ACORD 25 Certificate of Liability Insurance against our current database schema and AI extraction pipelines to identify missing data points.

## 1. Producer / Brokerage Information
The top left of the ACORD 25 form requires the Brokerage's details and a specific contact person.

**Required on ACORD 25:**
* `Producer_FullName_A`
* `Producer_MailingAddress_LineOne_A`
* `Producer_MailingAddress_LineTwo_A`
* `Producer_MailingAddress_CityName_A`
* `Producer_MailingAddress_StateOrProvinceCode_A`
* `Producer_MailingAddress_PostalCode_A`
* `Producer_ContactPerson_FullName_A`
* `Producer_ContactPerson_PhoneNumber_A`
* `Producer_ContactPerson_EmailAddress_A`
* `Producer_FaxNumber_A`

**Current System state:**
* `Broker.name` exists.
* `User.firstName`, `User.lastName`, `User.email` exist.

**Gaps (To Add to Schema):**
* `Broker` (or `User`) model requires: `addressLine1`, `addressLine2`, `city`, `state`, `postalCode`.
* `Broker` (or `User`) model requires: `phoneNumber`, `faxNumber`.

---

## 2. Insured / Client Information
The client requesting the COI.

**Required on ACORD 25:**
* `NamedInsured_FullName_A`
* `NamedInsured_MailingAddress_LineOne_A`
* `NamedInsured_MailingAddress_LineTwo_A`
* `NamedInsured_MailingAddress_CityName_A`
* `NamedInsured_MailingAddress_StateOrProvinceCode_A`
* `NamedInsured_MailingAddress_PostalCode_A`

**Current System state:**
* `Client.name` exists.

**Gaps (To Add to Schema):**
* `Client` model requires: `addressLine1`, `addressLine2`, `city`, `state`, `postalCode`.

---

## 3. Insurer(s) Affording Coverage
The insurance companies writing the policies, assigned to letters A-F.

**Required on ACORD 25:**
* `Insurer_FullName_A` through `F`
* `Insurer_NAICCode_A` through `F`
* Checkboxes mapped to specific letters (e.g. `GeneralLiability_InsurerLetterCode_A`)

**Current System state:**
* `insurer_name` is currently extracted by the Gemini AI pipeline for each policy.

**Gaps (To Add to AI Prompts & Validation):**
* The Policy AI Extraction schemas (`acord/schemas.py` and front-end prompts) do **not** attempt to extract the `naic_code` from the policy documents. 
* We need to add `naic_code` (String, nullable) to `AutoPolicyDetails`, `GLPolicyDetails`, `WCPolicyDetails`, and `UmbrellaPolicyDetails`.
* We need a dynamic assignment step in the backend COI generation logic to aggregate unique Insurers and assign them Letters (A, B, C...) for the output form.

---

## 4. Policy Details & Coverages
The limits and effective dates for the policies.

**Required on ACORD 25:**
* Policy Numbers
* Effective/Expiration Dates
* specific Limits (GL Each Occurrence, Auto Combined Single Limit, etc)

**Current System state:**
* The AI extraction schemas (`AUTO`, `GL`, `WC`, `UMBRELLA`) already map almost all of these limits properly into structured JSON.

**Gaps:**
* No major gaps immediately visible for standard limits, but we should make sure our prompt strictly enforces MM/DD/YYYY date formatting to cleanly populate the ACORD fields.

---

## 5. Certificate Holder
The entity who requested the COI.

**Required on ACORD 25:**
* `CertificateHolder_FullName_A`
* `CertificateHolder_MailingAddress_LineOne_A`
* `CertificateHolder_MailingAddress_LineTwo_A`
* `CertificateHolder_MailingAddress_CityName_A`
* `CertificateHolder_MailingAddress_StateOrProvinceCode_A`
* `CertificateHolder_MailingAddress_PostalCode_A`

**Current System state:**
* `certificate_holder_name` and `certificate_holder_address` are loosely extracted as raw strings from the initial email/upload demand.

**Gaps:**
* The backend COI generation script needs robust parsing to rip the raw `certificate_holder_address` into `LineOne`, `City`, `State`, and `ZipCode` so the ACORD library can actually place them in the correct discrete boxes.
