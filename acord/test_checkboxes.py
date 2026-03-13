import os
from pypdf import PdfReader, PdfWriter

def test_checkboxes():
    template_path = "templates/ACORD 25 COI.pdf"
    
    # Test values
    test_fields = {
        "F[0].P1[0].Vehicle_AnyAutoIndicator_A[0]": "/1", 
        "F[0].P1[0].Vehicle_AllOwnedAutosIndicator_A[0]": "/1",
        "F[0].P1[0].GeneralLiability_CoverageIndicator_A[0]": "/1"
    }
    
    reader = PdfReader(template_path)
    writer = PdfWriter()
    writer.append(reader)
    
    writer.update_page_form_field_values(
        writer.pages[0],
        test_fields,
        auto_regenerate=True
    )
    
    output_path = "test_checkbox.pdf"
    with open(output_path, "wb") as f:
        writer.write(f)
        
    print("Test PDF generated.")

if __name__ == "__main__":
    test_checkboxes()
