import os
from PIL import Image, ImageDraw

os.makedirs('public/assets/tilesets', exist_ok=True)

# Base template from acdc_floor_tile.png
acdc_base = Image.open('public/assets/acdc_floor_tile.png').convert('RGBA')
w, h = acdc_base.size # 64, 32

# Palette definitions for each of the 6 themes:
# (primary_floor, highlight_dots, shadow_seam, skirt_base, skirt_rim)
THEMES = {
    'acdc': {
        'primary': (80, 248, 216, 255),
        'highlight': (192, 248, 232, 255),
        'shadow': (0, 168, 144, 255),
        'skirt_base': (0, 120, 112, 255),
        'skirt_rim': (0, 168, 144, 255),
        'skirt_port': (248, 248, 248, 255),
        'bg_base': '#202848'
    },
    'scilab': {
        'primary': (32, 88, 208, 255),
        'highlight': (248, 184, 40, 255), # Orange micro-circuits
        'shadow': (16, 48, 128, 255),
        'skirt_base': (24, 40, 72, 255),
        'skirt_rim': (48, 112, 224, 255),
        'skirt_port': (255, 200, 64, 255),
        'bg_base': '#101830'
    },
    'yoka': {
        'primary': (48, 192, 96, 255),
        'highlight': (160, 248, 160, 255),
        'shadow': (20, 120, 52, 255),
        'skirt_base': (16, 80, 36, 255),
        'skirt_rim': (48, 192, 96, 255),
        'skirt_port': (248, 240, 96, 255),
        'bg_base': '#102818'
    },
    'beach': {
        'primary': (232, 168, 32, 255),
        'highlight': (255, 236, 176, 255),
        'shadow': (160, 96, 16, 255),
        'skirt_base': (120, 72, 12, 255),
        'skirt_rim': (248, 184, 48, 255),
        'skirt_port': (80, 216, 248, 255),
        'bg_base': '#382038'
    },
    'undernet': {
        'primary': (88, 48, 120, 255),
        'highlight': (208, 48, 128, 255),
        'shadow': (44, 20, 68, 255),
        'skirt_base': (32, 14, 48, 255),
        'skirt_rim': (112, 64, 152, 255),
        'skirt_port': (248, 64, 96, 255),
        'bg_base': '#180820'
    },
    'secret': {
        'primary': (24, 48, 64, 255),
        'highlight': (64, 255, 240, 255),
        'shadow': (12, 24, 36, 255),
        'skirt_base': (8, 18, 28, 255),
        'skirt_rim': (32, 168, 160, 255),
        'skirt_port': (128, 255, 248, 255),
        'bg_base': '#081018'
    }
}

# 1. Generate standard floor tiles for all themes
for name, pal in THEMES.items():
    tile = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            orig_p = acdc_base.getpixel((x, y))
            if orig_p[3] > 0:
                # Map based on brightness of original pixel
                # acdc_base has:
                # (80, 248, 216) -> primary
                # (192, 248, 232) -> highlight
                # (0, 168, 144) -> shadow
                # (72, 240, 200) -> mid-shadow
                brightness = (orig_p[0] + orig_p[1] + orig_p[2]) / 3.0
                if brightness > 220:
                    tile.putpixel((x, y), pal['highlight'])
                elif brightness > 150:
                    tile.putpixel((x, y), pal['primary'])
                else:
                    tile.putpixel((x, y), pal['shadow'])
    tile.save(f'public/assets/tilesets/{name}_floor.png')

# 2. Special tiles: Ice panel, Cracked panel
ice_tile = Image.new('RGBA', (w, h), (0, 0, 0, 0))
for y in range(h):
    for x in range(w):
        orig_p = acdc_base.getpixel((x, y))
        if orig_p[3] > 0:
            # Diamond coordinate
            # Gradient shine from top-left to bottom-right
            d = (x + y * 2) / 128.0
            if abs(d - 0.5) < 0.08:
                ice_tile.putpixel((x, y), (245, 252, 255, 255)) # specular sheen
            elif y == 0 or y == 31 or x == 0 or x == 63:
                ice_tile.putpixel((x, y), (140, 210, 248, 255))
            else:
                ice_tile.putpixel((x, y), (185, 232, 255, 255))
ice_tile.save('public/assets/tilesets/special_ice.png')

# Cracked panel
cracked_tile = acdc_base.copy()
cdraw = ImageDraw.Draw(cracked_tile)
# Draw crack lines
cdraw.line([(24, 10), (32, 16), (28, 22), (36, 26)], fill=(32, 56, 72, 255), width=1)
cdraw.line([(32, 16), (42, 14), (50, 18)], fill=(32, 56, 72, 255), width=1)
cracked_tile.save('public/assets/tilesets/special_cracked.png')

# 3. Conveyor panels (4 directions: E, W, S, N)
# In screen coords:
# E: moving Down-Right (+X, +Y)
# W: moving Up-Left (-X, -Y)
# S: moving Down-Left (-X, +Y)
# N: moving Up-Right (+X, -Y)
dirs = ['E', 'W', 'S', 'N']
for d in dirs:
    c_tile = acdc_base.copy()
    draw = ImageDraw.Draw(c_tile)
    # Draw animated arrow chevrons
    # Arrow color: bright orange/yellow with dark border
    if d == 'E': # Down-Right (+X, +Y)
        pts = [(24, 10), (38, 17), (24, 24)]
    elif d == 'W': # Up-Left (-X, -Y)
        pts = [(40, 10), (26, 17), (40, 24)]
    elif d == 'S': # Down-Left (-X, +Y)
        pts = [(38, 10), (24, 17), (38, 24)]
    else: # N: Up-Right (+X, -Y)
        pts = [(26, 10), (40, 17), (26, 24)]
    
    draw.line(pts, fill=(255, 140, 0, 255), width=3)
    draw.line(pts, fill=(255, 220, 40, 255), width=1)
    c_tile.save(f'public/assets/tilesets/special_conveyor_{d.lower()}.png')

# 4. Skirt tiles (64x44 - isometric tile top + 3D drop-down skirt)
# Skirts drop down along South-West and South-East edges
for name, pal in THEMES.items():
    skirt_sw = Image.new('RGBA', (64, 48), (0, 0, 0, 0))
    # Top diamond
    floor = Image.open(f'public/assets/tilesets/{name}_floor.png')
    skirt_sw.paste(floor, (0, 0))
    # Side drop: from y=16 to y=44 on left/bottom
    sdraw = ImageDraw.Draw(skirt_sw)
    # Skirt face polygon along SW edge (from (0, 16) to (32, 32))
    skirt_poly = [(0, 16), (32, 32), (32, 44), (0, 28)]
    sdraw.polygon(skirt_poly, fill=pal['skirt_base'])
    sdraw.line([(0, 16), (32, 32)], fill=pal['skirt_rim'], width=2)
    sdraw.line([(0, 28), (32, 44)], fill=pal['skirt_rim'], width=1)
    # Port circle
    sdraw.ellipse([(12, 23), (20, 31)], fill=pal['skirt_port'])
    skirt_sw.save(f'public/assets/tilesets/{name}_skirt_sw.png')

    # Skirt SE edge (from (32, 32) to (64, 16))
    skirt_se = Image.new('RGBA', (64, 48), (0, 0, 0, 0))
    skirt_se.paste(floor, (0, 0))
    sdraw_se = ImageDraw.Draw(skirt_se)
    skirt_poly_se = [(32, 32), (64, 16), (64, 28), (32, 44)]
    sdraw_se.polygon(skirt_poly_se, fill=pal['skirt_base'])
    sdraw_se.line([(32, 32), (64, 16)], fill=pal['skirt_rim'], width=2)
    sdraw_se.line([(32, 44), (64, 28)], fill=pal['skirt_rim'], width=1)
    sdraw_se.ellipse([(44, 23), (52, 31)], fill=pal['skirt_port'])
    skirt_se.save(f'public/assets/tilesets/{name}_skirt_se.png')

# 5. Extract Props from existing game assets:
full_map = Image.open('public/assets/acdc_square_perfect.png').convert('RGBA')

# BBS Console (dual monitors) - crop around (540, 10) to (655, 80)
bbs_prop = full_map.crop((540, 6, 655, 82))
bbs_prop.save('public/assets/tilesets/prop_bbs.png')

# Shop Counter Console (with 2 vendor Navis) - crop around (145, 145) to (245, 235)
shop_prop = full_map.crop((145, 145, 245, 235))
shop_prop.save('public/assets/tilesets/prop_shop.png')

# Warp Pad - crop around (35, 275) to (155, 375)
warp_prop = full_map.crop((35, 275, 155, 375))
warp_prop.save('public/assets/tilesets/prop_warp_pad.png')

# Floating Beacon - crop around (75, 240) to (135, 290)
beacon_prop = full_map.crop((75, 240, 135, 290))
beacon_prop.save('public/assets/tilesets/prop_beacon.png')

# 6. Generate Mystery Data Crystals (Green, Blue, Purple)
# 24x36 floating diamond crystal with retro drop shadow
for m_color, m_name in [((72, 240, 112), 'green'), ((64, 180, 255), 'blue'), ((216, 72, 240), 'purple')]:
    md = Image.new('RGBA', (24, 36), (0, 0, 0, 0))
    mddraw = ImageDraw.Draw(md)
    # Drop shadow
    mddraw.ellipse([(6, 30), (18, 35)], fill=(16, 24, 40, 120))
    # Diamond body
    pts = [(12, 4), (20, 16), (12, 28), (4, 16)]
    mddraw.polygon(pts, fill=m_color + (240,))
    # Left facet darker
    mddraw.polygon([(12, 4), (4, 16), (12, 28)], fill=(int(m_color[0]*0.7), int(m_color[1]*0.7), int(m_color[2]*0.7), 240))
    # Specular shine
    mddraw.line([(12, 4), (12, 28)], fill=(255, 255, 255, 220), width=1)
    mddraw.point([(10, 8), (11, 8), (10, 9)], fill=(255, 255, 255, 255))
    md.save(f'public/assets/tilesets/prop_mystery_{m_name}.png')

# 7. Generate iconic Mr. Prog NPC Sprite
# Mr. Prog has a yellow cylindrical head, red antenna ball, big expressive eyes
prog = Image.new('RGBA', (24, 36), (0, 0, 0, 0))
pdraw = ImageDraw.Draw(prog)
# Drop shadow
pdraw.ellipse([(6, 31), (18, 35)], fill=(16, 24, 40, 130))
# Body / head
pdraw.rectangle([(6, 12), (18, 28)], fill=(248, 224, 48, 255)) # yellow
pdraw.rectangle([(5, 14), (19, 26)], fill=(248, 224, 48, 255))
# Collar / base
pdraw.rectangle([(7, 28), (17, 31)], fill=(200, 48, 48, 255))
# Eyes (big cute oval eyes)
pdraw.rectangle([(8, 16), (10, 22)], fill=(32, 40, 72, 255))
pdraw.rectangle([(14, 16), (16, 22)], fill=(32, 40, 72, 255))
pdraw.point([(8, 17), (14, 17)], fill=(255, 255, 255, 255)) # catchlight
# Antenna
pdraw.line([(12, 5), (12, 12)], fill=(180, 180, 190, 255), width=1)
pdraw.ellipse([(10, 2), (14, 6)], fill=(232, 40, 40, 255)) # red tip
prog.save('public/assets/tilesets/prop_mr_prog.png')

print('All modular tilesets, specials, skirts, and props generated successfully!')
