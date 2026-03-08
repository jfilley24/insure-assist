import os
import fitz  # PyMuPDF
from pypdf import PdfReader, PdfWriter

def extract_text_from_pdf(filepath: str) -> str:
    """Extract all text from a PDF file using PyMuPDF."""
    text = ""
    try:
        doc = fitz.open(filepath)
        for page in doc:
            text += page.get_text() + "\n"
        doc.close()
    except Exception as e:
        print(f"Error extracting text from {filepath}: {e}")
    return text.strip()

def fill_acord_25(template_path: str, output_path: str, fields: dict):
    """
    Fills an ACORD 25 PDF template with mapping fields natively using pypdf.
    """
    from pypdf import PdfReader, PdfWriter
    from pypdf.generic import NameObject
    
    try:
        reader = PdfReader(template_path)
        writer = PdfWriter()
        
        # append(reader) copies all pages AND document-level catalog (like /AcroForm)
        writer.append(reader)
        
        # update_page_form_field_values writes our Gemini dict to the interactive visual fields
        if writer.pages:
            writer.update_page_form_field_values(
                writer.pages[0],
                fields,
                auto_regenerate=True # Ask pypdf to regenerate the visual appearance streams
            )
        
        # Ensure the directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Save the filled PDF natively
        with open(output_path, "wb") as output_stream:
            writer.write(output_stream)
            
        print(f"Successfully wrote filled native PDF to {output_path}")
        return True
    except Exception as e:
        print(f"Error filling native PDF {template_path}: {e}")
        return False

# Quick test stub
if __name__ == "__main__":
    pass
