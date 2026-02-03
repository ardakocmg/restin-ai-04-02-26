"""
OCR Service - Text Extraction from Documents
Supports PDF and Images
"""
import pytesseract
from PIL import Image
import io

try:
    from pdf2image import convert_from_bytes
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    print("Warning: pdf2image not available, PDF OCR disabled")

def extract_text(file_bytes: bytes, mime: str) -> str:
    """
    Extract text from document using OCR
    Returns empty string on failure (fail-safe)
    """
    try:
        text = ""
        
        if mime == "application/pdf" and PDF_SUPPORT:
            # Convert PDF pages to images and OCR each
            pages = convert_from_bytes(file_bytes, dpi=200)
            for page in pages:
                text += pytesseract.image_to_string(page) + "\n"
        
        elif mime.startswith("image/"):
            # Direct image OCR
            img = Image.open(io.BytesIO(file_bytes))
            text = pytesseract.image_to_string(img)
        
        return text.strip()
    
    except Exception as e:
        # Fail-safe: OCR failure should not block upload
        print(f"OCR failed: {e}")
        return ""
