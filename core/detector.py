import cv2
import numpy as np
import os

class VoterDetector:
    def __init__(self):
        # Precise dimensions for 300 DPI scans based on typical voter lists
        # Typical voter box is approx 790-810px wide and 330-350px high at 300 DPI
        self.min_width = 750
        self.max_width = 850
        self.min_height = 310
        self.max_height = 370
        self.target_aspect_ratio = 800 / 336 # ~2.38

    def detect_voter_boxes(self, image_path):
        """
        Detects all voter boxes on a page image.
        Returns a list of (x, y, w, h) coordinates sorted in reading order.
        """
        img = cv2.imread(image_path)
        if img is None:
            return []

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Use Adaptive Thresholding instead of fixed threshold for better robustness
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 11, 2
        )

        # Detect contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        voter_boxes = []
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            aspect_ratio = w / float(h) if h > 0 else 0
            
            # Filter by specific width, height and aspect ratio constraints
            if (self.min_width <= w <= self.max_width and 
                self.min_height <= h <= self.max_height and 
                2.1 <= aspect_ratio <= 2.6):
                voter_boxes.append((x, y, w, h))

        if not voter_boxes:
            return []

        # Sorting logic: Group into rows first, then sort rows by X
        # Since it's a 3-column layout, we expect Y values to be very similar for boxes in the same row
        voter_boxes.sort(key=lambda b: b[1]) # Sort by Y
        
        sorted_boxes = []
        row_threshold = 40 # Max vertical pixels difference to be in the same row
        
        current_row = []
        if voter_boxes:
            last_y = voter_boxes[0][1]
            for box in voter_boxes:
                if abs(box[1] - last_y) < row_threshold:
                    current_row.append(box)
                else:
                    # Sort the completed row by X coordinate
                    current_row.sort(key=lambda b: b[0])
                    sorted_boxes.extend(current_row)
                    current_row = [box]
                    last_y = box[1]
            
            # Don't forget the last row
            current_row.sort(key=lambda b: b[0])
            sorted_boxes.extend(current_row)
        
        return sorted_boxes

    def crop_and_save(self, image_path, boxes, output_dir, page_num, start_index=0):
        """
        Crops boxes from the image and saves them to the output directory.
        Returns the number of boxes saved.
        """
        img = cv2.imread(image_path)
        if img is None or not boxes:
            return 0
            
        os.makedirs(output_dir, exist_ok=True)
        
        count = 0
        for i, (x, y, w, h) in enumerate(boxes):
            voter_index = start_index + i
            crop = img[y:y+h, x:x+w]
            # Precise naming for traceability
            filename = f"voter_{voter_index:04d}_pg{page_num:03d}_box{i:02d}.png"
            cv2.imwrite(os.path.join(output_dir, filename), crop)
            count += 1
            
        return count
