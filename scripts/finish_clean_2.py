from PIL import Image

im = Image.open('public/assets/acdc_square_clean.png').convert('RGBA')

patches = [
    # 1. Purple remnant:
    (285, 170, 306, 202, -64, -32),
    # 2. Antenna remnant:
    (318, 108, 332, 145, 64, 32),
    # 3. Bottom navi:
    (310, 335, 355, 392, -64, -32),
    # 4. Others (orange head):
    (375, 252, 405, 285, -64, -32),
    # 5. Little line at (380, 280):
    (365, 275, 415, 295, -64, -32),
]

floor_colors = {(80, 248, 216), (72, 240, 200), (192, 248, 232), (0, 184, 152), (0, 200, 160)}

for x1, y1, x2, y2, dx, dy in patches:
    for y in range(y1, y2):
        for x in range(x1, x2):
            pix = im.getpixel((x, y))[:3]
            if pix not in floor_colors:
                src_x = x + dx
                src_y = y + dy
                if 0 <= src_x < im.width and 0 <= src_y < im.height:
                    im.putpixel((x, y), im.getpixel((src_x, src_y)))

im.save('public/assets/acdc_square_clean.png')
print('Map cleaned completely!')
