import sys
try:
    import fitz
    
    doc = fitz.open(r'c:\Projects\Code4\insure-assist\acord\assets\Request for COI\SUBCONTRACT-436K-02-SUN VALLEY EXECUTED.pdf')
    text = '\n'.join([page.get_text("text") for page in doc])
    
    print(f"Total extracted chars: {len(text)}")
    print("--- FIRST 2000 CHARS ---")
    print(text[:2000])
except Exception as e:
    print(f"Error: {e}")
