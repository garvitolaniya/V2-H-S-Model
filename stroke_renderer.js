// stroke_renderer.js
// MODULE 3: Live Stroke Rendering
// Renders strokes using Bezier curves, Catmull-Rom splines, pressure, and tapering.

import { StrokeRecorder } from './stroke_recorder.js';

export class StrokeRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.baseWidth = options.baseWidth || 2;
    this.strokeColor = options.strokeColor || '#111';
    this.gaussianFilter = options.gaussianFilter || false; // Placeholder
  }

  // Render a single stroke (array of points)
  renderStroke(points, color = null) {
    if (!points || points.length < 2) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color || this.strokeColor;
    ctx.beginPath();
    // Catmull-Rom to Bezier conversion
    const beziers = this._catmullRomToBezier(points);
    for (let i = 0; i < beziers.length; i++) {
      const [p0, c1, c2, p1, pressure0, pressure1] = beziers[i];
      ctx.moveTo(p0.x, p0.y);
      ctx.lineWidth = this._taperedWidth(pressure0, i, beziers.length);
      ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p1.x, p1.y);
      ctx.lineWidth = this._taperedWidth(pressure1, i + 1, beziers.length);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Render all strokes (array of {points})
  renderStrokes(strokes, color = null) {
    for (const stroke of strokes) {
      this.renderStroke(stroke.points, color);
    }
  }

  // Live rendering: call this on pointer events
  renderLive(points) {
    this.clear();
    this.renderStroke(points);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Catmull-Rom spline to Bezier segments
  _catmullRomToBezier(points) {
    // Returns array of [p0, c1, c2, p1, pressure0, pressure1]
    const beziers = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      // Catmull-Rom to Bezier formula
      const c1 = {
        x: p1.x + (p2.x - p0.x) / 6,
        y: p1.y + (p2.y - p0.y) / 6
      };
      const c2 = {
        x: p2.x - (p3.x - p1.x) / 6,
        y: p2.y - (p3.y - p1.y) / 6
      };
      beziers.push([
        p1, c1, c2, p2, p1.p ?? 1, p2.p ?? 1
      ]);
    }
    return beziers;
  }

  // Tapering: thinner at start/end
  _taperedWidth(pressure, idx, total) {
    const minWidth = 1;
    const taperFrac = 0.2; // 20% of stroke is tapered
    let taper = 1;
    if (idx < total * taperFrac) {
      taper = idx / (total * taperFrac);
    } else if (idx > total * (1 - taperFrac)) {
      taper = (total - idx) / (total * taperFrac);
    }
    taper = Math.max(0.2, Math.min(1, taper));
    return Math.max(minWidth, this.baseWidth * (pressure || 1) * taper);
  }

  // Placeholder for optional Gaussian filtering
  applyGaussianFilter(points) {
    // TODO: Implement smoothing filter
    return points;
  }
}

// Integration: Attach to UI and Recorder
export function integrateRendererWithUI(ui, recorder, renderer) {
  // Live rendering on pointer events
  let liveStroke = [];
  recorder.attach();
  ui.canvas.addEventListener('pointerdown', e => {
    liveStroke = [];
    renderer.clear();
  });
  ui.canvas.addEventListener('pointermove', e => {
    if (e.buttons !== 1) return;
    // Get latest stroke from recorder
    const strokes = recorder.strokes;
    if (strokes.length > 0) {
      liveStroke = strokes[strokes.length - 1].points;
      renderer.clear();
      renderer.renderStrokes(recorder.strokes);
    }
  });
  ui.canvas.addEventListener('pointerup', e => {
    renderer.clear();
    renderer.renderStrokes(recorder.strokes);
  });
  ui.clearBtn.addEventListener('click', () => {
    renderer.clear();
    recorder.reset();
  });
  ui.newSampleBtn.addEventListener('click', () => {
    renderer.clear();
    recorder.reset();
  });
} 