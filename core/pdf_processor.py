import os
import logging
from pdf2image import convert_from_path

logger = logging.getLogger("PDFProcessor")

class PDFProcessor:
    def __init__(self, poppler_path=None):
        # Professional Cross-Platform Path Detection
        # Local Windows defaults to the specific library path
        # Linux Production defaults to system-installed binary
        if not poppler_path:
            if os.name == 'nt': # Windows
                self.poppler_path = r"C:\poppler\poppler-25.12.0\Library\bin"
            else: # Linux/Docker
                self.poppler_path = None # Uses system PATH
        else:
            self.poppler_path = poppler_path

    def convert_to_images(self, pdf_path, output_dir, dpi=300, first_page=None, last_page=None, total_pages_only=False):
        """
        Converts PDF to images using a memory-efficient targeted approach.
        If first_page and last_page are provided, it only converts that range.
        """
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found at {pdf_path}")
            
        from pdf2image import pdfinfo_from_path, convert_from_path
        
        # 1. Get total page count first (lightweight)
        info = pdfinfo_from_path(pdf_path, poppler_path=self.poppler_path)
        total_pages = info["Pages"]
        
        if total_pages_only:
            return total_pages

        os.makedirs(output_dir, exist_ok=True)
        
        # Determine range
        start = first_page if first_page else 1
        end = last_page if last_page else total_pages
        
        image_paths = []
        BATCH_SIZE = 5 # Safe balance: 5x faster than original, but uses half the RAM of the previous speed boost
        
        for start_page in range(start, end + 1, BATCH_SIZE):
            chunk_end = min(start_page + BATCH_SIZE - 1, end)
            
            # PARALLEL RENDER: Use all 8 vCPUs for rendering (Removes the 0% gap)
            pages = convert_from_path(
                pdf_path,
                dpi=dpi,
                grayscale=False, 
                first_page=start_page,
                last_page=chunk_end,
                poppler_path=self.poppler_path,
                thread_count=8 
            )
            
            for i, page in enumerate(pages):
                page_num = start_page + i
                path = os.path.abspath(os.path.join(output_dir, f"page_{page_num:03d}.jpg"))
                page.save(path, "JPEG", quality=95)
                image_paths.append(path)
                page.close()
            
            del pages
            import gc
            gc.collect()
            
        return image_paths
