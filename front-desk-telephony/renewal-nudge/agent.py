import asyncio
import logging
from dotenv import load_dotenv

from google.genai import types
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, Agent, AgentSession
from livekit.plugins import google

load_dotenv()

logger = logging.getLogger("renewal-nudge")
logger.setLevel(logging.INFO)

async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()

    # Outbound Specialist Identity
    instructions = """You are Sarah from Wilcock, Filley and Associates. 
You are an outbound specialist calling a client because their Auto Insurance policy relies on a renewal in 45 days.
You are calling on behalf of their agent, Jason Filley. 

### Your Objectives
1. Introduce yourself and explain that their auto policy is renewing soon.
2. Ask if anything major has changed in their life over the last year (e.g., a new driver, a new car, or moving to a new house).
3. If they say NO: Reassure them that Jason will review the rates and send over the renewal paperwork.
4. If they say YES: Ask exactly what changed. Tell them you will pass this information directly to Jason so he can shop the market and make sure they are fully covered.
5. End the call politely. Do NOT offer to look up billing or handle claims. You are strictly calling for this renewal check-in."""

    # Initialize the Agent
    agent = Agent(instructions=instructions)

    # Initialize the session
    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-2.5-flash-native-audio-preview-12-2025",
            voice="Leda",
            temperature=0.7,
            thinking_config=types.ThinkingConfig(include_thoughts=True)
        )
    )

    await session.start(room=ctx.room, agent=agent)

    # Trigger proactive outbound greeting
    await session.generate_reply(
        instructions="Please proactively greet the caller exactly like this: 'Hi there, this is Sarah from WFA Insurance. I'm calling on behalf of Jason Filley regarding your upcoming auto insurance renewal. Do you have a minute to chat?'"
    )

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
