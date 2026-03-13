from pypdf import PdfReader
import sys
import json

reader = PdfReader(sys.argv[1])
fields = reader.get_fields()

output = {}
for k, v in fields.items():
    val = v.get('/V', '')
    if val and val != '' and val != '/0' and val != 'Off':
        output[k] = val

with open("manual_test_fields.json", "w") as f:
    json.dump(output, f, indent=2)
