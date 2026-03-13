# Insure Assist - Master Project Plan

This document serves as the persistent, cross-session source of truth for the ACORD 25 Processing Multi-Agent System implementation phases.

> [!IMPORTANT]
> **CORE BUSINESS RULE: LATEST POLICY ONLY**
> When evaluating client policies for *any* global alerting (Expirations, Missing Fields, Compliance), the system MUST strictly filter its queries to evaluate **only the single most recently uploaded document** for a given `clientId` + `fileType` combination (e.g. the newest Auto policy). Historic policies are retained for audit trails but must be excluded from active workflow alerts to prevent false positives.

### 1. Broker Portal Hardening [COMPLETED]
- [x] Enforce `isActive` lookup in `broker-portal` Firebase auth triggers or middleware to forcefully bounce logins for deactivated tenants.
- [x] Implement ACORD job suspension checks when a tenant goes Inactive.

### 2. Async Policy Ingestion (Dual-Format AI Extraction) [COMPLETED]
- [x] Build the drag-and-drop Policy Upload UI on the `broker-portal` inside the `[clientId]/page.tsx` view.
- [x] Enable direct-to-GCS (Google Cloud Storage) bucket uploads so Next.js doesn't bottleneck on large PDFs.
- [x] Define the strict JSON response schemas for GL, Auto, Umbrella, and WC that the LLM must conform to.
- [x] Build the background webhook/trigger that passes the GCS URI to Gemini 2.5 Flash to extract both the `acord_fields_json` (structured relational data) and `free_form_json` (LLM conversational cache dump) directly into the PostgreSQL `Policy` row.
- [x] **ADDITION**: Build the Policy Management Interface. Flip upload dropzones to a "Manage" state after successful extraction.
- [x] **ADDITION**: Build a Side Sheet JSON Field Editor to let humans review and safely edit the AI-extracted `acord_fields_json` before it is used.
- [x] **UX ADDITION**: Build a Global Notification Queue for document uploads to allow brokers to navigate seamlessly across pages without cancelling the underlying ingestion `fetch`.

### 3. ACORD Generation Engine & API [COMPLETED]
- [x] Complete the API logic that accepts natural language constraints via the "Generate Request" button and stitches the `acord_fields_json` from the database directly into a filled PDF without forcing the AI to re-read the binary file.
- [x] Build out the FastAPI Python integration and separate the orchestration logic safely from the Next.js frontend frontend.
- [x] Build the frontend UI so users can view request history, status screens (Pass/Fail), and download the native generated documents that are hosted in GCP.

### 4. Infrastructure & Automation [PENDING]
- [ ] Configure Google Cloud Storage Object Lifecycle Management to automatically delete uploaded PDFs after 14 days to minimize storage costs and isolate tenant risk (Docs remain accessible only while needed for AI extraction or manual review).
- [ ] Finalize the setup of the GCP Artifact Registry for Docker images.
- [ ] Set up GitHub Actions CI/CD pipelines targeting isolated GCP projects (Dev, QA, Prod).
- [ ] Configure the Email Listener (Gmail Pub/Sub) to intercept inbound cert requests at `acord25@brokerdomain.com`, funnel webhooks to our API, and fully automate the COI generation and auto-dispatch reply sequence.
- [ ] Determine the deployment mechanism to Google Cloud Run and finalize the Edge/WAF strategy.
    - *Decision Point*: **The "Google Native" Route (CDN +Cloud Load Balancer + Cloud Armor)**. High Security, seamless logs. Cons: $25-$30/mo base cost minimum, complex config.
    - *Decision Point*: **The "Cloudflare Proxy" Route**. Cheaper ($0-$20/mo), easier unified dashboard with marketing. Cons: Requires custom header checks or Authenticated Origin Pulls on Cloud Run to prevent bypass.

### 5. Security & Compliance [PENDING]
- [ ] Invoke the `security-compliance-compliance-check` skill across our GCP infrastructure design.
- [ ] Resolve any SOC2 gap analysis vulnerabilities identified in the audit.
- [ ] Finalize Application-Layer Encryption implementations for targeted database columns.
- [ ] Implement True Database-Level Role Level Security (RLS) on the production PostgreSQL database using `SET SESSION` variables to act as a Defense-in-Depth layer protecting the primary Prisma Application-Level logic.
- [ ] Implement robust session management (Sliding Window/Absolute Timeout) and an auto-logout script for the Broker Portal to prevent unauthorized access from abandoned sessions.

### 6. Dashboard Enhancements [COMPLETED]
- [x] Add a quick-view table for "Expired Policies", listing client info, policy type, and expiration date with clickable rows to navigate directly to the specific client's policy manager.
- [x] Add a quick-view table for "Policies Needing Review" (policies with unconfirmed null/missing fields), listing client info and missing field counts with clickable rows to navigate directly to the specific client's policy manager to fix them.
- [x] Build "Recent COI Requests" real-time widget on the Dashboard.
- [x] Build "Top Cards & Analytics" with metrics counting total clients, active policies, etc.
- [x] Add interactive Line Graph with Recharts trailing 30 days of COI requests.

### 7. Automated Quality Assurance [PARTIALLY COMPLETED]
- [x] Build automated "PDF Regression Tests" via a GitHub Actions CI pipeline (`pr-checks.yml`) that mocks API behavior and verifies deterministic PDF generation without burning Gemini API credits.
- [x] Configure standard Git Workflow requiring Pull Requests to `development` to strictly gate deployments behind passing CI tests.
- [ ] Install and configure `Playwright` to run End-to-End browser UI tests on Next.js to mathematically guarantee regressions do not break core portal functionality.
- [ ] Configure Git `husky` Pre-commit Hooks to block failing commits from reaching production.

### 8. Marketing Site & Subscriptions [DEFERRED]
- [ ] Build a public-facing Marketing Site (potentially leveraging Cloudflare Pages/Workers for speed and edge caching).
- [ ] Integrate Stripe Billing to handle SaaS subscription tiers, automated invoicing, and trial management for brokers signing up for the platform.

### 9. User Management & Identity [COMPLETED]
- [x] Define a canonical User identity strategy using a **Shadow `User` Table in Postgres**.
    - **Architecture Decision:** We will store `firstName`, `lastName`, `role`, and `brokerId` in a Prisma `User` model where the `id` Primary Key perfectly matches the Firebase UID. 
    - **Why:** Relying solely on Firebase Custom Claims blobs the JWT tokens and prevents us from doing native SQL `JOIN`s (e.g. joining a User's name to a `COIRequest` record).
    - **Workflow:** When an Admin invites a user, the API automatically generates the Firebase Auth record, grabs the UID, and inserts the profile data into our Postgres `User` table.
- [x] Update the `cOIRequest` generating logic so that the `requestedBy` column accurately saves the actual user's First & Last Name instead of the generic "Broker Portal Agent" string.
- [x] Build a "Team Settings" view in the Broker Portal, allowing local Broker Admins to invite, manage, and revoke access for their own internal Agents.
- [x] **ADDITION**: Implement `agentId` mapping and RBAC controls for the Dashboard. Agents only see their assigned Clients and their metrics, while Broker Admins maintain a unified tenant-wide view.
- [x] **ADDITION**: Dynamically control Client UI creation and deletion functions, preventing assigned Agents from modifying or deleting root client structures.
- [x] **ADDITION**: Auto-assign newly created clients to the initiating Agent. Provide a dropdown selector for Broker Admins to explicitly allocate a Client to a specific system Agent.

### 10. Compliance & System Tracking [PENDING]
- [ ] Build a System-Wide Audit Log view for `BROKER_ADMIN` roles. This module will track all major system events (logins, document uploads, document deletions, COI generations, field edits, and email dispatches) across all users within their tenant, providing a granular, chronological paper trail of activity.
