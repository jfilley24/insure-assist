import asyncio
import logging
from dotenv import load_dotenv

from google.genai import types
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, Agent, AgentSession
from livekit.plugins import google

load_dotenv()

# Set up logging for the agent
logger = logging.getLogger("front-desk-agent")
logger.setLevel(logging.INFO)

async def entrypoint(ctx: JobContext):
    """
    The entrypoint for the Voice Agent. 
    This is called every time a new user connects to the LiveKit room.
    """
    logger.info(f"Connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Participant handling: Wait for the user to join the room
    participant = await ctx.wait_for_participant()
    logger.info(f"Starting voice assistant for participant: {participant.identity}")

    # TODO: In production, load this from GCP Firestore based on the GCP Project ID
    agency_profile = {
        "agency_name": "Wilcock, Filley and Associates (WFA Insurance)",
        "agent_name": "Sarah",
        "tone": "professional, empathetic, and knowledgeable",
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

    # Dynamic Instructions for the Persona (Acting as the Knowledge Base)
    instructions = f"""You are {agency_profile['agent_name']}, an AI front-desk receptionist for {agency_profile['agency_name']}.
Your tone must strictly be {agency_profile['tone']}.
Keep your answers extremely concise and conversational, as you are speaking over the phone.
Never use lists, bullet points, or markdown formatting in your responses.

### Agency Knowledge Base
- **About Us**: {agency_profile['about']} (Established {agency_profile['established']})
- **Contact**: Phone: {agency_profile['phone_number']}, Website: {agency_profile['website']}
- **Services Offered**: {', '.join(agency_profile['services'])}
- **Routing/Links**: 
  - To get a quote: {agency_profile['quick_links']['Quote']}
  - To make a payment: {agency_profile['quick_links']['Payment']}
  - To file a claim: {agency_profile['quick_links']['Claims']}

If a customer asks a question you don't know the answer to, politely explain that you can have a licensed agent call them back from {agency_profile['phone_number']}."""

    # 1. Initialize the Base Agent wrapper
    agent = Agent(instructions=instructions)

    # 2. Initialize the Session with Google's Gemini 2.5 Flash Native Audio
    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-2.5-flash-native-audio-preview-12-2025",
            voice="Aoede",
            temperature=0.8,
            thinking_config=types.ThinkingConfig(
                include_thoughts=True,
            ),
        )
    )

    # 3. Start the session and link it to the LiveKit room
    await session.start(
        room=ctx.room,
        agent=agent
    )

    # Begin the conversation proactively once connected
    await session.generate_reply(
        instructions=f"Please begin the interaction by saying exactly: 'Thank you for calling {agency_profile['agency_name']}, how can we serve you today?'"
    )

if __name__ == "__main__":
    # Initialize the LiveKit Worker. 
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
        )
    )
