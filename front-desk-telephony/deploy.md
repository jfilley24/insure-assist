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

## Deployment via GCP
*(Cloud Run deployment instructions will be populated here once the Docker containerization strategy is finalized.)*
