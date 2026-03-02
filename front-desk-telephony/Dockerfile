# Use the official Python slim image as a base
FROM python:3.11-slim

# Crucial for Python apps to stream stdout cleanly directly to GCP Logs
ENV PYTHONUNBUFFERED=1

# Set the working directory in the container
WORKDIR /app

# Copy dependency files
# Note: We rely on standard pip to keep the container maximally compatible and simple
# uv generates requirement structures natively via `uv pip compile`
COPY requirements.txt .

# Install dependencies securely
RUN pip install --no-cache-dir -r requirements.txt

# Copy the actual agent codebase
# We only copy the specific receptionist directory and shared tools
COPY ./receptionist /app/receptionist

# Change directory immediately before executing to preserve pathing relative to `agent.py`
WORKDIR /app/receptionist

# Run the livekit agent
CMD ["python", "agent.py", "start"]
