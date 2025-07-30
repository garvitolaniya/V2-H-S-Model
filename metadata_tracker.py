# metadata_tracker.py
# MODULE 7: Metadata Tracker
# Tracks all saved samples in a metadata.json file.

import os
import json
from threading import Lock

META_LOCK = Lock()

def append_metadata(meta_path, entry):
    """
    Append a metadata entry to metadata.json, creating the file if needed.
    Args:
        meta_path: Path to metadata.json
        entry: Dict with metadata fields
    """
    META_LOCK.acquire()
    try:
        if os.path.exists(meta_path):
            with open(meta_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        else:
            data = []
        data.append(entry)
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    finally:
        META_LOCK.release()

# Example entry:
# {
#   "label": "A",
#   "timestamp": "2025-07-04T15:43:11Z",
#   "device": "Samsung Tab S9 FE",
#   "json_path": "data/A/20250704_154311.json",
#   "png_path": "data/A/20250704_154311.png",
#   "stroke_count": 2,
#   "total_points": 134
# }

# Stub for backend integration
if __name__ == '__main__':
    entry = {
        "label": "A",
        "timestamp": "2025-07-04T15:43:11Z",
        "device": "Samsung Tab S9 FE",
        "json_path": "data/A/20250704_154311.json",
        "png_path": "data/A/20250704_154311.png",
        "stroke_count": 2,
        "total_points": 134
    }
    append_metadata('handwriting_data/metadata.json', entry) 