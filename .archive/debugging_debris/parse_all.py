import json
with open('latest_test.json', 'r', encoding='utf-16') as f:
    logs = json.load(f)
    
res = []
for l in logs:
    ts = l.get('timestamp', '')
    if '2026-03-02T21:1' in ts:
        msg = l.get('textPayload', '') or l.get('jsonPayload', {}).get('message', '')
        res.append(f"[{ts}] [{l.get('severity', '')}] {msg}")
with open('c:/Projects/Code4/insure-assist/all_logs.txt', 'w', encoding='utf-8') as out:
    out.write('\n'.join(res))
