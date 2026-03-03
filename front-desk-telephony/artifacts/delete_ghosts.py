import asyncio
import os
from livekit import api

async def main():
    # Initialize the LiveKit API
    # Assumes LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET are set in the environment
    lkapi = api.LiveKitAPI()
    try:
        # We target the specific ghost worker ID the user identified
        target_id = "AW_mNoihdc3kFYx"
        print(f"Attempting to delete specific agent dispatch: {target_id}")
        await lkapi.agent_dispatch.delete_dispatch(api.DeleteAgentDispatchRequest(dispatch_id=target_id))
        print(f"Successfully deleted {target_id}")
    except Exception as e:
        print(f"Failed to delete specifically {target_id}. It might have already timed out or be invalid: {e}")

    try:
        # Also clean up the other known ghost
        target_id2 = "AW_AV6WM3PXVG5V"
        print(f"Attempting to delete specific agent dispatch: {target_id2}")
        await lkapi.agent_dispatch.delete_dispatch(api.DeleteAgentDispatchRequest(dispatch_id=target_id2))
        print(f"Successfully deleted {target_id2}")
    except Exception as e:
        print(f"Failed to delete specifically {target_id2}: {e}")
        
    finally:
        await lkapi.aclose()

if __name__ == "__main__":
    asyncio.run(main())
