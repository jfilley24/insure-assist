import asyncio
import logging
from dotenv import load_dotenv

from google.genai import types
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, Agent, AgentSession
from livekit.plugins import google
from agent_tools import AssistantTools

load_dotenv()

logger = logging.getLogger("receptionist")
logger.setLevel(logging.INFO)

async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()

    # Omni-Agent Identity
    instructions = """You are Sarah, the highly capable Receptionist for Wilcock, Filley and Associates (WFA Insurance).
Your tone must be professional, incredibly polite, and highly efficient. You are speaking with a client over the phone, so do not use markdown or bullet points.
You have the power to help the client with almost anything they need without transferring them. The caller's assigned agent is Jason Filley.

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
    from livekit.agents import llm

    # LiveKit v0.8+ expects tools to be injected via an `llm.ToolContext` array:
    fnc_ctx = llm.ToolContext(tools=[
        agent_tools.lookup_billing_balance,
        agent_tools.send_secure_payment_link,
        agent_tools.log_fnol_claim,
        agent_tools.retrieve_auto_id_cards,
        agent_tools.generate_and_send_coi,
        agent_tools.submit_vehicle_endorsement,
        agent_tools.page_on_call_agent
    ])

    # Bind the tools to the Agent wrapper
    agent = Agent(
        instructions=instructions,
        fnc_ctx=fnc_ctx
    )

    # Initialize the session with Gemini Flash Native Audio
    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-2.5-flash-native-audio-preview-12-2025",
            voice="Leda",
            temperature=0.7,
            thinking_config=types.ThinkingConfig(include_thoughts=True)
        )
    )

    await session.start(room=ctx.room, agent=agent)

    # Trigger proactive greeting
    await session.generate_reply(
        instructions="Please proactively greet the caller exactly like this: 'Thank you for calling WFA Insurance. This is Sarah, how can I help you today?'"
    )

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
