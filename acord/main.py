from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, Response
import json
import os
import tempfile
import base64
from datetime import datetime

# Local imports
from agents import run_request_reader, run_completer, run_reviewer, client
from schemas import AutoPolicyDetails, GLPolicyDetails, UmbrellaPolicyDetails, WCPolicyDetails
from pdf_utils import fill_acord_25, extract_text_from_pdf

app = FastAPI(title="ACORD Generation Engine API", description="Microservice for processing and filling ACORD 25 COIs.")

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/generate-coi")
async def generate_coi(
    request_pdf: UploadFile = File(...),
    policies_json: str = Form(...) # JSON string containing auto, gl, umb, wc policy data
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
        
        # 4. Map ACORD Fields
        print("Running Completer...")
        acord_fields = run_completer(demands, auto_policy, gl_policy, umb_policy, wc_policy)
        
        # 5. Check missing/non-compliant gaps
        print("Running Reviewer...")
        review = run_reviewer(demands, auto_policy, gl_policy, umb_policy, wc_policy, acord_fields)
        
        # 6. Fill PDF if passed (or we can always fill what we can and return it regardless)
        pdf_base64 = None
        template_path = os.path.join("assets", "COI Templates", "ACORD 25 COI fillable.pdf")
        
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
