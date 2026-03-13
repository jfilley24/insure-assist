from pypdf import PdfReader
reader = PdfReader("test_checkbox.pdf")
fields = reader.get_fields()
for k, v in fields.items():
    if "AutoIndicator" in k or "CoverageIndicator" in k:
        print(f"{k}: {v.get('/V')}")
