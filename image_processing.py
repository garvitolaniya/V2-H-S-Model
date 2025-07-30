# image_processing.py
# MODULE 6: Image Processing (Pillow)
# Standardizes PNGs for consistency before training.

from PIL import Image, ImageOps
import numpy as np
import os

def process_image(png_path, invert=False, save_path=None):
    """
    Standardize a PNG: grayscale, crop to bbox, pad to square, resize to 256x256, optionally invert.
    Args:
        png_path: Path to input PNG.
        invert: If True, invert image (black ink on white).
        save_path: If provided, save to this path; else overwrite input.
    Returns:
        Path to processed image.
    """
    img = Image.open(png_path).convert('L')  # Grayscale
    arr = np.array(img)
    # Crop to bounding box (non-white)
    mask = arr < 250  # threshold for ink
    coords = np.argwhere(mask)
    if coords.size == 0:
        bbox = (0, 0, img.width, img.height)
    else:
        y0, x0 = coords.min(axis=0)
        y1, x1 = coords.max(axis=0) + 1
        bbox = (x0, y0, x1, y1)
    img_cropped = img.crop(bbox)
    # Pad to square
    max_side = max(img_cropped.width, img_cropped.height)
    new_img = Image.new('L', (max_side, max_side), 255)
    offset = ((max_side - img_cropped.width) // 2, (max_side - img_cropped.height) // 2)
    new_img.paste(img_cropped, offset)
    # Resize to 256x256
    img_resized = new_img.resize((256, 256), Image.LANCZOS)
    # Optional invert
    if invert:
        img_resized = ImageOps.invert(img_resized)
    # Save
    out_path = save_path or png_path
    img_resized.save(out_path)
    return out_path

# Stub for backend integration
if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print('Usage: python image_processing.py <png_path> [--invert]')
    else:
        process_image(sys.argv[1], invert='--invert' in sys.argv) 