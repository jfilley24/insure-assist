# Local Deployment & Testing Guide
This document provides the terminal commands and URLs required to test the Insure-Assist prototype applications locally on your machine.

> [!IMPORTANT]
> Both applications require active authentication to Google Cloud to communicate with Vertex AI. Ensure you have run `gcloud auth application-default login` in your terminal prior to starting the servers.

## App 2: Underwriting & Quoting Intelligence
This application acts as an internal tool for agents to extract data from Dec Pages and analyze prospective quotes against the agency's underwriting philosophy.

**How to Launch:**
1. Open a new PowerShell terminal.
2. Navigate to the app directory and activate the virtual environment:
   ```powershell
   cd c:\Projects\Code4\insure-assist\underwriting-and-quoting
   .\venv\Scripts\activate
   ```
3. Start the Streamlit server on port 8501:
   ```powershell
   streamlit run app.py --server.port 8501
   ```

**Local URL:**
👉 [http://localhost:8501](http://localhost:8501)

---

## App 6: Client Self-Service Portal
This application is an external-facing prototype demonstrating how a customer can interact with their specific policy documents via a secure chat interface.

**How to Launch:**
1. Open a second, separate PowerShell terminal.
2. Navigate to the app directory and activate its virtual environment:
   ```powershell
   cd c:\Projects\Code4\insure-assist\client-self-service-portal
   .\venv\Scripts\activate
   ```
3. Start the Streamlit server on port 8502 (to avoid conflicting with the Underwriting app):
   ```powershell
   streamlit run app.py --server.port 8502
   ```

**Local URL:**
👉 [http://localhost:8502](http://localhost:8502)

---

## Running the Automated CI Tests
If you wish to run the automated Python AI testing suites without launching the browser UI, you can run `pytest` natively from within the respective virtual environments.

```powershell
cd c:\Projects\Code4\insure-assist\underwriting-and-quoting
pytest tests\test_app.py -v
```

```powershell
cd c:\Projects\Code4\insure-assist\client-self-service-portal
pytest tests\test_app.py -v
```
