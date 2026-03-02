import sys
import os
import pytest
from livekit.agents import llm
from livekit.agents import Agent

# Add the receptionist directory to the path so we can import its modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../receptionist')))

import agent_tools

def test_agent_tool_context_can_instantiate():
    """
    This test explicitly guards against the regression we saw where LiveKit 1.x 
    changed their tool invocation syntax and broke our server boot sequence.
    """
    tools = [
        agent_tools.lookup_billing_balance,
        agent_tools.send_secure_payment_link,
        agent_tools.log_fnol_claim,
        agent_tools.retrieve_auto_id_cards,
        agent_tools.generate_and_send_coi,
        agent_tools.submit_vehicle_endorsement,
        agent_tools.page_on_call_agent
    ]
    
    # Livekit SDK allows binding a tool list on the Agent constructor
    # We should be able to create an Agent without a TypeError exception
    agent = Agent(
        instructions="You are a test agent.",
        tools=tools
    )
    
    assert agent is not None
