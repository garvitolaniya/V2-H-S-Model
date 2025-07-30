# joint_analysis.py
# MODULE 11: Joint Analysis Engine
# Detects how letters join: spacing, stroke direction, continuation.

import json
import numpy as np
import os

def analyze_joins(json_path):
    """
    Analyze stroke joins in a handwriting sample JSON.
    Returns a list of join features between strokes.
    """
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    strokes = data['strokes']
    joins = []
    for i in range(len(strokes) - 1):
        s1 = strokes[i]['points']
        s2 = strokes[i+1]['points']
        if not s1 or not s2:
            continue
        end1 = s1[-1]
        start2 = s2[0]
        # Spacing (Euclidean distance)
        spacing = np.hypot(start2['x'] - end1['x'], start2['y'] - end1['y'])
        # Time gap
        time_gap = start2['t'] - end1['t']
        # Direction (angle between last segment of s1 and first of s2)
        def angle(p0, p1):
            return np.arctan2(p1['y'] - p0['y'], p1['x'] - p0['x'])
        dir1 = angle(s1[-2], s1[-1]) if len(s1) > 1 else 0
        dir2 = angle(s2[0], s2[1]) if len(s2) > 1 else 0
        dir_diff = np.abs(dir2 - dir1)
        # Continuation (was pen lifted?)
        pen_lifted = not (end1.get('pen_down', True) and start2.get('pen_down', True))
        # Stub: advanced join type detection
        join_type = 'continuous' if not pen_lifted and spacing < 10 else 'lifted'
        joins.append({
            'from_stroke': i+1,
            'to_stroke': i+2,
            'spacing': spacing,
            'time_gap': time_gap,
            'dir_diff': dir_diff,
            'pen_lifted': pen_lifted,
            'join_type': join_type
        })
    return joins

# CLI stub for batch analysis
if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print('Usage: python joint_analysis.py <sample.json>')
    else:
        joins = analyze_joins(sys.argv[1])
        print(json.dumps(joins, indent=2)) 