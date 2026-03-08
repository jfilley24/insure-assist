import streamlit as st
import os
import fitz  # PyMuPDF
import json
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig
from dotenv import load_dotenv
from prompts import DEC_PAGE_EXTRACTION_PROMPT, QUOTE_REVIEW_PROMPT

# Load environment variables
load_dotenv()

# Initialize Vertex AI
try:
    vertexai.init()
except Exception as e:
    st.error(f"Failed to initialize Vertex AI: {e}. Please ensure you have run 'gcloud auth application-default login'.")
    st.stop()

st.set_page_config(page_title="WFA Underwriting & Quoting App", layout="wide")

# --- Simulated Auth State ---
st.sidebar.markdown("### 🔒 WFA Secure Portal")
st.sidebar.info("**Logged in as:** Jason Filley\n\n**Role:** Managing Broker")

st.title("WFA Underwriting & Quoting Intelligence")
st.markdown("Automated data flow and compliance checking directly from the Agency Management System (AMS).")

import base64

# --- Helper Functions ---

def display_pdf(file_path):
    """Displays a local PDF file natively in Streamlit using an iframe."""
    with open(file_path, "rb") as f:
        base64_pdf = base64.b64encode(f.read()).decode('utf-8')
    
    pdf_display = f'<iframe src="data:application/pdf;base64,{base64_pdf}" width="100%" height="800" type="application/pdf"></iframe>'
    st.markdown(pdf_display, unsafe_allow_html=True)

def extract_text_from_pdf_path(pdf_path: str) -> str:
    """Reads a local PDF file and extracts all text."""
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def parse_dec_page(pdf_text: str) -> str:
    """Sends the PDF text to Gemini to extract structured JSON."""
    model = GenerativeModel("gemini-2.5-flash")
    response = model.generate_content(
        contents=[
            DEC_PAGE_EXTRACTION_PROMPT,
            f"Here is the raw text from the Declarations Page:\n\n{pdf_text}"
        ],
        generation_config=GenerationConfig(
            response_mime_type="application/json",
            temperature=0.1 
        ),
    )
    # Safely extract text from all parts to avoid 'Multiple content parts' error
    full_response = ""
    if response.candidates and response.candidates[0].content.parts:
        for part in response.candidates[0].content.parts:
            try:
                if part.text:
                    full_response += part.text
            except Exception:
                pass
    
    if not full_response:
        try:
            full_response = response.text
        except Exception:
            full_response = str(response)
            
    return full_response

def review_quote(quote_text: str, philosophy_json: str) -> str:
    """Analyzes a quote against the WFA philosophy."""
    model = GenerativeModel("gemini-2.5-pro")
    response = model.generate_content(
        contents=[
            QUOTE_REVIEW_PROMPT,
            f"Here is the WFA Insurance Philosophy JSON:\n\n{philosophy_json}",
            f"Here is the raw text from the Prospective Quote:\n\n{quote_text}"
        ],
        generation_config=GenerationConfig(
            temperature=0.4 
        ),
    )
    # Safely extract text from all parts to avoid 'Multiple content parts' error
    full_response = ""
    if response.candidates and response.candidates[0].content.parts:
        for part in response.candidates[0].content.parts:
            try:
                if part.text:
                    full_response += part.text
            except Exception:
                pass
    
    if not full_response:
        try:
            full_response = response.text
        except Exception:
            full_response = str(response)
            
    # Escape dollar signs using HTML entities to prevent Streamlit from triggering KaTeX math block rendering
    safe_response = full_response.replace("$", "&#36;")
    return safe_response



# --- Creating the Tabs ---
tab1, tab2 = st.tabs(["Dec-Page Extractor (Feature #8)", "Philosophy-Driven Quote Analyzer (Feature #13)"])

with tab1:
    st.header("Magic Data Extraction")
    st.markdown("Pull a messy Carrier Declarations Page directly from your AMS or sent to you by a potential client. We will extract perfectly structured JSON ready to be pushed to your rating software.")
    
    # Simulated MCP Tool Pull
    col1, col2 = st.columns([1, 1])
    
    dec_path = r"c:\Projects\Code4\insure-assist\assets\Safeco-DEC.pdf"
    
    with col1:
        st.subheader("Original Document (Native PDF)")
        if os.path.exists(dec_path):
            display_pdf(dec_path)
        else:
            st.error(f"Asset file not found at {dec_path}")
                
    with col2:
        st.subheader("AI Extraction Engine")
        
        # Single-click workflow
        if st.button("Extract PDF to JSON", type="primary", use_container_width=True):
            if os.path.exists(dec_path):
                with st.spinner("Extracting structured data via Vertex AI..."):
                    try:
                        # 1. Read PDF Text
                        raw_text = extract_text_from_pdf_path(dec_path)
                        
                        # 2. Call Generation Model
                        extracted_json_str = parse_dec_page(raw_text)
                        
                        # Validate the JSON output
                        try:
                            json_data = json.loads(extracted_json_str)
                            st.success("Successfully extracted and structured the data!")
                            st.json(json_data)
                        except json.JSONDecodeError:
                            st.error("The AI failed to return valid JSON.")
                            st.code(extracted_json_str)
                            
                    except Exception as e:
                        st.error(f"Error communicating with Vertex AI: {e}")
            else:
                 st.warning("Cannot extract, document is missing.")

with tab2:
    st.header("Virtual Broker: Quote Analyzer")
    st.markdown("Pull a prospective quote from the rating system. The AI will compare it strictly against the WFA Insurance Philosophy and call out any dangerous gaps or wasteful spending.")
    
    quote_path = r"c:\Projects\Code4\insure-assist\assets\QUOTE JFILLEY AUTO HOME RV 12.9.22 QUOTE.pdf"
    
    # Simulated MCP Tool Pull
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.subheader("Original Quote (Native PDF)")
        if os.path.exists(quote_path):
            display_pdf(quote_path)
        else:
            st.error(f"Asset file not found at {quote_path}")
            
    with col2:
        st.subheader("AI Analysis Engine")
        
        # Single-click workflow
        if st.button("Review Quote Against WFA Standards", type="primary", use_container_width=True):
            if os.path.exists(quote_path):
                with st.spinner("Analyzing quote securely via Vertex AI..."):
                    try:
                        # 1. Read the Quote PDF
                        quote_text = extract_text_from_pdf_path(quote_path)
                        
                        # 2. Read the Philosophy JSON
                        try:
                            with open("wfa_philosophy.json", "r") as f:
                                philosophy_data = f.read()
                        except FileNotFoundError:
                            st.error("Could not find the wfa_philosophy.json database file.")
                            st.stop()
                            
                        # 3. Request Review
                        review_markdown = review_quote(quote_text, philosophy_data)
                        
                        # $ escaping is now handled directly inside review_quote()
                        safe_markdown = review_markdown
                        
                        st.markdown("---")
                        st.markdown("### WFA Virtual Broker Review")
                        st.markdown(safe_markdown)
                        st.markdown("---")
                        
                    except Exception as e:
                        st.error(f"Error during analysis: {e}")
            else:
                 st.warning("Cannot review quote, document is missing.")
