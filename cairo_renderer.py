# cairo_renderer.py
# MODULE 9: Cairo Renderer (Offline)
# Recreate stroke PNGs in training-quality using Cairo.




import cairo
import math
import json
import numpy as np
from PIL import Image, ImageFilter

WIDTH, HEIGHT = 2048, 2048
OUTPUT_WIDTH, OUTPUT_HEIGHT = 256, 256

# ---------- Helper Functions ----------

def densify(points, num_points=60):
    if len(points) < 2:
        return points
    xs = [p['x'] for p in points]
    ys = [p['y'] for p in points]
    ts = np.linspace(0, 1, len(points))
    interp_t = np.linspace(0, 1, num_points)
    interp_x = np.interp(interp_t, ts, xs)
    interp_y = np.interp(interp_t, ts, ys)
    return [{'x': x, 'y': y, **{k: v for k, v in points[0].items() if k not in ['x', 'y']}} for x, y in zip(interp_x, interp_y)]

def catmull_rom_to_bezier(points):
    if len(points) < 2:
        return []
    extended = [
        {'x': 2 * points[0]['x'] - points[1]['x'], 'y': 2 * points[0]['y'] - points[1]['y'], **{k: v for k, v in points[0].items() if k not in ['x', 'y']}}
    ] + points + [
        {'x': 2 * points[-1]['x'] - points[-2]['x'], 'y': 2 * points[-1]['y'] - points[-2]['y'], **{k: v for k, v in points[-1].items() if k not in ['x', 'y']}}
    ]
    beziers = []
    for i in range(1, len(extended) - 2):
        p0 = extended[i - 1]
        p1 = extended[i]
        p2 = extended[i + 1]
        p3 = extended[i + 2]
        c1 = (
            p1['x'] + (p2['x'] - p0['x']) / 6,
            p1['y'] + (p2['y'] - p0['y']) / 6
        )
        c2 = (
            p2['x'] - (p3['x'] - p1['x']) / 6,
            p2['y'] - (p3['y'] - p1['y']) / 6
        )
        beziers.append((p1, c1, c2, p2))
    return beziers

def scale_points(points, width, height, padding=0.1):
    xs = [p['x'] for p in points]
    ys = [p['y'] for p in points]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    scale = min(
        (width * (1 - 2 * padding)) / (max_x - min_x + 1e-5),
        (height * (1 - 2 * padding)) / (max_y - min_y + 1e-5)
    )
    offset_x = width * padding - min_x * scale
    offset_y = height * padding - min_y * scale
    return [
        {'x': p['x'] * scale + offset_x, 'y': p['y'] * scale + offset_y, **{k: v for k, v in p.items() if k not in ['x', 'y']}}
        for p in points
    ]

# ---------- Main Rendering ----------

def render_strokes_to_png(json_path, png_path, base_width=6, ink_color=(0, 0, 0), bg_color=(1, 1, 1), svg_path=None):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    surface = cairo.ImageSurface(cairo.FORMAT_RGB24, WIDTH, HEIGHT)
    ctx = cairo.Context(surface)
    ctx.set_source_rgb(*bg_color)
    ctx.paint()
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)

    for stroke in data['strokes']:
        if len(stroke['points']) < 2:
            continue
        points = scale_points(densify(stroke['points']), WIDTH, HEIGHT)

        ctx.new_path()
        ctx.move_to(points[0]['x'], points[0]['y'])

        beziers = catmull_rom_to_bezier(points)

        for i, (p1, c1, c2, p2) in enumerate(beziers):
            ctx.curve_to(c1[0], c1[1], c2[0], c2[1], p2['x'], p2['y'])

        # Use average stroke width
        pressures = [p.get('p', 1) or 1 for p in points]
        avg_pressure = sum(pressures) / len(pressures)
        ctx.set_source_rgb(*ink_color)
        ctx.set_line_width(max(1, base_width * avg_pressure))
        ctx.stroke()

    # Downsample with blur
    buf = surface.get_data()
    arr = np.ndarray(shape=(HEIGHT, WIDTH, 4), dtype=np.uint8, buffer=buf)
    rgb_arr = arr[:, :, :3]
    pil_img = Image.fromarray(rgb_arr, 'RGB')
    pil_img = pil_img.resize((OUTPUT_WIDTH, OUTPUT_HEIGHT), resample=Image.LANCZOS)
    pil_img = pil_img.filter(ImageFilter.GaussianBlur(radius=0.3))  # Smooth jagged lines
    pil_img.save(png_path)

    # Optional SVG render
    if svg_path:
        svg_surface = cairo.SVGSurface(svg_path, WIDTH, HEIGHT)
        svg_ctx = cairo.Context(svg_surface)
        svg_ctx.set_source_rgb(*bg_color)
        svg_ctx.paint()
        svg_ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        svg_ctx.set_line_join(cairo.LINE_JOIN_ROUND)
        for stroke in data['strokes']:
            if len(stroke['points']) < 2:
                continue
            points = scale_points(densify(stroke['points']), WIDTH, HEIGHT)
            svg_ctx.move_to(points[0]['x'], points[0]['y'])
            beziers = catmull_rom_to_bezier(points)
            for i, (p1, c1, c2, p2) in enumerate(beziers):
                svg_ctx.curve_to(c1[0], c1[1], c2[0], c2[1], p2['x'], p2['y'])
            pressures = [p.get('p', 1) or 1 for p in points]
            avg_pressure = sum(pressures) / len(pressures)
            svg_ctx.set_source_rgb(*ink_color)
            svg_ctx.set_line_width(max(1, base_width * avg_pressure))
            svg_ctx.stroke()
        svg_surface.finish()

# ---------- CLI Stub ----------

if __name__ == '__main__':
    import sys
    if len(sys.argv) < 3:
        print('Usage: python cairo_renderer.py <input.json> <output.png> [--svg output.svg]')
    else:
        svg_path = None
        if '--svg' in sys.argv:
            idx = sys.argv.index('--svg')
            svg_path = sys.argv[idx + 1]
        render_strokes_to_png(sys.argv[1], sys.argv[2], svg_path=svg_path)











"""import cairo
import math
import json
import numpy as np
from PIL import Image

WIDTH, HEIGHT = 2048, 2048
OUTPUT_WIDTH, OUTPUT_HEIGHT = 256, 256

# Helper: Catmull-Rom to Bezier
def catmull_rom_to_bezier(points):
    # Improved: add phantom points at start/end for smoothness
    if len(points) < 2:
        return []
    extended = [
        {'x': 2*points[0]['x'] - points[1]['x'], 'y': 2*points[0]['y'] - points[1]['y'], **{k: v for k, v in points[0].items() if k not in ['x', 'y']}}
    ] + points + [
        {'x': 2*points[-1]['x'] - points[-2]['x'], 'y': 2*points[-1]['y'] - points[-2]['y'], **{k: v for k, v in points[-1].items() if k not in ['x', 'y']}}
    ]
    beziers = []
    for i in range(1, len(extended) - 2):
        p0 = extended[i - 1]
        p1 = extended[i]
        p2 = extended[i + 1]
        p3 = extended[i + 2]
        c1 = (
            p1['x'] + (p2['x'] - p0['x']) / 6,
            p1['y'] + (p2['y'] - p0['y']) / 6
        )
        c2 = (
            p2['x'] - (p3['x'] - p1['x']) / 6,
            p2['y'] - (p3['y'] - p1['y']) / 6
        )
        beziers.append((p1, c1, c2, p2))
    return beziers

def scale_points(points, width, height, padding=0.1):
    xs = [p['x'] for p in points]
    ys = [p['y'] for p in points]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    # Avoid division by zero
    scale = min(
        (width * (1 - 2 * padding)) / (max_x - min_x + 1e-5),
        (height * (1 - 2 * padding)) / (max_y - min_y + 1e-5)
    )
    offset_x = width * padding - min_x * scale
    offset_y = height * padding - min_y * scale
    return [
        {'x': p['x'] * scale + offset_x, 'y': p['y'] * scale + offset_y, **{k: v for k, v in p.items() if k not in ['x', 'y']}}
        for p in points
    ]

# Main rendering function
def render_strokes_to_png(json_path, png_path, base_width=6, ink_color=(0, 0, 0), bg_color=(1, 1, 1), svg_path=None):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    surface = cairo.ImageSurface(cairo.FORMAT_RGB24, WIDTH, HEIGHT)
    ctx = cairo.Context(surface)
    ctx.set_source_rgb(*bg_color)
    ctx.paint()
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    for stroke in data['strokes']:
        points = scale_points(stroke['points'], WIDTH, HEIGHT)
        if len(points) < 2:
            continue
        # Always move to the first point before drawing curves
        ctx.move_to(points[0]['x'], points[0]['y'])
        beziers = catmull_rom_to_bezier(points)
        for i, (p1, c1, c2, p2) in enumerate(beziers):
            pressure1 = p1.get('p', 1) or 1
            pressure2 = p2.get('p', 1) or 1
            taper = 1
            if i < len(beziers) * 0.2:
                taper = i / (len(beziers) * 0.2)
            elif i > len(beziers) * 0.8:
                taper = (len(beziers) - i) / (len(beziers) * 0.2)
            taper = max(0.2, min(1, taper))
            width = max(1, base_width * (pressure1 + pressure2) / 2 * taper)
            ctx.set_source_rgb(*ink_color)
            ctx.set_line_width(width)
            ctx.curve_to(c1[0], c1[1], c2[0], c2[1], p2['x'], p2['y'])
            ctx.stroke()
    # Downsample to 256x256 using PIL for smooth output
    buf = surface.get_data()
    arr = np.ndarray(shape=(HEIGHT, WIDTH, 4), dtype=np.uint8, buffer=buf)
    rgb_arr = arr[:, :, :3]
    pil_img = Image.fromarray(rgb_arr, 'RGB')
    pil_img = pil_img.resize((OUTPUT_WIDTH, OUTPUT_HEIGHT), resample=Image.LANCZOS)
    pil_img.save(png_path)
    # Optionally save SVG
    if svg_path:
        svg_surface = cairo.SVGSurface(svg_path, WIDTH, HEIGHT)
        svg_ctx = cairo.Context(svg_surface)
        svg_ctx.set_source_rgb(*bg_color)
        svg_ctx.paint()
        svg_ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        svg_ctx.set_line_join(cairo.LINE_JOIN_ROUND)
        for stroke in data['strokes']:
            points = scale_points(stroke['points'], WIDTH, HEIGHT)
            if len(points) < 2:
                continue
            svg_ctx.move_to(points[0]['x'], points[0]['y'])
            beziers = catmull_rom_to_bezier(points)
            for i, (p1, c1, c2, p2) in enumerate(beziers):
                pressure1 = p1.get('p', 1) or 1
                pressure2 = p2.get('p', 1) or 1
                taper = 1
                if i < len(beziers) * 0.2:
                    taper = i / (len(beziers) * 0.2)
                elif i > len(beziers) * 0.8:
                    taper = (len(beziers) - i) / (len(beziers) * 0.2)
                taper = max(0.2, min(1, taper))
                width = max(1, base_width * (pressure1 + pressure2) / 2 * taper)
                svg_ctx.set_source_rgb(*ink_color)
                svg_ctx.set_line_width(width)
                svg_ctx.curve_to(c1[0], c1[1], c2[0], c2[1], p2['x'], p2['y'])
                svg_ctx.stroke()
        svg_surface.finish()

# Stub for batch rendering or CLI
if __name__ == '__main__':
    import sys
    if len(sys.argv) < 3:
        print('Usage: python cairo_renderer.py <input.json> <output.png> [--svg output.svg]')
    else:
        svg_path = None
        if '--svg' in sys.argv:
            idx = sys.argv.index('--svg')
            svg_path = sys.argv[idx + 1]
        render_strokes_to_png(sys.argv[1], sys.argv[2], svg_path=svg_path)"""