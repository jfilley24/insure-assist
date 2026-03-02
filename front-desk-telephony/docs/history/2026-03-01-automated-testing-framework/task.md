# Task Plan

- [x] Rename `app1-front-desk-telephony` folder to `front-desk-telephony`
- [x] Update `rules.md` examples to use the new folder name
- [x] Update `implementation_plan.md` to reflect the new folder name
- [x] Investigate current GCP authenticated account and active project
- [x] Re-authenticate `gcloud` with the correct email (`justin@code4enterprises.com`)
- [x] Create the new GCP project `insure-assist-dev` in `us-central1`
- [x] Connect the local workspace to the new GCP project
- [x] Set Application Default Credentials explicitly for the `insure-assist-dev` project
- [x] Create `deploy.md` for `front-desk-telephony`
- [x] Update `rules.md` and `gcp-architect.md` to mandate `deploy.md` in all projects
- [x] Run the local agent and test via LiveKit Sandbox
- [x] Define the Single-Tenant Shared-Codebase architecture in `rules.md`
- [x] Refactor `agent.py` to use dynamic profile injection for the agency persona
- [x] Upgrade LiveKit Plugin model string from `preview-12-2025` to the stable `gemini-live-2.5-flash-native-audio` release.

### Inbound & Outbound Architecture Restructuring
- [x] Delete `use_cases/` mockup directory
- [x] Create `receptionist/` directory
- [x] Build `receptionist/agent_tools.py` with the `@llm.ai_callable` features
- [x] Build `receptionist/agent.py` as the Unified Front-Desk
- [x] Create `renewal-nudge/` directory and specialized `agent.py`
- [x] Create `signature-chaser/` directory and specialized `agent.py`
- [x] Create `late-payment/` directory and specialized `agent.py`
- [x] Test the unified `receptionist` agent via LiveKit Sandbox

### Automated Testing & CI (Rules Compliant)
- [x] Install `pytest` and `pytest-asyncio` via `uv`
- [x] Build `front-desk-telephony/tests/test_agent_tools.py`
- [x] Build `front-desk-telephony/tests/test_agent_boot.py`
- [x] Initialize GitHub Actions `.github/workflows/python-tests.yml`
