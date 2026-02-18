from paddleocr import PaddleOCR
import sys

# Initialize OCR
ocr = PaddleOCR(lang='ml', use_angle_cls=True, show_log=False)

# Process female sample
print("\n" + "="*80)
print("FEMALE CARD OCR OUTPUT:")
print("="*80)
result = ocr.ocr('female_sample.png')
for line in result[0]:
    print(line[1][0])
print("="*80)

# Process male sample for comparison
print("\n" + "="*80)
print("MALE CARD OCR OUTPUT:")
print("="*80)
result = ocr.ocr('male_sample.png')
for line in result[0]:
    print(line[1][0])
print("="*80)
