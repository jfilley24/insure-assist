import sys
try:
    import fitz
    
    doc = fitz.open(r'c:\Projects\Code4\insure-assist\acord\assets\Clients\Yellowstone Plumbing\NEXT GL-PL POLICY 1-30.pdf')
    found_naic = False
    
    for i, page in enumerate(doc):
        text = page.get_text("text")
        if not text:
            continue
            
        for line in text.split('\n'):
            if 'NAIC' in line.upper() or 'COMPANY NUMBER' in line.upper():
                print(f"Page {i+1}: {line.strip()}")
                found_naic = True
                
    if not found_naic:
        print("NAIC code NOT FOUND in document text.")
        
except Exception as e:
    print(f"Error: {e}")
