import pytest
from livekit.agents import llm
import sys
import os

# Add the receptionist directory to the path so we can import its modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../receptionist')))

import agent_tools

@pytest.mark.asyncio
async def test_billing_balance_tool_executes():
    result = await agent_tools.lookup_billing_balance()
    assert "outstanding balance" in result

@pytest.mark.asyncio
async def test_fnol_claim_tool_executes():
    result = await agent_tools.log_fnol_claim(
        incident_type="auto accident", 
        incident_date="yesterday", 
        incident_location="Main St"
    )
    assert "Claim successfully logged" in result

def test_tools_are_valid_livekit_functions():
    # Since LiveKit v0.8 uses specific typing to identify agent tools, 
    # we assert that these functions correctly map to the new API signature
    assert hasattr(agent_tools.lookup_billing_balance, "__livekit_tool_info")
    assert hasattr(agent_tools.log_fnol_claim, "__livekit_tool_info")
    assert agent_tools.lookup_billing_balance.__livekit_tool_info.name == "lookup_billing_balance"
