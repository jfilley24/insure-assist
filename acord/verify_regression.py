import sys
import json
from pypdf import PdfReader

def get_form_fields(pdf_path):
    reader = PdfReader(pdf_path)
    fields = reader.get_fields()
    
    # get_fields() returns a dict where values are dictionaries with a '/V' key for the value
    extracted = {}
    if fields:
        for fname, fvalue in fields.items():
            val = fvalue.get('/V')
            if val is not None:
                if isinstance(val, bytes):
                    extracted[fname] = val.decode('utf-8', errors='ignore')
                else:
                    extracted[fname] = str(val)
    return extracted

def main():
    if len(sys.argv) < 3:
        print("Usage: python verify_regression.py <path_to_pdf> <path_to_expected_json>")
        sys.exit(1)
        
    pdf_path = sys.argv[1]
    expected_json_path = sys.argv[2]
    
    print(f"Verifying PDF: {pdf_path} against {expected_json_path}")
    
    with open(expected_json_path, 'r', encoding='utf-8') as f:
        expected = json.load(f)
        
    actual_fields = get_form_fields(pdf_path)
    
    passed = True
    print(json.dumps(actual_fields, indent=2))
    
    for field_name, expected_value in expected.items():
        actual_value = actual_fields.get(field_name)
        
        # If expected is None or "" and actual is missing (or '/Off'), that's fine
        if (expected_value is None or expected_value == "" or expected_value == "/Off") and (actual_value is None or actual_value == "/Off"):
            continue
            
        if actual_value != expected_value:
            print(f"  [FAIL] Value Mismatch for field '{field_name}'")
            print(f"   Expected: {repr(expected_value)}")
            print(f"   Actual:   {repr(actual_value)}")
            passed = False
            
    if not passed:
        print("\n[FAIL] REGRESSION TEST FAILED! Missing or incorrect fields found.")
        sys.exit(1)
    else:
        print(f"[PASS] All {len(expected)} fields mapped perfectly.")
        
if __name__ == "__main__":
    main()
