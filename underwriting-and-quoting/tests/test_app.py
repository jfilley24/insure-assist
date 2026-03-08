import pytest
import sys
import os
from streamlit.testing.v1 import AppTest

# Ensure the parent directory is in the path to resolve local modules like 'prompts'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def test_dec_extraction():
    """Tests the Dec-Page AI Extraction flow programmatically."""
    at = AppTest.from_file("app.py", default_timeout=120)
    at.run()
    
    assert not at.exception, "App crashed on startup"
    assert at.title[0].value == "WFA Underwriting & Quoting Intelligence"
    
    # 1. Click "Extract PDF to JSON"
    ext_btn = next((btn for btn in at.button if "Extract PDF to JSON" in btn.label), None)
    assert ext_btn is not None, "Could not find extract button"
    ext_btn.click().run(timeout=120)
    
    # Wait for the AI call to finish and check we didn't hit an exception
    assert not at.exception, "App crashed during AI extraction"
    
    success_notices = [s.value for s in at.success]
    assert any("Successfully extracted" in s for s in success_notices), "AI Extraction success message not found"


def test_quote_review():
    """Tests the Philosophy Quote Review flow programmatically."""
    at = AppTest.from_file("app.py", default_timeout=120)
    at.run()
    
    # "Review Quote Against WFA Standards" is on the second tab, but AppTest 
    # exposes all buttons if they are rendered or we can just trigger it.
    
    # 1. Click AI Review
    review_btn = next((btn for btn in at.button if "Review Quote" in btn.label), None)
    assert review_btn is not None, "Could not find review quote button"
    review_btn.click().run(timeout=120)
    
    assert not at.exception, "App crashed during AI quote review"
    
    # The output generates a virtual broker markdown header
    md_content = [md.value for md in at.markdown]
    assert any("WFA Virtual Broker Review" in m for m in md_content), "Virtual Broker review output not found"
