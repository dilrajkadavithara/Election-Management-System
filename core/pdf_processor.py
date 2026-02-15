import os
from pdf2image import convert_from_path

class PDFProcessor:
    def __init__(self, poppler_path=None):
        self.poppler_path = poppler_path or os.getenv('POPPLER_PATH')

    def convert_to_images(self, pdf_path, output_dir, dpi=300):
        """
        Converts each page of a PDF into a PNG image efficiently.
        Streams pages to disk to avoid high RAM usage for large PDFs.
        """
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found at {pdf_path}")
            
        os.makedirs(output_dir, exist_ok=True)
        
        # Stream processing: save directly to disk instead of memory list
        # We use a unique prefix to identify these temp files
        temp_prefix = "temp_page_"
        
        convert_from_path(
            pdf_path,
            dpi=dpi,
            output_folder=output_dir,
            fmt='png',
            output_file=temp_prefix,
            paths_only=True,  # Crucial: Returns paths instead of Image objects
            poppler_path=self.poppler_path
        )
        
        # Now we rename them to our standard format page_001.png
        # pdf2image output format is usually prefix-digit.png
        image_paths = []
        
        # Get all generated files
        generated_files = sorted([
            f for f in os.listdir(output_dir) 
            if f.startswith(temp_prefix) and f.endswith('.png')
        ])
        
        for i, filename in enumerate(generated_files):
            old_path = os.path.join(output_dir, filename)
            new_name = f"page_{str(i+1).zfill(3)}.png"
            new_path = os.path.join(output_dir, new_name)
            
            # Rename to match our expected format
            if os.path.exists(new_path):
                os.remove(new_path)
            os.rename(old_path, new_path)
            
            image_paths.append(os.path.abspath(new_path))
            
        return image_paths
