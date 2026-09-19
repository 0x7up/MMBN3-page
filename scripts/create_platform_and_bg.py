from PIL import Image

def process_platform_and_bg():
    im = Image.open('public/assets/acdc_square_perfect.png').convert('RGBA')
    w, h = im.size
    
    # 1. Background image:
    # In orig, crop a representative section of the cyber cubes background (e.g. 240x160)
    orig = Image.open('public/assets/acdc_square_map.png').convert('RGBA')
    bg_tile = orig.crop((0, 0, 240, 160))
    bg_tile.save('public/assets/cyber_bg.png')
    
    # 2. Transparent platform:
    # Use flood fill from corners:
    # Any pixel connected to (0,0) that is background void (32, 40, 72) or cube colors
    platform = im.copy()
    
    # We can flood fill background:
    # The platform has distinct green/cyan/white perimeter edges:
    # (0, 184, 152) -> green edge
    # (248, 248, 248) -> white rim
    # (192, 216, 224) -> light grey rim
    # (112, 136, 160) -> dark rim
    # (240, 96, 144) -> BBS pink frame
    
    visited = set()
    # flood from boundary pixels
    border_pts = []
    for x in range(w):
        border_pts.append((x, 0))
        border_pts.append((x, h-1))
    for y in range(h):
        border_pts.append((0, y))
        border_pts.append((w-1, y))
        
    q = []
    for pt in border_pts:
        pix = im.getpixel(pt)[:3]
        # if not platform
        if pix not in [(80, 248, 216), (0, 184, 152), (248, 248, 248)]:
            q.append(pt)
            visited.add(pt)
            
    # Also manual seed points in known void regions:
    seeds = [(50, 50), (600, 350), (100, 350), (50, 200), (650, 200), (500, 50)]
    for pt in seeds:
        if pt not in visited:
            q.append(pt)
            visited.add(pt)
            
    # A pixel is background if it's the void (32, 40, 72) or part of the cube pattern (orange/purple)
    def is_bg_pixel(c):
        r, g, b = c[:3]
        # void
        if r == 32 and g == 40 and b == 72: return True
        # orange/brown cube
        if r > 120 and g < 150 and b < 50: return True
        # purple cube
        if r in range(70, 130) and g < 30 and b in range(120, 180): return True
        # dark cube outline
        if r in range(40, 90) and g in range(30, 70) and b in range(20, 60): return True
        return False
        
    while q:
        cx, cy = q.pop()
        platform.putpixel((cx, cy), (0, 0, 0, 0))
        for nx, ny in [(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)]:
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                pix = im.getpixel((nx, ny))
                if is_bg_pixel(pix):
                    visited.add((nx, ny))
                    q.append((nx, ny))
                    
    platform.save('public/assets/acdc_square_transparent.png')
    print('Saved acdc_square_transparent.png and cyber_bg.png')

if __name__ == '__main__':
    process_platform_and_bg()
