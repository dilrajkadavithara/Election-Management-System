import os
from pdf2image import convert_from_path

class PDFProcessor:
    def __init__(self, poppler_path=r"C:\poppler\poppler-25.12.0\Library\bin"):
        self.poppler_path = poppler_path

    def convert_to_images(self, pdf_path, output_dir, dpi=200):
        """
        Converts PDF to images using a memory-efficient chunked approach.
        Instead of loading all pages at once (which causes OOM crashes),
        we process pages in small batches.
        """
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found at {pdf_path}")
            
        os.makedirs(output_dir, exist_ok=True)
        
        from pdf2image import pdfinfo_from_path, convert_from_path
        
        # 1. Get total page count first (lightweight)
        info = pdfinfo_from_path(pdf_path, poppler_path=self.poppler_path)
        total_pages = info["Pages"]
        
        image_paths = []
        BATCH_SIZE = 5 # Process 5 pages at a time to keep RAM low
        
        for start_page in range(1, total_pages + 1, BATCH_SIZE):
            end_page = min(start_page + BATCH_SIZE - 1, total_pages)
            
            # Convert only this chunk
            pages = convert_from_path(
                pdf_path,
                dpi=dpi,
                first_page=start_page,
                last_page=end_page,
                poppler_path=self.poppler_path
            )
            
            for i, page in enumerate(pages):
                page_num = start_page + i
                path = os.path.abspath(os.path.join(output_dir, f"page_{page_num:03d}.png"))
                page.save(path, "PNG")
                image_paths.append(path)
                
                # Explicitly close/delete to free RAM immediately
                page.close()
            
            # Help Garbage Collector
            del pages
            import gc
            gc.collect()
            
        return image_paths
