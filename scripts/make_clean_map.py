from PIL import Image

# Start fresh from original
orig = Image.open('public/assets/acdc_square_map.png').convert('RGBA')
clean_tile = Image.open('public/assets/acdc_floor_tile.png').convert('RGBA')

# Diamond mask
mask = Image.new('L', (64, 32), 0)
for y in range(32):
    hw = 2 * y if y <= 15 else 2 * (31 - y)
    for x in range(32 - hw, 32 + hw + 1):
        mask.putpixel((x, y), 255)

clean_map = orig.copy()

# The main 7x7 grid:
# sx = 368 + (gx - gy) * 32
# sy = 80 + (gx + gy) * 16
# Let's paste clean_tile on tiles that are pure floor (not ACDC logo, not counter):
# Logo center is at (368, 192), radius ~ 42 in X, 21 in Y.
# Counter is at gx=0..2, gy=5..6.

for gx in range(7):
    for gy in range(7):
        # Skip counter area on left
        if (gx == 0 and gy >= 4) or (gx == 1 and gy >= 5):
            continue
            
        sx = 368 + (gx - gy) * 32
        sy = 80 + (gx + gy) * 16
        tx = sx - 32
        ty = sy
        
        # Paste pixel-by-pixel if outside ACDC3 circular logo
        for py in range(32):
            for px in range(64):
                if mask.getpixel((px, py)) > 0:
                    wx = tx + px
                    wy = ty + py
                    # Elliptical distance to (368, 192) in 2:1 projection
                    dx = wx - 368
                    dy = (wy - 192) * 2
                    if (dx*dx + dy*dy) > 42*42: # outside logo
                        clean_map.putpixel((wx, wy), clean_tile.getpixel((px, py)))

clean_map.save('public/assets/acdc_square_clean.png')
print('Flawless clean map created!')
