import json

with open('debug.json', 'r', encoding='utf-8-sig') as f:
    logs = json.load(f)

for l in logs:
    msg = l.get("textPayload", "") or l.get("jsonPayload", {}).get("message", "")
    sev = l.get("severity", "DEFAULT")
    if sev in ["ERROR", "WARNING"] or "fail" in msg.lower() or "error" in msg.lower() or "exception" in msg.lower() or "vertex" in msg.lower() or "gemini" in msg.lower():
        print(f"[{l.get('timestamp')}] [{sev}] {msg}")
