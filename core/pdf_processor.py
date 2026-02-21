import os
from pdf2image import convert_from_path

class PDFProcessor:
    def __init__(self, poppler_path=r"C:\poppler\poppler-25.12.0\Library\bin"):
        self.poppler_path = poppler_path

    def decrypt_if_needed(self, pdf_path, password=None):
        """
        Heals encrypted PDFs so Gemini and Poppler can read them.
        Uses the provided password or falls back to system defaults.
        """
        import pikepdf
        import os
        from dotenv import load_dotenv
        
        load_dotenv()
        passphrase = password or os.getenv("PDF_PASSPHRASE") or os.getenv("DB_PASSWORD") or "Peeku@123"
        
        try:
            # Check if already openable
            with pikepdf.open(pdf_path) as p:
                if not p.is_encrypted:
                    return pdf_path
            
            # If we are here, it might be encrypted or pikepdf wants to be sure
            output_path = pdf_path.replace(".pdf", "_unlocked.pdf")
            with pikepdf.open(pdf_path, password=passphrase) as pdf:
                pdf.save(output_path)
                return output_path
        except pikepdf.PasswordError:
            print(f"❌ PDF Decryption Failed: Invalid Password for {pdf_path}")
            return pdf_path # Fallback to original
        except Exception as e:
            # Not encrypted or other error
            return pdf_path

    def convert_to_images(self, pdf_path, output_dir, dpi=200):
        """
        Converts PDF to images using a memory-efficient chunked approach.
        """
        # Auto-heal if encrypted
        working_pdf = self.decrypt_if_needed(pdf_path)
        
        if not os.path.exists(working_pdf):
            raise FileNotFoundError(f"PDF not found at {working_pdf}")
            
        os.makedirs(output_dir, exist_ok=True)
        
        from pdf2image import pdfinfo_from_path, convert_from_path
        
        info = pdfinfo_from_path(working_pdf, poppler_path=self.poppler_path)
        total_pages = info["Pages"]
        
        image_paths = []
        BATCH_SIZE = 1 
        
        for start_page in range(1, total_pages + 1, BATCH_SIZE):
            end_page = min(start_page + BATCH_SIZE - 1, total_pages)
            
            pages = convert_from_path(
                working_pdf,
                dpi=dpi,
                grayscale=True,
                first_page=start_page,
                last_page=end_page,
                poppler_path=self.poppler_path
            )
            
            for i, page in enumerate(pages):
                page_num = start_page + i
                path = os.path.abspath(os.path.join(output_dir, f"page_{page_num:03d}.png"))
                page.save(path, "PNG")
                image_paths.append(path)
                page.close()
            
            del pages
            import gc
            gc.collect()
            
        return image_paths
