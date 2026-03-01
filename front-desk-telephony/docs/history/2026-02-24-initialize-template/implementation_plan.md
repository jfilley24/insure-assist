# Create gcp-project-template Repository

We will create a reusable Git repository to serve as the template for future GCP projects based on the Financial Assistant Template. This will ensure every new project has the rigorous architectural rules and agent instructions ready from day one.

## User Review Required

- **Generalization**: Should `mission.md` and `info.txt` be generalized to remove specific "Financial Assistant Template" terminology, or copied exactly as-is?
- **Additional Files**: Are there any other standard files (like `.gitignore`, `package.json`, or a default `README.md`) that should be included in the template?

## Proposed Changes

We will create a new directory at `c:\Projects\Code4\gcp-project-template` and copy the core architectural files into it.

### gcp-project-template Configuration

#### [NEW] [info.txt](file:///c:/Projects/Code4/gcp-project-template/info.txt)
*Note: We will update `info.txt` to instruct the agent to use the native Antigravity UI (`task.md`, `implementation_plan.md`, `walkthrough.md`) for all planning and progress reporting. It will also instruct the agent to export these final artifacts to `docs/history/` upon task completion.*

#### [NEW] [AGENTS.md](file:///c:/Projects/Code4/gcp-project-template/openspec/AGENTS.md)
*Note: We will also update this to reference native Antigravity plans.*

#### [NEW] [mission.md](file:///c:/Projects/Code4/gcp-project-template/mission.md)

#### [NEW] [README.md](file:///c:/Projects/Code4/gcp-project-template/README.md)
*Note: This will contain instructions on how to use the template for new projects, detailing the `docs/history` workflow and Antigravity UI requirements. It will explicitly include the exact `git clone` command and subsequent setup steps developers need to run to instantiate a new project from this template.*

#### [NEW] [.gitignore](file:///c:/Projects/Code4/gcp-project-template/.gitignore)
*Note: A standard `.gitignore` covering Node modules, Python environments, `.tfstate` files, and local IDE configs.*

## Verification Plan

### Automated Tests
- Run `git status` inside the new folder to verify successful initialization.

### Manual Verification
- Verify the directory structure contains `src/`, `artifacts/logs/`, and `docs/history/`.
- Ensure the initial commit is successfully created with the copied configuration files.
