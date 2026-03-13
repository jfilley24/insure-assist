import asyncio
import os
import json
from google.genai import types
import google.genai as genai

async def main():
    pdf_path = r"C:\Projects\Code4\insure-assist\acord\assets\Clients\Yellowstone Plumbing\NEXT GL-PL POLICY 1-30.pdf"
    print("Running GL Policy Reader on NEXT Insurance...")
    
    from agents import run_policy_reader_gl, client
    
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()
    
    document = client.files.upload(file=pdf_path)
        
    result = run_policy_reader_gl(document)
    
    print("--- RESULT ---")
    print(result.model_dump_json(indent=2))

if __name__ == "__main__":
    asyncio.run(main())
