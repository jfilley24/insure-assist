from pypdf import PdfReader
reader = PdfReader("templates/ACORD 25 COI.pdf")
for page in reader.pages:
    if "/Annots" in page:
        for annot in page["/Annots"]:
            annot_obj = annot.get_object()
            if annot_obj.get("/FT") == "/Btn":
                title = annot_obj.get("/T")
                if title:
                    ap = annot_obj.get("/AP")
                    if ap and "/N" in ap:
                        states = list(ap["/N"].keys())
                        if "Auto" in title or "Indicator" in title:
                            print(f"{title}: ON states = {[s for s in states if s != '/Off']}")
