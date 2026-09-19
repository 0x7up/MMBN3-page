from PIL import Image

im = Image.open('public/assets/acdc_square_pristine.png').convert('RGBA')

# Target bounding boxes to clean (x1, y1, x2, y2, src_dx, src_dy):
# 1. Purple girl navi: x=290..315, y=190..252. Clean spot at (-64, 32)
# 2. Top green navi: x=325..345, y=115..155. Clean spot at (64, 32)
# 3. Mr Prog: x=370..395, y=75..120. Clean spot at (64, 32)
# 4. Small head near center right: x=385..405, y=260..280. Clean spot at (-64, -32)
# 5. Blue/orange navi bottom: x=320..345, y=330..385. Clean spot at (-64, -32)
# 6. Green navi near bridge: x=510..535, y=175..205. Clean spot at (-64, -32)

patches = [
    (290, 190, 315, 252, -64, 32),
    (323, 115, 348, 155, 64, 32),
    (370, 75, 395, 120, 64, 32),
    (385, 260, 408, 285, -64, -32),
    (320, 330, 345, 385, -64, -32),
    (512, 175, 532, 205, -64, -32),
]

for x1, y1, x2, y2, dx, dy in patches:
    for y in range(y1, y2):
        for x in range(x1, x2):
            src_x = x + dx
            src_y = y + dy
            # Check if source is valid
            if 0 <= src_x < im.width and 0 <= src_y < im.height:
                im.putpixel((x, y), im.getpixel((src_x, src_y)))

im.save('public/assets/acdc_square_clean.png')
print('Finished clean map saved to public/assets/acdc_square_clean.png')
