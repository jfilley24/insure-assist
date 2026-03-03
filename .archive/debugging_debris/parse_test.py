import json

with open("c:/Projects/Code4/insure-assist/latest_test.json", "r", encoding="utf-16") as f:
    logs = json.load(f)

for l in logs:
    msg = l.get("textPayload", "") or l.get("jsonPayload", {}).get("message", "")
    url = l.get("httpRequest", {}).get("requestUrl", "")
    sev = l.get("severity", "")
    ts = l.get("timestamp", "")
    print(f"[{ts}] [{sev}] {msg} {url}")
