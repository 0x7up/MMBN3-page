from PIL import Image

def clean_map():
    im = Image.open('public/assets/acdc_square_map.png').convert('RGBA')
    
    # Floor tile period: dx=64, dy=32 or dx=64, dy=-32 or dx=128, dy=0
    # Let's inspect NPC locations to clean:
    # 1. Purple girl Navi in center: around x=280..315, y=190..260
    # Can copy from (x - 64, y + 32)
    # 2. Green normal Navi near top: around x=315..355, y=110..160
    # 3. Mr Prog near top right: around x=365..395, y=70..120
    # 4. Green normal Navi near center bottom: around x=375..410, y=250..310
    # 5. Blue orange navi at bottom: around x=315..345, y=330..390
    # 6. Dark orange navi at right: around x=480..515, y=230..290
    # 7. Green normal navi at upper right: around x=510..545, y=170..230
    
    # We can clean them by sampling the corresponding tile offset that has clean floor
    clean_im = im.copy()
    
    # For any pixel on the main platform that is not floor color, dot color, or grid color,
    # or inside known NPC bounding boxes, replace it with the shifted pixel.
    npc_boxes = [
        # (min_x, min_y, max_x, max_y, shift_x, shift_y)
        (280, 190, 320, 260, -64, 32),   # Purple girl navi
        (370, 70, 400, 120, -64, 32),    # Mr Prog
        (315, 110, 355, 160, -64, 32),   # Green navi top
        (370, 250, 415, 315, -64, -32),  # Green navi bottom
        (315, 330, 350, 390, -64, -32),  # Blue/orange navi bottom
        (480, 225, 520, 290, -64, -32),  # Dark orange navi
        (510, 165, 545, 235, -64, -32),  # Green navi upper right
    ]
    
    for x1, y1, x2, y2, sx, sy in npc_boxes:
        for y in range(y1, y2):
            for x in range(x1, x2):
                src_x = x + sx
                src_y = y + sy
                clean_im.putpixel((x, y), im.getpixel((src_x, src_y)))
                
    clean_im.save('public/assets/acdc_square_clean.png')
    print('Saved acdc_square_clean.png')

if __name__ == '__main__':
    clean_map()
