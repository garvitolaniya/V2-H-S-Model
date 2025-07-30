// stroke_recorder.js
// MODULE 2: Pointer Event Stroke Recorder
// Captures stylus metadata per point, supports multiple strokes, and outputs JSON.

export class StrokeRecorder {
  constructor(canvas, deviceName = 'Unknown Device') {
    this.canvas = canvas;
    this.deviceName = deviceName;
    this.reset();
    this._pointerHandler = this._pointerHandler.bind(this);
    this._rawHandler = this._rawHandler.bind(this);
    this._active = false;
    this._useRaw = false;
  }

  attach() {
    this.canvas.addEventListener('pointerdown', this._pointerHandler);
    this.canvas.addEventListener('pointermove', this._pointerHandler);
    this.canvas.addEventListener('pointerup', this._pointerHandler);
    this.canvas.addEventListener('pointercancel', this._pointerHandler);
    // Try pointerrawupdate for high frequency (Chrome only)
    if ('onpointerrawupdate' in this.canvas) {
      this.canvas.addEventListener('pointerrawupdate', this._rawHandler);
      this._useRaw = true;
    }
  }

  detach() {
    this.canvas.removeEventListener('pointerdown', this._pointerHandler);
    this.canvas.removeEventListener('pointermove', this._pointerHandler);
    this.canvas.removeEventListener('pointerup', this._pointerHandler);
    this.canvas.removeEventListener('pointercancel', this._pointerHandler);
    if ('onpointerrawupdate' in this.canvas) {
      this.canvas.removeEventListener('pointerrawupdate', this._rawHandler);
    }
  }

  reset() {
    this.strokes = [];
    this.currentStroke = null;
    this._lastPoint = null;
    this._lastTime = null;
    this._active = false;
    this._samplingTimes = [];
  }

  _pointerHandler(e) {
    if (e.pointerType !== 'pen' && e.pointerType !== 'touch') return;
    if (e.type === 'pointerdown') {
      this._active = true;
      this._startStroke(e);
    } else if (e.type === 'pointermove' && this._active && !this._useRaw) {
      this._addPoint(e);
    } else if ((e.type === 'pointerup' || e.type === 'pointercancel') && this._active) {
      this._addPoint(e, true);
      this._endStroke();
      this._active = false;
    }
  }

  _rawHandler(e) {
    if (!this._active) return;
    this._addPoint(e);
  }

  _startStroke(e) {
    this.currentStroke = {
      stroke_id: this.strokes.length + 1,
      points: []
    };
    this.strokes.push(this.currentStroke);
    this._lastPoint = null;
    this._lastTime = null;
    this._addPoint(e, true);
  }

  _endStroke() {
    this._lastPoint = null;
    this._lastTime = null;
  }

  _addPoint(e, penDown = false) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const t = performance.now() / 1000; // seconds
    const p = e.pressure ?? null;
    const tiltX = e.tiltX ?? null;
    const tiltY = e.tiltY ?? null;
    const azimuth = e.azimuthAngle ?? null;
    const altitude = e.altitudeAngle ?? null;
    const pointerType = e.pointerType ?? null;
    let dx = null, dy = null, velocity = null, curvature = null;
    if (this._lastPoint) {
      dx = x - this._lastPoint.x;
      dy = y - this._lastPoint.y;
      const dt = t - this._lastTime;
      velocity = dt > 0 ? Math.sqrt(dx*dx + dy*dy) / dt : 0;
      // Curvature estimation (3-point):
      if (this.currentStroke.points.length > 1) {
        const prev = this.currentStroke.points[this.currentStroke.points.length - 2];
        curvature = this._estimateCurvature(prev, this._lastPoint, {x, y});
      }
    }
    const point = {
      x, y, t, p, tiltX, tiltY, azimuth, altitude, pointerType, dx, dy, velocity, curvature, pen_down: penDown || e.buttons === 1
    };
    this.currentStroke.points.push(point);
    this._lastPoint = {x, y};
    this._lastTime = t;
    this._samplingTimes.push(t);
  }

  _estimateCurvature(p1, p2, p3) {
    // 3-point curvature estimation (circle fitting)
    const a = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const b = Math.hypot(p3.x - p2.x, p3.y - p2.y);
    const c = Math.hypot(p3.x - p1.x, p3.y - p1.y);
    if (a === 0 || b === 0 || c === 0) return 0;
    const s = (a + b + c) / 2;
    const area = Math.sqrt(Math.max(s * (s - a) * (s - b) * (s - c), 0));
    return area === 0 ? 0 : (4 * area) / (a * b * c);
  }

  getSample(label = '', timestamp = null) {
    // Auto-detect sampling rate
    let sampling_rate = null;
    if (this._samplingTimes.length > 1) {
      const intervals = [];
      for (let i = 1; i < this._samplingTimes.length; ++i) {
        intervals.push(this._samplingTimes[i] - this._samplingTimes[i-1]);
      }
      const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      sampling_rate = mean > 0 ? (1 / mean).toFixed(2) : null;
    }
    return {
      label,
      device: this.deviceName,
      timestamp: timestamp || new Date().toISOString(),
      sampling_rate,
      strokes: this.strokes.map(s => ({
        stroke_id: s.stroke_id,
        points: s.points.map(pt => ({
          x: pt.x, y: pt.y, t: pt.t, p: pt.p, tiltX: pt.tiltX, tiltY: pt.tiltY,
          azimuth: pt.azimuth, altitude: pt.altitude, pointerType: pt.pointerType,
          dx: pt.dx, dy: pt.dy, velocity: pt.velocity, curvature: pt.curvature, pen_down: pt.pen_down
        }))
      }))
    };
  }
} 