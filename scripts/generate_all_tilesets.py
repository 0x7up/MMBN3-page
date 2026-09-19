import os
from PIL import Image, ImageDraw

os.makedirs('public/assets/tilesets', exist_ok=True)

w, h = 64, 32

def is_in_diamond(x, y):
    dx = abs(x - 31.5)
    dy = abs(y - 15.5)
    return (dx / 32.0 + dy / 16.0) <= 1.0

def is_on_diamond_border(x, y):
    dx = abs(x - 31.5)
    dy = abs(y - 15.5)
    d = (dx / 32.0 + dy / 16.0)
    return 0.88 <= d <= 1.0

# Theme color palettes
THEMES = {
    'acdc': {
        'primary': (80, 248, 216, 255),
        'highlight': (192, 248, 232, 255),
        'shadow': (0, 168, 144, 255),
        'skirt_base': (0, 120, 112, 255),
        'skirt_rim': (0, 168, 144, 255),
        'skirt_port': (248, 248, 248, 255),
    },
    'scilab': {
        'primary': (32, 88, 208, 255),
        'highlight': (248, 184, 40, 255), # Orange micro-circuits
        'shadow': (16, 48, 128, 255),
        'skirt_base': (24, 40, 72, 255),
        'skirt_rim': (48, 112, 224, 255),
        'skirt_port': (255, 200, 64, 255),
    },
    'yoka': {
        'primary': (48, 192, 96, 255),
        'highlight': (160, 248, 160, 255),
        'shadow': (20, 120, 52, 255),
        'skirt_base': (16, 80, 36, 255),
        'skirt_rim': (48, 192, 96, 255),
        'skirt_port': (248, 240, 96, 255),
    },
    'beach': {
        'primary': (232, 168, 32, 255),
        'highlight': (255, 236, 176, 255),
        'shadow': (160, 96, 16, 255),
        'skirt_base': (120, 72, 12, 255),
        'skirt_rim': (248, 184, 48, 255),
        'skirt_port': (80, 216, 248, 255),
    },
    'undernet': {
        'primary': (88, 48, 120, 255),
        'highlight': (208, 48, 128, 255),
        'shadow': (44, 20, 68, 255),
        'skirt_base': (32, 14, 48, 255),
        'skirt_rim': (112, 64, 152, 255),
        'skirt_port': (248, 64, 96, 255),
    },
    'secret': {
        'primary': (24, 48, 64, 255),
        'highlight': (64, 255, 240, 255),
        'shadow': (12, 24, 36, 255),
        'skirt_base': (8, 18, 28, 255),
        'skirt_rim': (32, 168, 160, 255),
        'skirt_port': (128, 255, 248, 255),
    }
}

# 6 authentic micro-circuit dot coordinates inside the 64x32 diamond
DOT_COORDS = [
    (24, 12), (32, 10), (40, 12),
    (24, 20), (32, 22), (40, 20)
]

# 1. Generate standard isometric diamond floor tiles for all themes
for name, pal in THEMES.items():
    tile = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            if is_in_diamond(x, y):
                if is_on_diamond_border(x, y):
                    tile.putpixel((x, y), pal['shadow'])
                else:
                    tile.putpixel((x, y), pal['primary'])
    
    # Add authentic dots
    for dx, dy in DOT_COORDS:
        for ox in (0, 1):
            for oy in (0, 1):
                if is_in_diamond(dx + ox, dy + oy):
                    tile.putpixel((dx + ox, dy + oy), pal['highlight'])

    tile.save(f'public/assets/tilesets/{name}_floor.png')

# Also update root public/assets/acdc_floor_tile.png
acdc_tile = Image.open('public/assets/tilesets/acdc_floor.png')
acdc_tile.save('public/assets/acdc_floor_tile.png')

# 2. Special tiles: Ice panel (frictionless slide)
ice_tile = Image.new('RGBA', (w, h), (0, 0, 0, 0))
for y in range(h):
    for x in range(w):
        if is_in_diamond(x, y):
            if is_on_diamond_border(x, y):
                ice_tile.putpixel((x, y), (140, 210, 248, 255))
            else:
                # Specular sheen diagonal
                d = (x + y * 2) / 128.0
                if abs(d - 0.5) < 0.07:
                    ice_tile.putpixel((x, y), (250, 255, 255, 255)) # bright sheen
                else:
                    ice_tile.putpixel((x, y), (180, 235, 255, 240))
ice_tile.save('public/assets/tilesets/special_ice.png')

# Special tiles: Cracked panel
cracked_tile = Image.open('public/assets/tilesets/acdc_floor.png').convert('RGBA')
cdraw = ImageDraw.Draw(cracked_tile)
cdraw.line([(24, 10), (32, 16), (28, 22), (36, 26)], fill=(32, 56, 72, 255), width=1)
cdraw.line([(32, 16), (42, 14), (50, 18)], fill=(32, 56, 72, 255), width=1)
# Ensure transparent mask outside diamond
for y in range(h):
    for x in range(w):
        if not is_in_diamond(x, y):
            cracked_tile.putpixel((x, y), (0, 0, 0, 0))
cracked_tile.save('public/assets/tilesets/special_cracked.png')

# 3. Conveyor panels with arrows aligned PARALLEL to isometric axes:
# In 2:1 isometric:
# E (Down-Right / SE, +gx axis): arrows point along (2, 1) direction
# W (Up-Left / NW, -gx axis): arrows point along (-2, -1) direction
# S (Down-Left / SW, +gy axis): arrows point along (-2, 1) direction
# N (Up-Right / NE, -gy axis): arrows point along (2, -1) direction
conv_configs = {
    'e': { # Down-Right (SE)
        'chevrons': [
            [(20, 10), (36, 18), (28, 22)],
            [(28, 14), (44, 22), (36, 26)]
        ]
    },
    'w': { # Up-Left (NW)
        'chevrons': [
            [(44, 22), (28, 14), (36, 10)],
            [(36, 18), (20, 10), (28, 6)]
        ]
    },
    's': { # Down-Left (SW)
        'chevrons': [
            [(44, 10), (28, 18), (36, 22)],
            [(36, 14), (20, 22), (28, 26)]
        ]
    },
    'n': { # Up-Right (NE)
        'chevrons': [
            [(20, 22), (36, 14), (28, 10)],
            [(28, 18), (44, 10), (36, 6)]
        ]
    }
}

for d_key, cfg in conv_configs.items():
    c_tile = Image.open('public/assets/tilesets/acdc_floor.png').convert('RGBA')
    draw = ImageDraw.Draw(c_tile)
    for pts in cfg['chevrons']:
        draw.line(pts, fill=(255, 140, 0, 255), width=3)
        draw.line(pts, fill=(255, 230, 40, 255), width=1)
    
    # Re-apply strict diamond mask
    for y in range(h):
        for x in range(w):
            if not is_in_diamond(x, y):
                c_tile.putpixel((x, y), (0, 0, 0, 0))
    c_tile.save(f'public/assets/tilesets/special_conveyor_{d_key}.png')

# 4. Skirt tiles (64x48):
# Pure 2:1 isometric diamond top + 3D drop-down cliff edge along SW and SE
for name, pal in THEMES.items():
    floor = Image.open(f'public/assets/tilesets/{name}_floor.png')
    
    # South-West Skirt (drops from (0, 16) to (32, 32))
    skirt_sw = Image.new('RGBA', (64, 48), (0, 0, 0, 0))
    skirt_sw.paste(floor, (0, 0), floor)
    sdraw_sw = ImageDraw.Draw(skirt_sw)
    sw_poly = [(0, 16), (32, 32), (32, 44), (0, 28)]
    sdraw_sw.polygon(sw_poly, fill=pal['skirt_base'])
    sdraw_sw.line([(0, 16), (32, 32)], fill=pal['skirt_rim'], width=2)
    sdraw_sw.line([(0, 28), (32, 44)], fill=pal['skirt_rim'], width=1)
    sdraw_sw.ellipse([(12, 23), (20, 31)], fill=pal['skirt_port'])
    skirt_sw.save(f'public/assets/tilesets/{name}_skirt_sw.png')

    # South-East Skirt (drops from (32, 32) to (64, 16))
    skirt_se = Image.new('RGBA', (64, 48), (0, 0, 0, 0))
    skirt_se.paste(floor, (0, 0), floor)
    sdraw_se = ImageDraw.Draw(skirt_se)
    se_poly = [(32, 32), (64, 16), (64, 28), (32, 44)]
    sdraw_se.polygon(se_poly, fill=pal['skirt_base'])
    sdraw_se.line([(32, 32), (64, 16)], fill=pal['skirt_rim'], width=2)
    sdraw_se.line([(32, 44), (64, 28)], fill=pal['skirt_rim'], width=1)
    sdraw_se.ellipse([(44, 23), (52, 31)], fill=pal['skirt_port'])
    skirt_se.save(f'public/assets/tilesets/{name}_skirt_se.png')

# 5. Props (BBS, Shop, Warp Pad, Beacon, Mystery Data, Mr. Prog)
full_map = Image.open('public/assets/acdc_square_perfect.png').convert('RGBA')

bbs_prop = full_map.crop((540, 6, 655, 82))
bbs_prop.save('public/assets/tilesets/prop_bbs.png')

shop_prop = full_map.crop((145, 145, 245, 235))
shop_prop.save('public/assets/tilesets/prop_shop.png')

warp_prop = full_map.crop((35, 275, 155, 375))
warp_prop.save('public/assets/tilesets/prop_warp_pad.png')

beacon_prop = full_map.crop((75, 240, 135, 290))
beacon_prop.save('public/assets/tilesets/prop_beacon.png')

for m_color, m_name in [((72, 240, 112), 'green'), ((64, 180, 255), 'blue'), ((216, 72, 240), 'purple')]:
    md = Image.new('RGBA', (24, 36), (0, 0, 0, 0))
    mddraw = ImageDraw.Draw(md)
    mddraw.ellipse([(6, 30), (18, 35)], fill=(16, 24, 40, 120))
    pts = [(12, 4), (20, 16), (12, 28), (4, 16)]
    mddraw.polygon(pts, fill=m_color + (240,))
    mddraw.polygon([(12, 4), (4, 16), (12, 28)], fill=(int(m_color[0]*0.7), int(m_color[1]*0.7), int(m_color[2]*0.7), 240))
    mddraw.line([(12, 4), (12, 28)], fill=(255, 255, 255, 220), width=1)
    mddraw.point([(10, 8), (11, 8), (10, 9)], fill=(255, 255, 255, 255))
    md.save(f'public/assets/tilesets/prop_mystery_{m_name}.png')

prog = Image.new('RGBA', (24, 36), (0, 0, 0, 0))
pdraw = ImageDraw.Draw(prog)
pdraw.ellipse([(6, 31), (18, 35)], fill=(16, 24, 40, 130))
pdraw.rectangle([(6, 12), (18, 28)], fill=(248, 224, 48, 255))
pdraw.rectangle([(5, 14), (19, 26)], fill=(248, 224, 48, 255))
pdraw.rectangle([(7, 28), (17, 31)], fill=(200, 48, 48, 255))
pdraw.rectangle([(8, 16), (10, 22)], fill=(32, 40, 72, 255))
pdraw.rectangle([(14, 16), (16, 22)], fill=(32, 40, 72, 255))
pdraw.point([(8, 17), (14, 17)], fill=(255, 255, 255, 255))
pdraw.line([(12, 5), (12, 12)], fill=(180, 180, 190, 255), width=1)
pdraw.ellipse([(10, 2), (14, 6)], fill=(232, 40, 40, 255))
prog.save('public/assets/tilesets/prop_mr_prog.png')

print('Pure 2:1 isometric diamond tilesets and parallel conveyors generated successfully!')
