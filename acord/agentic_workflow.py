import os
import glob
from datetime import datetime
from pdf_utils import extract_text_from_pdf, fill_acord_25
from agents import (
    run_request_reader,
    run_policy_reader_auto,
    run_policy_reader_gl,
    run_policy_reader_umb,
    run_policy_reader_wc,
    run_completer,
    run_reviewer
)

def process_coi_request(request_pdf_path: str, client_name: str):
    print(f"Starting ACORD 25 processing for {client_name} based on {request_pdf_path}...")
    
    # 1. Read Request
    print("Uploading Request Document to Gemini...")
    from agents import client
    
    req_file = client.files.upload(file=request_pdf_path)
    
    print("Calling Request Reader Agent...")
    demands = run_request_reader(req_file)
    print(f"Demands Extracted: {demands.model_dump_json(indent=2)}\n")
    
    # 2. Locate Client Policy Documents
    client_dir = os.path.join("assets", "Clients", client_name)
    if not os.path.exists(client_dir):
        print(f"Client directory not found: {client_dir}")
        return
        
    client_pdfs = glob.glob(os.path.join(client_dir, "*.pdf"))
    auto_file = None
    gl_file = None
    umb_file = None
    wc_file = None
    
    for pdf in client_pdfs:
        lower_name = os.path.basename(pdf).lower()
        if "auto" in lower_name:
            print(f"Uploading {lower_name} to Gemini for Auto Reader...")
            auto_file = client.files.upload(file=pdf)
        elif "general liability" in lower_name or "gl" in lower_name:
            print(f"Uploading {lower_name} to Gemini for GL Reader...")
            gl_file = client.files.upload(file=pdf)
        elif "umbrella" in lower_name or "excess" in lower_name or "umb" in lower_name:
            print(f"Uploading {lower_name} to Gemini for Umbrella Reader...")
            umb_file = client.files.upload(file=pdf)
        elif "workers comp" in lower_name or "wc" in lower_name or "workers" in lower_name:
            print(f"Uploading {lower_name} to Gemini for WC Reader...")
            wc_file = client.files.upload(file=pdf)
            
    print(f"Uploaded files for Auto: {bool(auto_file)}, GL: {bool(gl_file)}, UMB: {bool(umb_file)}, WC: {bool(wc_file)}")
            
    # 3. Call Policy Reader Agents
    print("Calling Policy Reader Agents...")
    auto_policy = run_policy_reader_auto(auto_file) if auto_file else None
    gl_policy = run_policy_reader_gl(gl_file) if gl_file else None
    umb_policy = run_policy_reader_umb(umb_file) if umb_file else None
    wc_policy = run_policy_reader_wc(wc_file) if wc_file else None
    
    # Fallbacks if missing
    from schemas import AutoPolicyDetails, GLPolicyDetails, UmbrellaPolicyDetails, WCPolicyDetails
    if not auto_policy: auto_policy = AutoPolicyDetails()
    if not gl_policy: gl_policy = GLPolicyDetails()
    if not umb_policy: umb_policy = UmbrellaPolicyDetails()
    if not wc_policy: wc_policy = WCPolicyDetails()
import os
import glob
from datetime import datetime
from pdf_utils import extract_text_from_pdf, fill_acord_25
from agents import (
    run_request_reader,
    run_policy_reader_auto,
    run_policy_reader_gl,
    run_policy_reader_umb,
    run_policy_reader_wc,
    run_completer,
    run_reviewer
)

def process_coi_request(request_pdf_path: str, client_name: str):
    print(f"Starting ACORD 25 processing for {client_name} based on {request_pdf_path}...")
    
    # 1. Read Request
    print("Uploading Request Document to Gemini...")
    from agents import client
    
    req_file = client.files.upload(file=request_pdf_path)
    
    print("Calling Request Reader Agent...")
    demands = run_request_reader(req_file)
    print(f"Demands Extracted: {demands.model_dump_json(indent=2)}\n")
    
    # 2. Locate Client Policy Documents
    client_dir = os.path.join("assets", "Clients", client_name)
    if not os.path.exists(client_dir):
        print(f"Client directory not found: {client_dir}")
        return
        
    client_pdfs = glob.glob(os.path.join(client_dir, "*.pdf"))
    auto_file = None
    gl_file = None
    umb_file = None
    wc_file = None
    
    for pdf in client_pdfs:
        lower_name = os.path.basename(pdf).lower()
        if "auto" in lower_name:
            print(f"Uploading {lower_name} to Gemini for Auto Reader...")
            auto_file = client.files.upload(file=pdf)
        elif "general liability" in lower_name or "gl" in lower_name:
            print(f"Uploading {lower_name} to Gemini for GL Reader...")
            gl_file = client.files.upload(file=pdf)
        elif "umbrella" in lower_name or "excess" in lower_name or "umb" in lower_name:
            print(f"Uploading {lower_name} to Gemini for Umbrella Reader...")
            umb_file = client.files.upload(file=pdf)
        elif "workers comp" in lower_name or "wc" in lower_name or "workers" in lower_name:
            print(f"Uploading {lower_name} to Gemini for WC Reader...")
            wc_file = client.files.upload(file=pdf)
            
    print(f"Uploaded files for Auto: {bool(auto_file)}, GL: {bool(gl_file)}, UMB: {bool(umb_file)}, WC: {bool(wc_file)}")
            
    # 3. Call Policy Reader Agents
    print("Calling Policy Reader Agents...")
    auto_policy = run_policy_reader_auto(auto_file) if auto_file else None
    gl_policy = run_policy_reader_gl(gl_file) if gl_file else None
    umb_policy = run_policy_reader_umb(umb_file) if umb_file else None
    wc_policy = run_policy_reader_wc(wc_file) if wc_file else None
    
    # Fallbacks if missing
    from schemas import AutoPolicyDetails, GLPolicyDetails, UmbrellaPolicyDetails, WCPolicyDetails
    if not auto_policy: auto_policy = AutoPolicyDetails()
    if not gl_policy: gl_policy = GLPolicyDetails()
    if not umb_policy: umb_policy = UmbrellaPolicyDetails()
    if not wc_policy: wc_policy = WCPolicyDetails()
    
    # 4. Call Completer Agent
    print("Calling Completer Agent...")
    acord_fields = run_completer(demands, auto_policy, gl_policy, umb_policy, wc_policy)
    print(f"Fields Mapped: {acord_fields}\n")
    
    # 5. Call Reviewer Agent
    print("Calling Reviewer Agent...")
    review = run_reviewer(demands, auto_policy, gl_policy, umb_policy, wc_policy, acord_fields)
    print(f"Review Output: Passed={review.passed}\n")
    
    # 6. Save Outputs
    output_dir = os.path.join("assets", "Clients", "Response", datetime.now().strftime("%Y%m%d_%H%M%S"))
    os.makedirs(output_dir, exist_ok=True)
    
    summary_path = os.path.join(output_dir, "Summary.md")
    with open(summary_path, "w", encoding='utf-8') as f:
        f.write("# Reviewer Output:\n")
        f.write(review.model_dump_json(indent=2))
    print(f"Summary saved to {summary_path}")

    fields_path = os.path.join(output_dir, "acord_fields.json")
    with open(fields_path, "w", encoding='utf-8') as f:
        import json
        f.write(json.dumps(acord_fields, indent=2))
    
    template_path = os.path.join("assets", "COI Templates", "ACORD 25 COI fillable.pdf")
    output_pdf_path = os.path.join(output_dir, "Completed_COI.pdf")
    if os.path.exists(template_path):
        fill_acord_25(template_path, output_pdf_path, acord_fields)
    else:
        print(f"Warning: Template not found at {template_path}")

if __name__ == "__main__":
    # Test 2: PEKIN with Sun Valley Subcontract
    request_pdf = os.path.join("assets", "Request for COI", "SUBCONTRACT-436K-02-SUN VALLEY EXECUTED.pdf")
    process_coi_request(request_pdf, "PEKIN")
