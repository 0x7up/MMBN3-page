from PIL import Image

orig = Image.open('public/assets/acdc_square_map.png').convert('RGBA')
clean_tile = Image.open('public/assets/acdc_floor_tile.png').convert('RGBA')

# Diamond mask
mask = Image.new('L', (64, 32), 0)
for y in range(32):
    hw = 2 * y if y <= 15 else 2 * (31 - y)
    for x in range(32 - hw, 32 + hw + 1):
        mask.putpixel((x, y), 255)

result = orig.copy()

# 1. Tile the main 7x7 grid
for gx in range(7):
    for gy in range(7):
        # Skip counter
        if (gx == 0 and gy >= 4) or (gx == 1 and gy >= 5):
            continue
            
        sx = 368 + (gx - gy) * 32
        sy = 80 + (gx + gy) * 16
        tx = sx - 32
        ty = sy
        
        for py in range(32):
            for px in range(64):
                if mask.getpixel((px, py)) > 0:
                    wx = tx + px
                    wy = ty + py
                    # Elliptical distance to logo center (345, 197)
                    dx = wx - 345
                    dy = (wy - 197) * 2
                    if (dx*dx + dy*dy) > 37*37:
                        result.putpixel((wx, wy), clean_tile.getpixel((px, py)))

# 2. Re-paste the pristine ACDC3 logo
logo_crop = orig.crop((308, 178, 382, 218))
result.paste(logo_crop, (308, 178))

# 3. Clean remaining Navis outside the main grid:
# - Bottom blue/orange navi: x=315..345, y=330..388 -> sample from (x - 64, y - 32)
for y in range(330, 390):
    for x in range(315, 345):
        # Clean tile is at x-64, y-32 or x, y-64
        src_x = x - 64
        src_y = y - 32
        if 0 <= src_x < orig.width and 0 <= src_y < orig.height:
            result.putpixel((x, y), result.getpixel((src_x, src_y)))

# - Top Mr Prog: x=365..395, y=70..115 -> sample from (x - 64, y + 32)
for y in range(70, 115):
    for x in range(365, 395):
        src_x = x - 64
        src_y = y + 32
        if 0 <= src_x < orig.width and 0 <= src_y < orig.height:
            result.putpixel((x, y), result.getpixel((src_x, src_y)))

# - Green navi near bridge: x=510..535, y=175..205 -> sample from (x - 64, y - 32)
for y in range(175, 205):
    for x in range(510, 535):
        src_x = x - 64
        src_y = y - 32
        if 0 <= src_x < orig.width and 0 <= src_y < orig.height:
            result.putpixel((x, y), result.getpixel((src_x, src_y)))

result.save('public/assets/acdc_square_perfect.png')
print('acdc_square_perfect.png created!')
