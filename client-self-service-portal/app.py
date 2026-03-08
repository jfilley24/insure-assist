import streamlit as st
import os
import time
import re
import random
import threading
from streamlit.runtime.scriptrunner import add_script_run_ctx
import vertexai
from vertexai.generative_models import GenerativeModel, Part
from dotenv import load_dotenv
from prompts import CLIENT_PORTAL_SYSTEM_PROMPT, VIRTUAL_AGENT_SYSTEM_PROMPT

# Load environment variables
load_dotenv()

# Initialize Vertex AI
try:
    vertexai.init()
except Exception as e:
    st.error(f"Failed to initialize Vertex AI: {e}. Please ensure you have run 'gcloud auth application-default login'.")
    st.stop()

import base64

st.set_page_config(page_title="Insure-Assist Client Portal", layout="wide")

def display_pdf(file_path):
    """Displays a local PDF file natively in Streamlit using an iframe."""
    with open(file_path, "rb") as f:
        base64_pdf = base64.b64encode(f.read()).decode('utf-8')
    
    pdf_display = f'<iframe src="data:application/pdf;base64,{base64_pdf}" width="100%" height="800" type="application/pdf"></iframe>'
    st.markdown(pdf_display, unsafe_allow_html=True)

# --- Simulated Auth State ---
st.sidebar.markdown("### 👤 WFA Client Portal")
st.sidebar.info("**Logged in as:** Sarah Jenkins\n\n**Account ID:** SJ-849201")

st.title("Welcome to your Insure-Assist Portal, Sarah!")
st.markdown("We've securely loaded your active insurance policy document directly from our backend. **Ask any questions about your policy below!** We'll translate the jargon and point you to the exact page.")

# Initialize session state for the uploaded file and chat history
if "gemini_file" not in st.session_state:
    st.session_state.gemini_file = None
if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "assistant", "content": "Hi Sarah! I'm your AI insurance assistant. I have securely loaded your Safeco Auto & Home Policy from our servers. What questions do you have today?"}
    ]
if "virtual_agent_messages" not in st.session_state:
    st.session_state.virtual_agent_messages = [
        {"role": "assistant", "content": "Hi Sarah. I am your WFA Virtual Agent. Need to add a vehicle or file a claim? You can snap a photo or upload an image below and we can get started."}
    ]

policy_path = r"c:\Projects\Code4\insure-assist\assets\Safeco-Policy.pdf"

if not os.path.exists(policy_path):
    st.error(f"Backend asset missing at: {policy_path}. Please contact support.")
    st.stop()

tab1, tab2 = st.tabs(["📄 Talk to My Policy", "📸 Virtual Agent (Image Sync)"])

with tab1:
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.subheader("Your Active Policy (Native PDF)")
        display_pdf(policy_path)
        
    with col2:
        st.subheader("Talk to Your Policy")
        st.caption("Ask questions, find coverages, or get summaries.")
        
        # Auto-load document on page load to improve perceived performance
        if st.session_state.gemini_file is None:
            with st.spinner("Securely synchronizing your policy document..."):
                try:
                    with open(policy_path, "rb") as f:
                        pdf_bytes = f.read()
                    document_part = Part.from_data(pdf_bytes, mime_type="application/pdf")
                    st.session_state.gemini_file = document_part
                except Exception as e:
                    st.error(f"Failed to synchronize document: {e}")
                    st.stop()
        
        # Dynamic input text logic
        is_first_question = len(st.session_state.messages) <= 1
        placeholder_text = "Am I covered for a rental car?" if is_first_question else "Ask another question..."
        
        # Chat input at the top
        with st.form(key="chat_form", clear_on_submit=True):
            col_input, col_btn = st.columns([5, 1])
            with col_input:
                user_input = st.text_input(
                    "Query",
                    value="", 
                    placeholder=placeholder_text, 
                    label_visibility="collapsed",
                    key="chat_query"
                )
            with col_btn:
                submit_button = st.form_submit_button("Send", use_container_width=True)

        if submit_button and user_input:
            # Add user message to chat history
            st.session_state.messages.append({"role": "user", "content": user_input})

            # Set up a status container for sequential processing text
            status_container = st.empty()
            
            try:
                # Construct the conversation context
                contents = [CLIENT_PORTAL_SYSTEM_PROMPT, st.session_state.gemini_file]
                
                # Append previous history (excluding system prompt)
                for msg in st.session_state.messages[:-1]: # exclude the user message we just appended
                    # Gemini categorizes roles as "user" or "model"
                    role = "model" if msg["role"] == "assistant" else "user"
                    contents.append(f"{role.capitalize()}: {msg['content']}")
                
                # Append the current prompt
                contents.append(f"User: {user_input}")
                
                model = GenerativeModel("gemini-2.5-flash")
                
                spinners = [
                    "Analyzing your policy details...",
                    "Scanning policy endorsements...",
                    "Cross-referencing coverages...",
                    "Checking exclusions and limits...",
                    "Reading the fine print..."
                ]
                
                # Create an active background thread to rotate the loading phrases
                stop_spinner = False
                
                def rotate_spinner():
                    idx = 0
                    while not stop_spinner:
                        status_container.info(f"⏳ {spinners[idx % len(spinners)]}")
                        idx += 1
                        time.sleep(4)
                
                spinner_thread = threading.Thread(target=rotate_spinner)
                add_script_run_ctx(spinner_thread)
                spinner_thread.start()
                
                try:
                    response = model.generate_content(
                        contents=contents,
                    )
                finally:
                    # Always stop the spinner thread when complete or errored
                    stop_spinner = True
                    spinner_thread.join()
                
                status_container.empty() # Clear the status box when done
                
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
                
                # Add assistant response to chat history
                st.session_state.messages.append({
                    "role": "assistant", 
                    "content": safe_response
                })
                
            except Exception as e:
                status_container.error(f"Error communicating with AI: {e}")

        st.markdown("### Conversation History")
        # Display chat messages grouped by conversational turn (newest turns on top)
        # Removing 'height' prevents Streamlit from auto-scrolling to the bottom of the container
        chat_container = st.container()
        with chat_container:
            # Separate the initial greeting
            greeting = st.session_state.messages[0]
            interactions = st.session_state.messages[1:]
            
            # Group into pairs (User Q, Assistant A)
            turns = []
            for i in range(0, len(interactions), 2):
                q = interactions[i]
                a = interactions[i+1] if i + 1 < len(interactions) else None
                turns.append((q, a))
                
            # Render turns in reverse chronological order
            for q, a in reversed(turns):
                # Render User Question
                with st.chat_message(q["role"]):
                    st.markdown(q["content"])
                    
                # Render Assistant Answer (if it exists)
                if a:
                    with st.chat_message(a["role"]):
                        st.markdown(a["content"])
                        
            # Always render the initial greeting at the very bottom
            with st.chat_message(greeting["role"]):
                st.markdown(greeting["content"])

with tab2:
    st.subheader("Virtual Agent Intake")
    st.caption("Upload requested images, snap photos, and text your agent directly.")
    
    # Dual input: Camera or File
    img_source = st.radio("How would you like to provide the image?", ["Upload a File", "Use Camera"], horizontal=True)
    
    uploaded_file = None
    if img_source == "Upload a File":
        uploaded_file = st.file_uploader("Upload an image (Damage, VIN, Documentation)", type=['png', 'jpg', 'jpeg'])
    else:
        uploaded_file = st.camera_input("Take a picture")
    
    if uploaded_file is not None:
        # Preview the image with a subtle border
        st.markdown(
            '<div style="border:1px solid #ddd; border-radius: 8px; padding: 10px; margin-bottom: 15px; max-width: 600px;">', 
            unsafe_allow_html=True
        )
        st.image(uploaded_file, caption="Ready for Agent Analysis", width=600)
        st.markdown('</div>', unsafe_allow_html=True)
    
    # Virtual Agent Chat Form
    with st.form(key="va_chat_form", clear_on_submit=True):
        col_va_in, col_va_btn = st.columns([5, 1])
        with col_va_in:
            va_input = st.text_input(
                "Message",
                placeholder="e.g. Here is the VIN for the Honda.", 
                label_visibility="collapsed",
                key="va_chat_query"
            )
        with col_va_btn:
            va_submit = st.form_submit_button("Send to Agent", use_container_width=True)
            
    if va_submit and va_input:
        # Add user message to history
        st.session_state.virtual_agent_messages.append({"role": "user", "content": va_input})
        
        va_status = st.empty()
        va_status.info("👁️ Virtual Agent is processing...")
        
        try:
            contents = [VIRTUAL_AGENT_SYSTEM_PROMPT]
            
            # If they provided an image, parse it into a Vertex Part
            if uploaded_file is not None:
                image_bytes = uploaded_file.getvalue()
                mime_type = "image/jpeg" if uploaded_file.name.lower().endswith(('jpg', 'jpeg')) else "image/png"
                image_part = Part.from_data(image_bytes, mime_type=mime_type)
                contents.append(image_part)
            
            # Append chat history (minus system)
            for msg in st.session_state.virtual_agent_messages[:-1]:
                role = "model" if msg["role"] == "assistant" else "user"
                contents.append(f"{role.capitalize()}: {msg['content']}")
            
            contents.append(f"User: {va_input}")
            
            model = GenerativeModel("gemini-2.5-flash")
            response = model.generate_content(contents=contents)
            
            va_status.empty()
            
            safe_response = getattr(response, "text", str(response)).replace("$", "&#36;")
            st.session_state.virtual_agent_messages.append({
                "role": "assistant",
                "content": safe_response
            })
            
        except Exception as e:
            va_status.error(f"Error communicating with AI: {e}")
            
    st.markdown("### Conversation History")
    va_container = st.container()
    with va_container:
        # Render Virtual Agent history in reverse order, same logic
        va_greeting = st.session_state.virtual_agent_messages[0]
        va_interactions = st.session_state.virtual_agent_messages[1:]
        
        va_turns = []
        for i in range(0, len(va_interactions), 2):
            q = va_interactions[i]
            a = va_interactions[i+1] if i + 1 < len(va_interactions) else None
            va_turns.append((q, a))
            
        for q, a in reversed(va_turns):
            with st.chat_message(q["role"]):
                st.markdown(q["content"])
            if a:
                with st.chat_message(a["role"]):
                    st.markdown(a["content"])
                    
        with st.chat_message(va_greeting["role"]):
            st.markdown(va_greeting["content"])
