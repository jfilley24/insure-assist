import os
import asyncio
import logging
import signal
import sys
from dotenv import load_dotenv

from google.genai import types
from livekit.agents import (
    AutoSubscribe, 
    JobContext, 
    WorkerOptions, 
    cli, 
    Agent, 
    AgentSession,
    AudioConfig,
    BackgroundAudioPlayer,
    BuiltinAudioClip
)
from livekit.plugins import google

load_dotenv()

logger = logging.getLogger("receptionist")
logger.setLevel(logging.INFO)

async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()

    # Context data for the agency. (To be loaded from external DB eventually)
    agency_profile = {
        "agency_name": "Wilcock, Filley and Associates",
        "agent_name": "Sarah",
        "tone": "professional, highly efficient, and empathetic",
        "phone_number": "(480) 464-2288",
        "website": "https://wfains.com",
        "established": "1994",
        "about": "WFA Insurance is a family-owned, independent Arizona Insurance Agency that works with multiple top-rated carriers to provide competitive coverage. We prioritize clarity and transparency.",
        "services": [
            "Auto Insurance (vehicles, motorcycles, RVs, boats)",
            "Home Insurance (homes, condos, rental properties)",
            "Life Insurance (term and whole-life)",
            "Business Insurance",
            "Specialized Programs (Child Care Liability, Military Child Care)",
            "Health Insurance"
        ],
        "quick_links": {
            "Quote": "https://wfains.com/get-a-quote/",
            "Payment": "https://wfains.com/make-a-payment/",
            "Claims": "https://wfains.com/make-a-payment/"
        }
    }

    # Omni-Agent Identity
    instructions = f"""You are {agency_profile['agent_name']}, the highly capable AI Receptionist for {agency_profile['agency_name']} (Established {agency_profile['established']}).
Your tone must be {agency_profile['tone']}. You are speaking with a client over the phone, so do not use markdown or bullet points. Keep answers conversational.
You have the power to help the client with almost anything they need without transferring them. The caller's assigned agent is Jason Filley.

### Agency Knowledge Base
- **Contact:** Phone: {agency_profile['phone_number']}, Website: {agency_profile['website']}
- **Services:** {', '.join(agency_profile['services'])}
- **Links (Do not read URL letters, just offer to text/send them):** Quote: {agency_profile['quick_links']['Quote']}, Payment: {agency_profile['quick_links']['Payment']}

### Your Objectives
1. Answer the call warmly and ask how you can help.
2. Listen to their request and use your internal tool system to resolve it for them perfectly.
    - If they want to pay a bill, run the billing tool and send them the payment link.
    - If they had an accident, walk them through the FNOL intake tool calmly.
    - If they need an ID card or a Certificate of Insurance, use those tools.
    - If they are calling after hours with a true emergency, page the on-call agent.
3. If they ask a question that requires deep human expertise, politely tell them: "I'll leave a detailed note for your agent, Jason Filley, and he will call you right back."
4. If they speak Spanish, instantly transition into acting as a bilingual translator between them and the agency.

Never break character. You are the ultimate receptionist."""

    # Import raw functions from our tools file and bind them
    import agent_tools

    # LiveKit v0.8+ expects tools to be passed directly as a list
    tools = [
        agent_tools.lookup_billing_balance,
        agent_tools.send_secure_payment_link,
        agent_tools.log_fnol_claim,
        agent_tools.retrieve_auto_id_cards,
        agent_tools.generate_and_send_coi,
        agent_tools.submit_vehicle_endorsement,
        agent_tools.page_on_call_agent
    ]

    # Bind the tools to the Agent wrapper
    agent = Agent(
        instructions=instructions,
        tools=tools
    )

    # Initialize the session with Gemini Flash Native Audio via Vertex AI
    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-live-2.5-flash-native-audio",
            voice="aoede",
            temperature=0.7,
            vertexai=True
        )
    )

    await session.start(room=ctx.room, agent=agent)

    # Configure background thinking audio
    background_audio = BackgroundAudioPlayer(
        thinking_sound=[
            AudioConfig(BuiltinAudioClip.KEYBOARD_TYPING, volume=0.8),
            AudioConfig(BuiltinAudioClip.KEYBOARD_TYPING2, volume=0.7),
        ],
    )
    await background_audio.start(room=ctx.room, agent_session=session)

    # Trigger proactive greeting
    await session.generate_reply(
        instructions=f"Please proactively greet the caller exactly like this: 'Thank you for calling {agency_profile['agency_name']}. This is {agency_profile['agent_name']}, how can I help you today?'"
    )

def shutdown_handler(sig, frame):
    """Gracefully handles SIGINT and SIGTERM to release port 8081 cleanly"""
    logger.info("Received termination signal. Executing graceful shutdown...")
    try:
        loop = asyncio.get_running_loop()
        for task in asyncio.all_tasks(loop=loop):
            task.cancel()
        loop.stop()
    except RuntimeError:
        pass # Loop might already be closed
    sys.exit(0)

if __name__ == "__main__":
    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)

    cli.run_app(
        WorkerOptions(
            agent_name="receptionist-agent",
            entrypoint_fnc=entrypoint,
        )
    )
