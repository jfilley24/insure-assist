import asyncio
import logging
from dotenv import load_dotenv

from google.genai import types
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, Agent, AgentSession
from livekit.plugins import google

load_dotenv()

logger = logging.getLogger("signature-chaser")
logger.setLevel(logging.INFO)

async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()

    instructions = """You are Sarah from Wilcock, Filley and Associates. 
You are an outbound specialist calling to remind a client to sign a critical document.
You are calling on behalf of their agent, Jason Filley. 

### Your Objectives
1. Introduce yourself concisely.
2. Tell them you are calling because we are still waiting for their e-Signature on the UM/UIM Rejection form we sent over last Tuesday.
3. If they say they lost the email, tell them you are hitting a button to resend it to them immediately and wait for them to confirm receipt.
4. Stress the importance that Jason needs this back today to bind the policy properly.
5. Once they agree to sign it, politely thank them and end the call."""

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
        instructions="Please proactively greet the caller exactly like this: 'Hi, this is Sarah with Jason Filley's team at WFA Insurance. I'm calling about an unsigned document we need back from you.'"
    )

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
