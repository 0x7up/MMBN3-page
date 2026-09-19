import os
from PIL import Image
import json

def process_megaman():
    im = Image.open('public/assets/megaman_overworld.png').convert('RGBA')
    
    # Idle frames: y=167..206 (height 39)
    # 8 directions: S, SW, W, NW, N, NE, E, SE
    idle_boxes = [(113, 131), (140, 156), (162, 178), (187, 204), (211, 229), (237, 254), (263, 279), (286, 302)]
    
    # Run bands:
    # run1 (y=214..252, h=38): S (0..5), SW (6..11)
    # run2 (y=260..299, h=39): W (0..5), NW (6..11)
    # run3 (y=308..346, h=38): N (0..5), NE (6..11)
    # run4 (y=355..394, h=39): E (0..5), SE (6..11)
    run_bands = [
        (214, 252, ['S', 'SW']),
        (260, 299, ['W', 'NW']),
        (308, 346, ['N', 'NE']),
        (355, 394, ['E', 'SE']),
    ]
    
    # Standard frame size: 36 x 44 (fits all frames with margin, feet anchored at (18, 40))
    FRAME_W = 36
    FRAME_H = 44
    ANCHOR_X = 18
    ANCHOR_Y = 40
    
    # Atlas: 8 directions (rows), 7 frames per direction (col 0 = idle, cols 1..6 = run 1..6)
    # Width = 7 * 36 = 252, Height = 8 * 44 = 352
    atlas = Image.new('RGBA', (7 * FRAME_W, 8 * FRAME_H), (0, 0, 0, 0))
    
    directions = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE']
    sprite_data = {
        'frameWidth': FRAME_W,
        'frameHeight': FRAME_H,
        'anchorX': ANCHOR_X,
        'anchorY': ANCHOR_Y,
        'directions': {}
    }
    
    # 1. Idle frames
    for d_idx, (sx, ex) in enumerate(idle_boxes):
        d_name = directions[d_idx]
        crop = im.crop((sx, 167, ex, 206))
        # Find exact non-alpha bounding box to align feet perfectly
        bbox = crop.getbbox()
        if bbox:
            crop_tight = crop.crop(bbox)
            cw, ch = crop_tight.size
            # Foot bottom aligns at ANCHOR_Y, horizontally centered at ANCHOR_X
            px = 0 * FRAME_W + (ANCHOR_X - cw // 2)
            py = d_idx * FRAME_H + (ANCHOR_Y - ch)
            atlas.paste(crop_tight, (px, py))
    
    # 2. Running frames
    for sy, ey, (d1, d2) in run_bands:
        # Find 12 columns
        cols = []
        in_col = False
        start_x = 0
        for x in range(im.width):
            has_px = any(im.getpixel((x, y))[3] > 10 for y in range(sy, ey))
            if has_px and not in_col:
                in_col = True
                start_x = x
            elif not has_px and in_col:
                in_col = False
                cols.append((start_x, x))
        if in_col:
            cols.append((start_x, im.width))
        
        # First 6 belong to d1, next 6 belong to d2
        d1_cols = cols[:6]
        d2_cols = cols[6:12]
        
        for d_name, col_list in [(d1, d1_cols), (d2, d2_cols)]:
            d_idx = directions.index(d_name)
            for f_idx, (sx, ex) in enumerate(col_list):
                crop = im.crop((sx, sy, ex, ey))
                bbox = crop.getbbox()
                if bbox:
                    crop_tight = crop.crop(bbox)
                    cw, ch = crop_tight.size
                    px = (f_idx + 1) * FRAME_W + (ANCHOR_X - cw // 2)
                    py = d_idx * FRAME_H + (ANCHOR_Y - ch)
                    atlas.paste(crop_tight, (px, py))
    
    for idx, d in enumerate(directions):
        sprite_data['directions'][d] = {
            'row': idx,
            'idleCol': 0,
            'runCols': [1, 2, 3, 4, 5, 6]
        }
    
    atlas.save('public/assets/megaman_atlas.png')
    with open('public/assets/megaman_atlas.json', 'w') as f:
        json.dump(sprite_data, f, indent=2)
    print('MegaMan atlas generated successfully!')

if __name__ == '__main__':
    process_megaman()
