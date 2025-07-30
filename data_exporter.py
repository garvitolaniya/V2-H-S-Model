# data_exporter.py
# MODULE 10: Training Ready Data Exporter
# Converts JSON+PNG samples into .npz, .h5, or .tfrecord for ML training.

import os
import json
import numpy as np
from glob import glob
from sklearn.model_selection import train_test_split

# Optional: import h5py, tensorflow as tf if needed

SUPPORTED_FORMATS = ['npz', 'h5', 'tfrecord']


def normalize_stroke(stroke, width=256, height=256):
    norm_points = []
    for pt in stroke['points']:
        norm_pt = pt.copy()
        norm_pt['x'] = pt['x'] / width
        norm_pt['y'] = pt['y'] / height
        norm_points.append(norm_pt)
    return {'stroke_id': stroke['stroke_id'], 'points': norm_points}


def delta_encode(stroke):
    points = stroke['points']
    if not points:
        return stroke
    deltas = [points[0].copy()]
    for i in range(1, len(points)):
        prev = points[i-1]
        curr = points[i].copy()
        curr['dx'] = curr['x'] - prev['x']
        curr['dy'] = curr['y'] - prev['y']
        deltas.append(curr)
    return {'stroke_id': stroke['stroke_id'], 'points': deltas}


def export_data(data_dir, out_dir, fmt='npz', test_size=0.1, val_size=0.1, delta=False):
    """
    Convert all JSON+PNG samples in data_dir to ML format in out_dir.
    Args:
        data_dir: Directory with label folders containing .json and .png
        out_dir: Output directory
        fmt: 'npz', 'h5', or 'tfrecord'
        test_size: Fraction for test split
        val_size: Fraction for val split
        delta: If True, use delta encoding
    """
    assert fmt in SUPPORTED_FORMATS
    os.makedirs(out_dir, exist_ok=True)
    json_files = glob(os.path.join(data_dir, '*', '*.json'))
    samples = []
    for jf in json_files:
        with open(jf, 'r', encoding='utf-8') as f:
            data = json.load(f)
        label = data.get('label', 'unknown')
        strokes = [normalize_stroke(s) for s in data['strokes']]
        if delta:
            strokes = [delta_encode(s) for s in strokes]
        png_path = jf.replace('.json', '.png')
        samples.append({'label': label, 'strokes': strokes, 'png_path': png_path})
    # Split
    train, test = train_test_split(samples, test_size=test_size, random_state=42)
    train, val = train_test_split(train, test_size=val_size/(1-test_size), random_state=42)
    splits = {'train': train, 'val': val, 'test': test}
    # Export
    for split, items in splits.items():
        split_dir = os.path.join(out_dir, split)
        os.makedirs(split_dir, exist_ok=True)
        if fmt == 'npz':
            X = [s['strokes'] for s in items]
            y = [s['label'] for s in items]
            np.savez_compressed(os.path.join(split_dir, 'data.npz'), X=X, y=y)
        elif fmt == 'h5':
            # Stub: implement HDF5 export
            pass
        elif fmt == 'tfrecord':
            # Stub: implement TFRecord export
            pass

# CLI stub
if __name__ == '__main__':
    import sys
    if len(sys.argv) < 3:
        print('Usage: python data_exporter.py <data_dir> <out_dir> [--fmt npz|h5|tfrecord] [--delta]')
    else:
        fmt = 'npz'
        delta = False
        if '--fmt' in sys.argv:
            idx = sys.argv.index('--fmt')
            fmt = sys.argv[idx + 1]
        if '--delta' in sys.argv:
            delta = True
        export_data(sys.argv[1], sys.argv[2], fmt=fmt, delta=delta) 