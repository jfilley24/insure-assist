import pytest
import sys
import os
from streamlit.testing.v1 import AppTest

# Ensure the parent directory is in the path to resolve local modules like 'prompts'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def test_policy_ingestion_and_chat():
    """Tests the Policy Q&A flow programmatically."""
    at = AppTest.from_file("app.py", default_timeout=120)
    at.run()
    
    assert not at.exception, "App crashed on startup"
    assert "Welcome to your Insure-Assist Portal" in at.title[0].value
    
    # 1. Simulate chat interaction
    # The text_input is automatically exposed
    if not at.text_input:
        pytest.fail("Text input box not found")
    
    at.text_input[0].set_value("What is my deductible for collision?")
    
    # Click the send button
    submit_btn = next((btn for btn in at.button if "Send" in btn.label), None)
    assert submit_btn is not None, "Could not find 'Send' button"
    submit_btn.click().run(timeout=120)
    
    assert not at.exception, "App crashed during AI Q&A generation"
    
    # Verify the AI responded
    # The chat messages are stored in at.chat_message
    messages = [msg for msg in at.chat_message]
    # At least two messages should exist (User prompt + Assistant response)
    assert len(messages) >= 2, "AI failed to respond to chat prompt"
    
    # Check that the last message is from the assistant
    last_msg = messages[-1]
    assert last_msg.name == "assistant", "The last message was not from the AI assistant"
