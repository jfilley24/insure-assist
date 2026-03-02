# Deploying the Front-Desk Telephony Agent

This agent uses the `livekit-agents` framework with the Gemini 2.5 Flash Native Audio plugin for ultra-low latency telephone conversations.

## Prerequisites
- **Google Cloud SDK** installed and authenticated.
- **Python 3.10+** installed.
- **uv** (Python package manager) installed.
- **LiveKit Cloud** credentials.
- **Telnyx** SIP credentials.

## Daily Authentication Wrapper
Run these commands at the start of your day to ensure your local terminal has the correct GCP permissions for Vertex AI and Secret Manager.

```bash
gcloud config set project insure-assist-dev
gcloud auth login
gcloud auth application-default login --project=insure-assist-dev
```

## Local Testing
To run the agent locally for testing via your laptop microphone (before attaching a phone number):

1. **Navigate to the Project**:
   ```bash
   cd c:\Projects\Code4\insure-assist\front-desk-telephony
   ```

2. **Sync Dependencies**:
   ```bash
   uv sync
   ```

3. **Set Environment Variables**:
   Ensure your `.env` file is populated with your specific keys:
   ```env
   LIVEKIT_URL="wss://your-project.livekit.cloud"
   LIVEKIT_API_KEY="your_api_key"
   LIVEKIT_API_SECRET="your_api_secret"
   GOOGLE_API_KEY="your_gemini_key"
   ```

4. **Run the Agent Worker**:
   ```bash
   uv python run agent.py start
   ```
   *Note: Once running, connect to the LiveKit Sandbox URL in your browser to simulate the phone call interface.*

## Deployment via Enterprise CI/CD
We utilize a strict multi-environment strategy governed by GitHub Actions and GCP Cloud Run. No engineer should manually push containers from their laptop.

### 1. The `development` Branch (Safe Sandbox)
All feature work should branch off of `development`. 
When you push code back to the `development` branch, GitHub Actions will:
1. Run the Pytest suite.
2. Build the Docker container.
3. Deploy strictly to the **`receptionist-dev`** Cloud Run endpoint.

*This endpoint is safe for client demos and internal Sandbox testing without impacting live hospital/agency phone lines.*

### 2. The `main` Branch (Production)
The `main` branch represents the live server mapping to actual Twilio SIP trunks. **You cannot push directly to `main`.**
1. Open a Pull Request from `development` -> `main`.
2. A required code review is enforced.
3. Upon merging, GitHub Actions will package the release and deploy it directly to the **`receptionist-prod`** Cloud Run endpoint.

### Creating the Setup (First Time Only)
To initialize this pipeline securely via Workload Identity Federation (WIF) so that no API keys are stored in GitHub, follow the GCP-Architect setup checklist detailed in `operations.md`.
