import json
from pypdf import PdfReader

reader = PdfReader('templates/ACORD 25 COI.pdf')
fields = reader.get_fields()

with open('pdf_fields.json', 'w') as f:
    json.dump({k: v.get('/V', '') if isinstance(v, dict) else '' for k, v in fields.items()}, f, indent=2)

print("Fields dumped to pdf_fields.json")
