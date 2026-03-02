# App 1: Telephony Inbound vs Outbound Architecture

## Overview
Based on architectural discussions, it makes no logical sense to route inbound callers through a labyrinth of disconnected specialist agents (handoffs). An inbound caller expects to speak to a single, capable entity. Conversely, outbound calls are highly predictable, event-driven tasks targeting specific backend workflows.

Therefore, our architecture will cleanly sever **Inbound** and **Outbound** telephony into two distinct paradigms:
1. **The Inbound Omni-Agent:** A single, unified `agent.py` script that acts as the Front-Desk Receptionist. It will be equipped with a robust `FunctionContext` (a library of `@llm.ai_callable` Python tools) allowing it to seamlessly handle FNOL intake, Billing requests, and Policy Endorsements *without ever transferring the call*.
2. **The Outbound Specialists:** A suite of targeted, single-purpose scripts (e.g., `renewal_nudge.py`, `signature_chaser.py`). These will not have complex tool libraries; they will have hyper-focused system prompts designed to be triggered programmatically by backend CRM events (CRON jobs, webhooks).

## Proposed Architecture
We will restructure the `front-desk-telephony` workspace to maintain a clean, flat directory of top-level projects rather than deeply nested folders. The context (inbound vs outbound) will be explicitly defined in each project's documentation.

### The Unified Workspace
- **`receptionist/`**: This is the core Inbound Omni-Agent. It houses the unified `agent.py` and the `agent_tools.py` library to act as the fully capable Front-Desk AI processing all inbound organic calls.
- **`renewal-nudge/`**: An outbound, event-driven specialist agent triggered by the AMS 45 days pre-renewal.
- **`signature-chaser/`**: An outbound, event-driven specialist agent triggered by stale DocuSign webhooks.
- **`late-payment/`**: An outbound, event-driven specialist agent triggered by billing cycle alerts.

## Proposed Changes
1. **Scaffold**: Create the flat directories (`receptionist/`, `renewal-nudge/`, etc.) inside the `front-desk-telephony` root.
2. **Documentation**: Write detailed `README.md` files for each, explicitly defining their trigger mechanism (Organic Inbound Call vs CRON Job/Webhook).
3. **Mock Data Context:** All tools and outbound scripts will continue to simulate API logic by audibly confirming actions taken on behalf of the assigned account manager, **Jason Filley**.
4. **Automated Testing Suite [NEW]:** 
   - Integrate `pytest` and `pytest-asyncio` via `uv` to the `front-desk-telephony` project.
   - Build tests in `front-desk-telephony/tests/` to co-locate code within the active workspace.
   - Validate `agent_tools.py` and `agent.py` to ensure tool decorators and bindings compile gracefully.
   - *Rule Compliance:* Configure `pytest` to output its run logs strictly to `front-desk-telephony/artifacts/logs/test_results.log` to preserve workspace cleanliness.
   - Implement a GitHub Actions pipeline (`.github/workflows/python-tests.yml`).

## Verification Plan
1. **Automated Local Tests:** Run `uv run pytest` to ensure all tool wrappers and agent bootstraps pass without syntax crashes.
2. **CI/CD:** Verify GitHub Actions runs the test suite accurately in the cloud.
