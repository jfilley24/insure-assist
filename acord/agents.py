import os
from google import genai
from google.genai import types
from pydantic import BaseModel
from dotenv import load_dotenv
from schemas import (
    RequestDemands, 
    AutoPolicyDetails, 
    GLPolicyDetails, 
    UmbrellaPolicyDetails, 
    WCPolicyDetails,
    CompleterOutput,
    ReviewerOutput,
    ClientSettings
)

load_dotenv()
client = genai.Client()
MODEL_ID = 'gemini-2.5-flash'

def read_prompt(filename: str) -> str:
    path = os.path.join(os.path.dirname(__file__), 'prompts', filename)
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def call_gemini_agent(system_instruction: str, content: list, response_schema: type[BaseModel]) -> BaseModel:
    response = client.models.generate_content(
        model=MODEL_ID,
        contents=content,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=response_schema,
            temperature=0.1
        )
    )
    import json
    return response_schema.model_validate(json.loads(response.text))

def run_request_reader(document) -> RequestDemands:
    prompt = read_prompt('request_reader.txt')
    return call_gemini_agent(prompt, [document], RequestDemands)

def run_policy_reader_auto(document) -> AutoPolicyDetails:
    prompt = read_prompt('policy_auto.txt')
    return call_gemini_agent(prompt, [document], AutoPolicyDetails)

def run_policy_reader_gl(document) -> GLPolicyDetails:
    prompt = read_prompt('policy_gl.txt')
    return call_gemini_agent(prompt, [document], GLPolicyDetails)

def run_policy_reader_umb(document) -> UmbrellaPolicyDetails:
    prompt = read_prompt('policy_umb.txt')
    return call_gemini_agent(prompt, [document], UmbrellaPolicyDetails)

def run_policy_reader_wc(document) -> WCPolicyDetails:
    prompt = read_prompt('policy_wc.txt')
    return call_gemini_agent(prompt, [document], WCPolicyDetails)

def run_completer(demands: RequestDemands, auto: AutoPolicyDetails, gl: GLPolicyDetails, umb: UmbrellaPolicyDetails, wc: WCPolicyDetails, client_settings: ClientSettings) -> dict:
    from datetime import datetime
    current_date = datetime.now().strftime("%m/%d/%Y")
    
    prompt = read_prompt('completer.txt')
    
    pdf_fields_list = ""
    field_file = os.path.join(os.path.dirname(__file__), 'acord_fields.txt')
    if os.path.exists(field_file):
        with open(field_file, 'r') as f:
            pdf_fields_list = f.read()
            
    content = f"""
    --- CURRENT DATE TO USE ---
    Today's Date: {current_date}

    --- EXACT ACORD 25 PDF FORM FIELDS AVAILBLE ---
    Please ONLY map your `acord_field_name` responses to the exact strings from this list:
    {pdf_fields_list}
    
    --- REQUESTED DEMANDS ---
    {demands.model_dump_json(indent=2)}
    
    --- CLIENT SETTINGS ---
    These settings indicate which policies the broker manages. 
    If a policy is NOT managed (e.g. managedWC is false), do NOT attempt to fill its sections.
    {client_settings.model_dump_json(indent=2)}

    --- AUTO POLICY ---
    {auto.model_dump_json(indent=2)}
    
    --- GL POLICY ---
    {gl.model_dump_json(indent=2)}
    
    --- UMBRELLA POLICY ---
    {umb.model_dump_json(indent=2)}
    
    --- WORKERS COMP POLICY ---
    {wc.model_dump_json(indent=2)}
    """
    output: CompleterOutput = call_gemini_agent(prompt, [content], CompleterOutput)
    
    # Convert list of FieldMappings back to a dictionary for pypdf
    result_dict = {}
    for mapping in output.acord_fields:
        result_dict[mapping.acord_field_name] = mapping.value
        
    return result_dict

def run_reviewer(demands: RequestDemands, auto: AutoPolicyDetails, gl: GLPolicyDetails, umb: UmbrellaPolicyDetails, wc: WCPolicyDetails, acord_fields: dict, client_settings: ClientSettings) -> ReviewerOutput:
    from datetime import datetime
    current_date = datetime.now().strftime("%Y-%m-%d")

    prompt = read_prompt('reviewer.txt')
    content = f"""
    --- CURRENT DATE MUST BE USED FOR EXPIRATION CHECKS ---
    Today's Date: {current_date}

    --- REQUESTED DEMANDS ---
    {demands.model_dump_json(indent=2)}
    
    --- CLIENT SETTINGS ---
    These settings indicate which policies the broker manages. 
    If a policy is NOT managed (e.g. managedWC is false), ignore all missing coverages or gaps for that policy type.
    {client_settings.model_dump_json(indent=2)}

    --- ACTUAL COVERAGES (AUTO, GL, UMB, WC) ---
    {auto.model_dump_json(indent=2)}
    {gl.model_dump_json(indent=2)}
    {umb.model_dump_json(indent=2)}
    {wc.model_dump_json(indent=2)}
    
    --- COMPLETED ACORD FIELDS ---
    {acord_fields}
    """
    return call_gemini_agent(prompt, content, ReviewerOutput)
