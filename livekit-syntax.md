# LiveKit Agents 1.x Syntax Refrence

Due to aggressive package updates from `livekit-agents`, `v0.8+` has deprecated several core structures often hallucinated by LLMs (`FunctionContext`, `ai_callable`). 

This document serves to permanently cache the accurate instantiation logic for future `agent.py` workers.

## Creating Tools

Tools should **not** inherit from a LiveKit wrapper. Rather, they should simply be standard async functions decorated with `@llm.function_tool(description="...")`.

```python
# agent_tools.py
import logging
from typing import Annotated
from livekit.agents import llm

logger = logging.getLogger("agent-tools")

@llm.function_tool(description="Intake a First Notice of Loss (FNOL) emergency claim.")
async def log_fnol_claim(
    incident_type: Annotated[str, "What type of incident occurred (e.g., auto accident, house fire)"],
    incident_location: Annotated[str, "Where it happened"]
) -> str:
    logger.info(f"Logging FNOL Claim -> Type: {incident_type}, Location: {incident_location}")
    return "Claim successfully logged."
```

## Binding Tools & Starting Core Agent

The Agent takes tools via an instantiated `llm.ToolContext` that accepts a flat list of functions.

```python
# agent.py
import asyncio
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, Agent, AgentSession
from livekit.agents import llm
from livekit.plugins import google
import agent_tools 

async def entrypoint(ctx: JobContext):
    
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # 1. Bind tools
    fnc_ctx = llm.ToolContext(tools=[
        agent_tools.log_fnol_claim,
        # ... any other module imports
    ])

    # 2. Start Agent with instructions and tools
    agent = Agent(
        instructions="You are an insurance agent",
        fnc_ctx=fnc_ctx
    )

    # 3. Create Voice/LLM Pipeline
    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-2.5-flash-native-audio",
            voice="Aoede"
        )
    )

    # 4. Bind session
    await session.start(room=ctx.room, agent=agent)

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
```
