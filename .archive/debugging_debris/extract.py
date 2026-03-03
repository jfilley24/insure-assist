import json
with open('latest_test.json', 'r', encoding='utf-16') as f:
    logs = json.load(f)
res = []
for l in logs:
    msg = l.get('textPayload', '') or l.get('jsonPayload', {}).get('message', '')
    if 'receptionist-agent' in msg or 'worker' in msg or 'plugin' in msg or 'Exception' in msg or 'Error' in msg:
        res.append(msg)
with open('extracted.txt', 'w', encoding='utf-8') as out:
    out.write('\n'.join(res))
