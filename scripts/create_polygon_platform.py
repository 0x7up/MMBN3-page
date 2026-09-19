from PIL import Image, ImageDraw

im = Image.open('public/assets/acdc_square_perfect.png').convert('RGBA')
w, h = im.size

# Draw polygons covering the platform components:
# 1. Main platform:
# Top corner: (395, 68)
# Left corner: (95, 218)
# Bottom rim: down to y=355 at (345, 355), (320, 365)
# Right corner: (635, 205)
# Side skirts extend down ~30px.

mask = Image.new('L', (w, h), 0)
draw = ImageDraw.Draw(mask)

# Main platform polygon (including side rim and skirts)
main_poly = [
    (395, 68),
    (95, 218),
    (95, 255),
    (150, 285),
    (245, 275), # bridge junction
    (245, 315),
    (345, 365),
    (400, 335),
    (635, 215),
    (635, 185),
    (480, 185), # upper bridge junction
    (480, 140),
    (395, 68)
]
draw.polygon(main_poly, fill=255)

# Lower bridge and warp platform:
warp_poly = [
    (245, 275),
    (145, 225),
    (80, 255),
    (0, 295),
    (0, 395),
    (180, 395),
    (210, 350),
    (310, 300),
    (245, 275)
]
draw.polygon(warp_poly, fill=255)

# Upper bridge and BBS platform:
bbs_poly = [
    (480, 185),
    (535, 215),
    (688, 140),
    (688, 0),
    (540, 0),
    (440, 50),
    (480, 185)
]
draw.polygon(bbs_poly, fill=255)

# Apply mask to create 100% clean platform with transparent background
clean_platform = Image.new('RGBA', (w, h), (0, 0, 0, 0))
clean_platform.paste(im, (0, 0), mask)
clean_platform.save('public/assets/acdc_square_platform.png')
print('acdc_square_platform.png saved!')
