from paddleocr import PaddleOCR

ocr = PaddleOCR(lang='ml', use_angle_cls=True, show_log=False)

print("\n" + "="*80)
print("FEMALE CARD:")
print("="*80)
result = ocr.ocr('/app/data/voter_crops/0a4d52dd/voter_0000_pg003_box00.png')
for line in result[0]:
    print(line[1][0])

print("\n" + "="*80)
print("MALE CARD:")
print("="*80)
result = ocr.ocr('/app/data/voter_crops/0a4d52dd/voter_0001_pg003_box01.png')
for line in result[0]:
    print(line[1][0])
