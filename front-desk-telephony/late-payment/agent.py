import asyncio
import logging
from dotenv import load_dotenv

from google.genai import types
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, Agent, AgentSession
from livekit.plugins import google

load_dotenv()

logger = logging.getLogger("late-payment")
logger.setLevel(logging.INFO)

async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()

    instructions = """You are Sarah from Wilcock, Filley and Associates. 
You are an outbound specialist calling because this client's Home insurance policy is going to cancel for non-payment in 48 hours.
You are calling on behalf of their agent, Jason Filley. 

### Your Objectives
1. Introduce yourself urgently but politely.
2. Explain that their home insurance policy is scheduled to cancel this Thursday due to a missed payment of $124.50.
3. Be highly empathetic. Explain that Jason wanted you to reach out personally to make sure they didn't have a lapse in coverage.
4. Offer to securely text them a payment link right now so they can pay it from their phone.
5. If they accept, say: "I just texted that link. Please take care of that today so we can keep you protected."
6. Say goodbye and end the call."""

    agent = Agent(instructions=instructions)

    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-2.5-flash-native-audio-preview-12-2025",
            voice="Leda",
            temperature=0.6,
            thinking_config=types.ThinkingConfig(include_thoughts=True)
        )
    )

    await session.start(room=ctx.room, agent=agent)

    await session.generate_reply(
        instructions="Please proactively greet the caller exactly like this: 'Hi there, this is Sarah with Jason Filley's agency. I'm calling with an urgent reminder about your home insurance policy.'"
    )

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
