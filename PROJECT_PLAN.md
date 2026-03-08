# Insure Assist - Master Project Plan

This document serves as the persistent, cross-session source of truth for the ACORD 25 Processing Multi-Agent System implementation phases.

### 1. Broker Portal Hardening [COMPLETED]
- [x] Enforce `isActive` lookup in `broker-portal` Firebase auth triggers or middleware to forcefully bounce logins for deactivated tenants.
- [x] Implement ACORD job suspension checks when a tenant goes Inactive.

### 2. Async Policy Ingestion (Dual-Format AI Extraction) [COMPLETED]
- [x] Build the drag-and-drop Policy Upload UI on the `broker-portal` inside the `[clientId]/page.tsx` view.
- [x] Enable direct-to-GCS (Google Cloud Storage) bucket uploads so Next.js doesn't bottleneck on large PDFs.
- [x] Define the strict JSON response schemas for GL, Auto, Umbrella, and WC that the LLM must conform to.
- [x] Build the background webhook/trigger that passes the GCS URI to Gemini 2.5 Flash to extract both the `key_fields_json` (structured relational data) and `free_form_json` (LLM conversational cache dump) directly into the PostgreSQL `Policy` row.
- [x] **ADDITION**: Build the Policy Management Interface. Flip upload dropzones to a "Manage" state after successful extraction.
- [x] **ADDITION**: Build a Side Sheet JSON Field Editor to let humans review and safely edit the AI-extracted `key_fields_json` before it is used.
- [ ] **UX ADDITION**: Build a Global Notification Queue for document uploads to allow brokers to navigate seamlessly across pages without cancelling the underlying ingestion `fetch`.

### 3. ACORD Generation Engine & API [PENDING]
- [ ] Complete the API logic that accepts natural language constraints via the "Generate Request" button and stitches the `key_fields_json` from the database directly into a filled PDF without forcing the AI to re-read the binary file.
- [ ] Decide if the AI pipeline should live as a separate Python FastAPI server or if it can be securely executed inside Next.js App Router background jobs.

### 4. Infrastructure & Automation [PENDING]
- [ ] Configure Google Cloud Storage Object Lifecycle Management to automatically delete uploaded PDFs after 14 days to minimize storage costs and isolate tenant risk (Docs remain accessible only while needed for AI extraction or manual review).
- [ ] Finalize the setup of the GCP Artifact Registry for Docker images.
- [ ] Set up GitHub Actions CI/CD pipelines targeting isolated GCP projects (Dev, QA, Prod).
- [ ] Configure the Email Listener (Gmail Pub/Sub) to intercept inbound cert requests and hit our generation webhooks.
- [ ] Determine the deployment mechanism to Google Cloud Run (behind Cloudflare/Cloud CDN).

### 5. Security & Compliance [PENDING]
- [ ] Invoke the `security-compliance-compliance-check` skill across our GCP infrastructure design.
- [ ] Resolve any SOC2 gap analysis vulnerabilities identified in the audit.
- [ ] Finalize Application-Layer Encryption implementations for targeted database columns.
