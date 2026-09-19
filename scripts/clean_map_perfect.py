from PIL import Image

def clean_map_perfect():
    orig = Image.open('public/assets/acdc_square_map.png').convert('RGBA')
    clean = orig.copy()
    
    # Palette of clean floor:
    floor_colors = {
        (80, 248, 216),
        (72, 240, 200),
        (192, 248, 232),
        (0, 184, 152),
        (0, 200, 160),
    }
    
    # NPC cleaning targets:
    # (min_x, min_y, max_x, max_y, src_dx, src_dy)
    targets = [
        # Center purple girl navi: sample from clean tile down-left (x - 64, y + 32)
        # Note: head is at y=195, feet at y=250. Clean tile is at (-64, +32) or (-128, 0)
        (280, 190, 315, 255, -128, 0),
        # Green navi bottom-center (around 380, 280): sample from (x - 64, y - 32)
        (370, 250, 415, 315, -64, -32),
        # Blue/orange navi bottom (around 325, 360): sample from (x - 64, y - 32)
        (315, 330, 345, 385, -64, -32),
        # Green navi near top (around 335, 135): sample from (x + 64, y + 32)
        (320, 110, 355, 160, 64, 32),
        # Mr Prog near top right (around 380, 95): sample from (x + 64, y + 32)
        (365, 70, 400, 120, 64, 32),
        # Dark orange navi right (around 495, 260): sample from (x - 64, y - 32)
        (480, 225, 518, 285, -64, -32),
        # Green navi upper right bridge (around 525, 200): sample from (x - 64, y - 32)
        (510, 165, 545, 235, -64, -32),
        # Cleanup any artifacts at (300, 160..180) from earlier attempt:
        (295, 140, 305, 185, -64, 32),
        # Artifact at (410, 375..390):
        (400, 365, 425, 395, -64, -32),
    ]
    
    for x1, y1, x2, y2, dx, dy in targets:
        for y in range(y1, y2):
            for x in range(x1, x2):
                pix = orig.getpixel((x, y))[:3]
                if pix not in floor_colors:
                    src_pix = orig.getpixel((x + dx, y + dy))
                    clean.putpixel((x, y), src_pix)
                    
    # Let's also create a transparent version of the platform:
    # Any pixel that is exactly the dark void background (32, 40, 72) or the background cubes
    # can be separated so the background can animate.
    clean.save('public/assets/acdc_square_clean.png')
    print('Perfect cleaned map saved.')

if __name__ == '__main__':
    clean_map_perfect()
