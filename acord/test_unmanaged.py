import requests
import json
import os
import base64

pdf_path = r"C:\Projects\Code4\insure-assist\acord\assets\Request for COI\SUBCONTRACT-436K-02-SUN VALLEY EXECUTED.pdf"

policies = {
    "auto": {"policy_number": "A123", "expiration_date": "12/31/2026", "csl_limit": "1000000", "has_additional_insured": True, "has_waiver_of_subrogation": True},
    "gl": {"policy_number": "G123", "expiration_date": "12/31/2026", "each_occurrence_limit": "1000000", "general_aggregate_limit": "2000000", "has_additional_insured": True, "has_waiver_of_subrogation": True},
    "umbrella": {"policy_number": "U123", "expiration_date": "12/31/2026", "occurrence_limit": "5000000", "aggregate_limit": "5000000", "has_additional_insured": True, "has_waiver_of_subrogation": True},
    "wc": {"policy_number": "W123", "expiration_date": "12/31/2026", "el_each_accident_limit": "1000000", "el_disease_policy_limit": "1000000", "el_disease_employee_limit": "1000000", "has_waiver_of_subrogation": True}
}

client_settings = {
    "managedAuto": True,
    "managedGL": True,
    "managedUmb": True,
    "managedWC": False  # <-- UNMANAGED WC
}

with open(pdf_path, 'rb') as f:
    files = {'request_pdf': ('test.pdf', f, 'application/pdf')}
    data = {
        'policies_json': json.dumps(policies),
        'client_settings_json': json.dumps(client_settings)
    }
    print("Sending request to FastAPI...")
    response = requests.post('http://localhost:8000/generate-coi', files=files, data=data)
    
print("Status Code:", response.status_code)
try:
    result = response.json()
    print("--- OVERALL STATUS ---")
    print(result.get('status'))
    
    print("--- POLICY REVIEWS ---")
    print(json.dumps(result.get('policy_reviews'), indent=2))
    
    if result.get('pdf_base64'):
        with open('unmanaged_test_output.pdf', 'wb') as out_f:
            out_f.write(base64.b64decode(result['pdf_base64']))
        print("Saved unmanaged_test_output.pdf")
except Exception as e:
    print("Error parsing response:", e)
    print(response.text)
