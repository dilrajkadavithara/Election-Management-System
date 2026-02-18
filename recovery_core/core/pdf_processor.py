import os
from pdf2image import convert_from_path

class PDFProcessor:
    def __init__(self, poppler_path=r"C:\poppler\poppler-25.12.0\Library\bin"):
        self.poppler_path = poppler_path

    def convert_to_images(self, pdf_path, output_dir, dpi=300):
        """
        Converts each page of a PDF into a PNG image.
        Returns a list of absolute paths to the generated images.
        """
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found at {pdf_path}")
            
        os.makedirs(output_dir, exist_ok=True)
        
        # Convert PDF to images
        pages = convert_from_path(
            pdf_path,
            dpi=dpi,
            poppler_path=self.poppler_path
        )
        
        image_paths = []
        for i, page in enumerate(pages, start=1):
            path = os.path.abspath(os.path.join(output_dir, f"page_{i:03d}.png"))
            page.save(path, "PNG")
            image_paths.append(path)
            
        return image_paths
