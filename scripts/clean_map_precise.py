from PIL import Image

def clean_map_precise():
    orig = Image.open('public/assets/acdc_square_map.png').convert('RGBA')
    clean = orig.copy()
    
    # Floor palette colors:
    # (80, 248, 216) -> floor base
    # (72, 240, 200) -> floor light shade
    # (192, 248, 232) -> glowing dot
    # (0, 184, 152) -> grid line
    # (0, 200, 160) -> grid line shade
    floor_colors = {
        (80, 248, 216),
        (72, 240, 200),
        (192, 248, 232),
        (0, 184, 152),
        (0, 200, 160),
    }
    
    # We define NPC search zones where we want to erase non-floor pixels:
    # Each zone has a clean source offset (dx, dy) where dx and dy are multiples of 64 and 32 (or 128)
    # such that (x + dx, y + dy) is clean floor.
    zones = [
        # (min_x, min_y, max_x, max_y, src_dx, src_dy)
        # 1. Purple girl navi in center:
        (280, 180, 315, 255, -64, 32),
        # 2. Mr Prog near top:
        (365, 75, 395, 120, -64, 32),
        # 3. Green navi near top:
        (320, 115, 350, 160, -64, 32),
        # 4. Green navi bottom-center:
        (375, 250, 410, 310, -64, -32),
        # 5. Blue/orange navi bottom:
        (315, 330, 345, 385, -64, -32),
        # 6. Dark orange navi right:
        (480, 230, 515, 285, -64, -32),
        # 7. Green navi upper right bridge area:
        (510, 170, 545, 230, -64, -32),
    ]
    
    for x1, y1, x2, y2, dx, dy in zones:
        for y in range(y1, y2):
            for x in range(x1, x2):
                pix = orig.getpixel((x, y))[:3]
                if pix not in floor_colors:
                    # Sample from source
                    src_pix = orig.getpixel((x + dx, y + dy))
                    clean.putpixel((x, y), src_pix)
                    
    clean.save('public/assets/acdc_square_clean.png')
    print('Cleaned map saved.')

if __name__ == '__main__':
    clean_map_precise()
