import sys
import os
from dotenv import load_dotenv

sys.path.append(os.path.dirname(__file__))
from agents import run_request_reader, client

load_dotenv()

try:
    pdf_path = r'c:\Projects\Code4\insure-assist\acord\assets\Request for COI\SUBCONTRACT-436K-02-SUN VALLEY EXECUTED.pdf'
    print(f"Uploading {pdf_path} to Gemini...")
    req_file = client.files.upload(file=pdf_path)
    
    print("Running Request Reader...")
    demands = run_request_reader(req_file)
    
    print("\n--- EXTRACTED DEMANDS ---")
    print(demands.model_dump_json(indent=2))
    
    # Cleanup
    client.files.delete(name=req_file.name)
except Exception as e:
    print(f"Error: {e}")
