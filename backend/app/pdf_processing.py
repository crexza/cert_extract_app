import os
import re
import uuid
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
from datetime import datetime

SPLIT_DIR = "/tmp/temp_split_certs"
os.makedirs(SPLIT_DIR, exist_ok=True)

def sanitize_filename(name):
    return re.sub(r'[\\/:"*?<>|]', "_", str(name)).strip()

def preprocess_scraped_text(raw_text):
    if not raw_text:
        return ""
    
    cleaned = re.sub(r'["\r]', '', raw_text)
    cleaned = cleaned.replace('\\"', '"').replace('\\n', '\n')
    cleaned = re.sub(r',\s*\n', '\n', cleaned)
    
    lines = [line.strip() for line in cleaned.split('\n')]
    return '\n'.join([line for line in lines if line.strip()])

def matches_structural_key(text_line):
    sanitized = re.sub(r'\s+', ' ', text_line.strip().lower())
    if re.search(r'\bmodel\b', sanitized): return True
    if re.search(r'\bserial\s+number\b|\bserial\s+no\b', sanitized): return True
    if re.search(r'\bcalibration\s+date\b', sanitized): return True
    if re.search(r'\bdue\s+calibration\b|\bcalibration\s+due\b', sanitized): return True
    if re.search(r'\bcylinder\s+lot\b|\blot\s*#\b', sanitized): return True
    return False

def is_valid_safety_document(text):
    """
    Gatekeeper Check: Checks text to see if it qualifies for processing.
    """
    if not text:
        return False
    normalized = text.lower()
    allowed_keywords = [
        "certificate of calibration", 
        "calibration certificate",
        "eebd inspection", 
        "inspection form", 
        "inspection"
    ]
    return any(keyword in normalized for keyword in allowed_keywords)

def extract_clean_text_with_ocr(file_path):
    page_map = {}
    try:
        doc = fitz.open(file_path)
        for page_idx, page in enumerate(doc):
            pg_num = page_idx + 1
            
            zoom = 2
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)
            
            image_bytes = pix.tobytes("png")
            image = Image.open(io.BytesIO(image_bytes))
            
            raw_joined_text = pytesseract.image_to_string(image) or ""
            
            final_lines = []
            skip_next = False
            lines_array = [l.strip() for l in raw_joined_text.split('\n') if l.strip()]
            
            for i in range(len(lines_array)):
                if skip_next:
                    skip_next = False
                    continue
                
                current_line = lines_array[i]
                is_key = matches_structural_key(current_line)
                
                if is_key and (i + 1) < len(lines_array):
                    next_line = lines_array[i + 1]
                    if not matches_structural_key(next_line):
                        clean_label = current_line.replace(':', '').strip()
                        final_lines.append(f"{clean_label}: {next_line}")
                        skip_next = True
                        continue
                
                final_lines.append(current_line)
                
            page_map[pg_num] = "\n".join(final_lines)
            
    except Exception as e:
        print(f"❌ Direct OCR parsing routine failed: {e}")
    return page_map

def split_pdf_to_pages(original_path):
    compiled_page_paths = []
    try:
        doc = fitz.open(original_path)
        unique_file_token = str(uuid.uuid4())[:8]
        
        for index in range(len(doc)):
            managed_filename = f"split_{unique_file_token}_p{index+1}.pdf"
            secured_export_path = os.path.join(SPLIT_DIR, managed_filename)
            
            new_doc = fitz.open()
            new_doc.insert_pdf(doc, from_page=index, to_page=index)
            new_doc.save(secured_export_path)
            new_doc.close()
            
            compiled_page_paths.append((secured_export_path, index + 1))
        return compiled_page_paths
    except Exception as split_error:
        print(f"❌ Internal process splitter failed: {split_error}")
        return []

def extract_master_text(file_path):
    page_texts = extract_clean_text_with_ocr(file_path)

    for pg_num in page_texts:
        page_texts[pg_num] = preprocess_scraped_text(page_texts[pg_num])
        
        print(f"\n==================================================")
        print(f"   [FINAL SANITIZED TEXT SENT TO AI] PAGE {pg_num}")
        print(f"==================================================")
        print(page_texts[pg_num])
        print(f"==================================================\n")
        
    return page_texts