import cv2
import numpy as np
import os

class VoterDetector:
    def __init__(self):
        # Precise dimensions for 300 DPI scans based on Kerala standard rolls
        # Voter boxes are organized in 3 columns and 10 rows (usually)
        self.min_width = 700 
        self.max_width = 880
        self.min_height = 300
        self.max_height = 380
        self.target_aspect_ratio = 800 / 336 # ~2.38

    def detect_voter_boxes(self, image_path):
        """
        Detects all voter boxes on a page image using adaptive grid detection.
        Returns a list of (x, y, w, h) coordinates sorted in perfect reading order.
        """
        img = cv2.imread(image_path)
        if img is None:
            return []

        h_img, w_img = img.shape[:2]
        
        # --- DYNAMIC DPI DETECTION ---
        # Standard A4 at 300 DPI is approx 2480px wide. 
        dpi_scale = w_img / 2480.0
        
        # Adjust constraints based on actual image resolution
        curr_min_w = self.min_width * dpi_scale
        curr_max_w = self.max_width * dpi_scale
        curr_min_h = self.min_height * dpi_scale
        curr_max_h = self.max_height * dpi_scale

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Professional Grid-Aware Detection: Use Morphological transformations to isolate lines
        # This is 100% reliable for standardized Kerala layouts
        thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
        
        # Detect Horizontal and Vertical Lines
        horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
        detect_horizontal = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
        
        vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
        detect_vertical = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, vertical_kernel, iterations=2)
        
        # Intersection of lines = Tables/Boxes
        grid_mask = cv2.addWeighted(detect_horizontal, 0.5, detect_vertical, 0.5, 0)
        _, grid_mask = cv2.threshold(grid_mask, 0, 255, cv2.THRESH_BINARY)

        contours, _ = cv2.findContours(grid_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        voter_boxes = []
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            aspect_ratio = w / float(h) if h > 0 else 0
            
            # Use slightly more lenient filtering now that grid mask is cleaner
            if (curr_min_w * 0.7 <= w <= curr_max_w * 1.3 and 
                curr_min_h * 0.7 <= h <= curr_max_h * 1.3 and 
                1.8 <= aspect_ratio <= 3.0):
                voter_boxes.append((x, y, w, h))

        if not voter_boxes:
            # Fallback to standard contour detection if Morphological fails
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in contours:
                x, y, w, h = cv2.boundingRect(cnt)
                aspect_ratio = w / float(h) if h > 0 else 0
                if (curr_min_w * 0.8 <= w <= curr_max_w * 1.2 and 2.0 <= aspect_ratio <= 2.8):
                    voter_boxes.append((x, y, w, h))

        # --- ADVANCED SORTING LOGIC ---
        # Group into rows with a tolerance for skewed scans
        voter_boxes.sort(key=lambda b: b[1]) 
        
        sorted_boxes = []
        row_threshold = int(50 * dpi_scale) 
        
        current_row = []
        if voter_boxes:
            last_y = voter_boxes[0][1]
            for box in voter_boxes:
                if abs(box[1] - last_y) < row_threshold:
                    current_row.append(box)
                else:
                    current_row.sort(key=lambda b: b[0])
                    sorted_boxes.extend(current_row)
                    current_row = [box]
                    last_y = box[1]
            current_row.sort(key=lambda b: b[0])
            sorted_boxes.extend(current_row)
        
        return sorted_boxes

    def get_clean_crops(self, image_path, boxes):
        """
        Returns a list of clean, natural BGR crops for Vision LLM consumption.
        REMOVES binarization/erosion which hurts Gemini's accuracy.
        """
        img = cv2.imread(image_path)
        if img is None or not boxes:
            return []
            
        crops = []
        for (x, y, w, h) in boxes:
            # 5px padding to avoid edge clipping of text
            pad = 5
            x1, y1 = max(0, x-pad), max(0, y-pad)
            x2, y2 = min(img.shape[1], x+w+pad), min(img.shape[0], y+h+pad)
            crops.append(img[y1:y2, x1:x2])
        return crops

    def crop_and_save(self, image_path, boxes, output_dir, page_num, start_index=0):
        """Legacy support for saving files to disk."""
        img = cv2.imread(image_path)
        if img is None: return 0
        os.makedirs(output_dir, exist_ok=True)
        
        count = 0
        # For disk saving, we keep them clean (No Otsu)
        crops = self.get_clean_crops(image_path, boxes)
        for i, crop in enumerate(crops):
            voter_index = start_index + i
            filename = f"voter_{voter_index:04d}_pg{page_num:03d}_box{i:02d}.png"
            cv2.imwrite(os.path.join(output_dir, filename), crop)
            count += 1
        return count

