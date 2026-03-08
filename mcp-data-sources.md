# MCP Servers & Data Sources Architecture

This document outlines the architecture and integration strategy for connecting our AI agent (Insure Assist) to our core business data sources using the **Model Context Protocol (MCP)**. 

Using MCP allows us to decouple our AI agent's core LLM logic (Vertex AI / LiveKit) from the specific intricacies, authentication, and API patterns of our backend systems. By deploying dedicated MCP servers, we provide standard, structured, and secure tools for the agent to use during live conversations.

## Target Stack Integrations

1. **Epic (CRM)** - Customer relationship management and policy system of record.
2. **EZlynx Rater** - Comparative rater for generating quotes across multiple carriers.
3. **Canopy Connect** - Insurance data intake platform for collecting current policy information (declarations pages).

---

## What is MCP (Model Context Protocol)?

MCP is an open standard that enables AI models to securely connect to local and remote data sources. It works on a client-server architecture:
- **MCP Client:** Our LiveKit/Vertex AI agent (e.g., the `receptionist` agent).
- **MCP Server:** A lightweight, dedicated microservice that safely exposes specific data and actions from an external system (like Epic or EZlynx) as standard tools to the agent.

### Benefits of MCP for Our Stack
- **Security:** The agent never directly handles API keys or raw CRM credentials (e.g. holding an OAuth secret token). The MCP server acts as an isolation layer.
- **Maintainability:** If EZlynx or Epic changes their API endpoints or schemas, we update the respective MCP server without touching the AI agent's core prompt or logic.
- **Modularity:** We can add new tools (e.g., a billing platform) by spinning up a new MCP server.

---

## 1. CRM - Epic (Applied Systems)

Epic is our system of record. The AI agent needs to read customer context when they call in, and write interaction logs after a call finishes.

### Integration Details
* **Documentation & Developer Portal:** Application developers must use the [Applied Dev Center](https://developer.appliedsystems.com/) and register an application within the Applied Developer Portal.
* **Authentication:** OAuth authentication. Your application registers for a `client_id` and `client_secret` to obtain an access token.
* **API Structure:** RESTful JSON endpoints (transitioning away from their older proprietary SDK methods).
* **Is it MCP-compatible?** **Yes.** A dedicated `epic-mcp` server can handle the OAuth handshake, securely store the tokens in memory, and expose simplified function calls to the AI agent.

### Planned MCP Tools
* `lookup_client_by_phone(phone_number: string)` 
  * **Use Case:** Hits the Epic Contacts REST endpoint to lookup a caller.
* `get_active_policies(client_id: string)`
  * **Use Case:** To answer questions about current coverages, upcoming renewals, or billing status.
* `log_call_interaction(client_id: string, transcript_summary: string, intent: string)`
  * **Use Case:** To maintain compliance and history, the agent logs a summary of conversation into the Epic client's activity/attachment file via their Attachments API.

---

## 2. Rater - EZlynx

EZlynx is used when a prospect calls in to get a new quote, or an existing client wants to shop their auto/home insurance.

### Integration Details
* **Documentation:** Primarily published through Postman collections or their internal developer support (often requiring the "EZLynx Raters API" activation).
* **Authentication:** A two-step process. A `GET {{EZLynxAPIURL}}authenticate` endpoint is called to obtain a time-sensitive `EZToken`. This token must be included in subsequent requests. 
* **API Structure:** RESTful API. Notable endpoints include `Enumerables/v1` (to fetch configuration lists), and endpoints for creating Applicants, Quotes, and Opportunities. They also support webhooks (e.g. `ApplicantCreated`, `PolicyUpdated`) which the MCP server could potentially consume.
* **Is it MCP-compatible?** **Yes.** Because EZlynx requires an `EZToken` that expires after inactivity, an MCP server is actually the **ideal** architecture. The MCP server can automatically check token validity and re-authenticate behind the scenes without the AI model ever knowing or caring about the `EZToken`.

### Planned MCP Tools
* `create_applicant(first_name: string, last_name: string, address: string, ...)`
  * **Use Case:** Starts a new quoting profile in EZlynx. The MCP server translates this into the heavy JSON required by EZlynx.
* `run_comparative_quote(applicant_id: string, line_of_business: string)`
  * **Use Case:** Triggers the rater engine and fetches the top 3 carrier prices.
* `get_quote_status(quote_id: string)`
  * **Use Case:** If a quote takes time to generate, the agent can check the status and inform the user.

---

## 3. Data Intake - Canopy Connect

Canopy Connect speeds up the quoting process by letting users link their current insurance carrier account to instantly share their declarations page, claims history, and driver data.

### Integration Details
* **Documentation & Developer Portal:** Full API reference and Sandbox access at [usecanopy.com/developers](https://usecanopy.com).
* **Authentication:** Standard API Token passed in the header: `Authorization: Bearer <token>`.
* **API Structure:** Beautiful, modern REST API. Known endpoints include:
  * `POST /connect`
  * `POST /consentAndConnect`
  * `GET /household` 
  * `GET /drivingRecordIq`
  * `GET /carriers/:carrierId`
* **Is it MCP-compatible?** **Yes.** It is the easiest of the three. A straightforward Node.js or Python MCP server can be built in hours using their REST endpoints or their official Node/Python SDK wrappers if available.

### Planned MCP Tools
* `generate_intake_link(client_email: string, client_phone: string)`
  * **Use Case:** The agent texts or emails a Canopy Connect link to the caller while on the phone via `POST /connect`.
* `check_intake_status(link_id: string)`
  * **Use Case:** The agent can poll to see if the user has successfully connected their insurance.
* `extract_current_coverages(intake_id: string)`
  * **Use Case:** Uses endpoints like `GET /household` and `GET /propertyData` to allow the AI to read current bodily injury limits, deductibles, and vehicles out loud, then pass them to the EZlynx tools.

---

## Next Steps for Development

1. **Initialize MCP Server Boilerplate:** Determine language (TypeScript or Python) for `epic-mcp`, `ezlynx-mcp`, and `canopy-mcp`.
2. **Setup Dev Environments:**
   - Register for an Applied Systems Dev Center account.
   - Request API access via EZlynx support to get credentials.
   - Spin up a free Developer Sandbox on Canopy Connect.
3. **Draft Exact Schemas:** Build out the `.json` schemas defining the tools parameters so constraints and required fields for each integration are enforced.
4. **Implement LiveKit Connection:** Update `receptionist/agent.py` to point to the local or remote MCP servers via standard protocol.
