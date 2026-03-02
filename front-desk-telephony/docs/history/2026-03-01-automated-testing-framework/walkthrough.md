# Walkthrough: LiveKit Regression Patch & Pytest Architecture

## Background
During the testing phase of replacing isolated "handoff" agents with the Unified "Receptionist" system, the LiveKit WebRTC backend aggressively threw `AttributeError` and `TypeError` exceptions. The LiveKit v1.x ecosystem heavily modified its syntax logic out of `FunctionContext` base classes and `@llm.ai_callable` decorators in favor of an explicit array of `tools=[ ... ]` populated by `@llm.function_tool` wrappers.

This regression broke our background listener processes entirely, preventing Voice attachment.

## Changes Made
1. **LiveKit Decorator Upgrade**: Refactored the unified `agent_tools.py` namespace to leverage `@llm.function_tool`.
2. **Agent Instantiation Patch**: Updated the core `Agent()` wrapper in `agent.py` to correctly map `tools=[ ... ]` instead of relying on the undocumented and deprecated `fnc_ctx`.
3. **Automated Testing Suite**: Bootstrapped a formal `pytest` and `pytest-asyncio` harness installed via `uv`.
4. **Unit Tests**: Built `test_agent_tools.py` and `test_agent_boot.py` to directly instantiate and interrogate the script tools and configuration parameters on startup without the user needing to hop on the VoIP line to catch Python crash loops.
5. **CI Pipeline**: Generated a `.github/workflows/python-tests.yml` GitHub Actions pipeline. On every commit and PR submitted to the `insure-assist` repository, the `ubuntu-latest` image will clone the repo, instantiate `uv`, run the test scripts, and pass or fail the deployment automatically.
6. **Documentation Capture**: Wrote `livekit-syntax.md` at the workspace root as immutable storage for the functional tool injection context, preserving it against future LLM hallucinations natively.
7. **Rule Compliance**: Instructed `pytest` metrics to export quietly to `front-desk-telephony/artifacts/logs/test_results.log`, preserving the rule to never scatter loose execution artifacts in root domains.

## Testing Verification
`uv run pytest` executed natively in the terminal. The test logs directly caught an unexpected `TypeError: ... unexpected keyword argument 'fnc_ctx'` from the Livekit engine. Following an immediate bug-fix pass over the `agent.py` boot bindings to adhere strictly to `tools=[]`, the test suite was triggered a second time and achieved a **100% test pass rate**, safely connecting tools and bootstrapping the LiveKit Agent instance.

Tests are live on GitHub and monitoring `main` branch activity. The agent python engine no longer throws a `TypeError` on WebRTC connect payload.
