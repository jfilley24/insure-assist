---
description: "Invokes the Principal GCP Architect to design solutions and autonomously select the best implementation skills from your library."
---

# GCP-Architect (Insure-Assist)

## Step 1: Context Injection & Repository Audit
1. **Load Context**: Read `mission.md`, `.agent/rules/rules.md`, and `openspec/AGENTS.md`.
2. **Global Scan**: Perform a scan of the workspace to map the current state of Next.js components, Python backend scripts, and GCP cloud configurations.
3. **Deep-Think Reasoning**: Use a `<thought>` block to analyze the request. 
    - Determine the best language/tool for the job (TypeScript for UI, Python for AI/Voice/Telephony, Go for scraping).
    - Evaluate GCP security (IAM, Secret Manager, HIPAA/SOC2 compliance) and cost implications.
4. **Skill Discovery**: Scan `~/.gemini/antigravity/skills/` for relevant tools (e.g., LiveKit, Gemini API, GCP Cloud Run, Web RTC).

## Step 2: Specification & The OpenSpec Protocol
1. **Proposal Generation**: Invoke the `concise-planning` skill to build a technical roadmap.
2. **Create Artifact**: Save the roadmap to `<active-project>/artifacts/plans/plan_[timestamp].md` or use the Antigravity artifact system (`implementation_plan.md`), routing to the active project's directory. 
    - **MUST INCLUDE**: Proposed language, architectural changes, MCP connections, and impacted GCP resources.
3. **User Confirmation**: Present the plan to the user. **HALT** until the user provides explicit approval. This is the core OpenSpec "Gate."

## Step 3: Autonomous Implementation (Auto-Mode)
1. **Chain Execution**: Once approved, execute the identified skills in sequence.
2. **Proceed Automatically**: Do not ask for permission between skills unless:
    - A critical error occurs.
    - A budget-impacting decision is required.
    - An external API key or variable is missing from the environment.
3. **Code Quality**: Adhere to the standards in `rules.md` (Security first, no hardcoded API keys, strict project isolation).

## Step 4: Verification, Logging & Evidence
1. **Automated Testing**: Run the appropriate test suite for the language used.
2. **Security Audit**: Automatically run `security-audit` or `testing-qa` skills.
3. **Deployment Documentation**: Generate or update the `<active-project>/deploy.md` file confirming the daily auth steps, local runner commands, and deployment strategy are accurate.
4. **Capture Evidence**: Save all terminal output and deployment confirmations to `<active-project>/artifacts/logs/`.
5. **Mission Closeout**: Provide a final summary of changes (`walkthrough.md` saved in the active project) and verify alignment with `mission.md`.

---
**Next Step:** "GCP-Architect is fully initialized and synced with rules.md. Should I conduct a repository audit and generate an OpenSpec plan for your current task?"
