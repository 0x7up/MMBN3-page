from PIL import Image

def build_pristine_platform():
    orig = Image.open('public/assets/acdc_square_map.png').convert('RGBA')
    clean_tile = Image.open('public/assets/acdc_floor_tile.png').convert('RGBA')
    
    # Create diamond mask for 64x32
    mask = Image.new('L', (64, 32), 0)
    for y in range(32):
        if y <= 15:
            hw = 2 * y
        else:
            hw = 2 * (31 - y)
        for x in range(32 - hw, 32 + hw + 1):
            mask.putpixel((x, y), 255)
            
    res = orig.copy()
    
    # Clean specific tiles on 7x7 grid:
    # ACDC logo is at center: (2, 3), (3, 2), (3, 3), (4, 3), (3, 4) - we protect (3, 3) and its immediate logo circle!
    # Let's clean tiles that had NPCs and their heads:
    clean_coords = [
        # Top Navis (green navi and Mr Prog):
        (2, 0), (3, 0), (4, 0), (5, 0),
        (2, 1), (3, 1), (4, 1), (5, 1),
        
        # Center purple girl navi:
        (1, 2), (1, 3), (2, 2),
        
        # Right Navis (orange and green):
        (5, 2), (6, 2), (5, 3), (6, 3), (5, 4), (6, 4), (5, 5), (6, 5),
        
        # Bottom-center green navi:
        (4, 3), (4, 4), (5, 4),
        
        # Bottom blue/orange navi:
        (2, 6), (3, 6), (4, 6), (2, 5), (3, 5),
    ]
    
    for gx, gy in clean_coords:
        # Don't overwrite the ACDC3 circular logo center
        # Logo center is at (368, 192), radius ~ 35
        sx = 368 + (gx - gy) * 32
        sy = 80 + (gx + gy) * 16
        x = sx - 32
        y = sy
        
        # For tiles near the logo, only paste where not touching the logo
        if (gx, gy) in [(3, 2), (2, 3), (4, 3), (3, 4)]:
            # Check pixel by pixel
            for ty in range(32):
                for tx in range(64):
                    if mask.getpixel((tx, ty)) > 0:
                        px = x + tx
                        py = y + ty
                        # Distance to logo center (368, 192)
                        dist = ((px - 368)**2 + ((py - 192)*2)**2)**0.5
                        if dist > 68: # outside logo
                            res.putpixel((px, py), clean_tile.getpixel((tx, ty)))
        else:
            res.paste(clean_tile, (x, y), mask)
            
    res.save('public/assets/acdc_square_pristine.png')
    print('Updated pristine map.')

if __name__ == '__main__':
    build_pristine_platform()
