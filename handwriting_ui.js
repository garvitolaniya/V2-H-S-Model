// handwriting_ui.js
// Full modular handwriting UI: drawing, stroke recording, PNG+JSON saving, status updates

class StrokeRecorder {
  constructor(canvas) {
    this.canvas = canvas;
    this.reset();
    this._bindEvents();
  }
  reset() {
    this.strokes = [];
    this.currentStroke = null;
  }
  _bindEvents() {
    this.canvas.addEventListener('pointerdown', (e) => this._startStroke(e));
    this.canvas.addEventListener('pointermove', (e) => this._addPoint(e));
    this.canvas.addEventListener('pointerup', (e) => this._endStroke(e));
    this.canvas.addEventListener('pointerleave', (e) => this._endStroke(e));
  }
  _startStroke(e) {
    this.currentStroke = [];
    this.strokes.push(this.currentStroke);
    this._addPoint(e, true);
  }
  _addPoint(e, penDown = false) {
    if (!this.currentStroke) return;
    const rect = this.canvas.getBoundingClientRect();
    this.currentStroke.push({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      t: performance.now(),
      p: e.pressure,
      tiltX: e.tiltX,
      tiltY: e.tiltY,
      azimuth: e.azimuthAngle,
      altitude: e.altitudeAngle,
      pointerType: e.pointerType,
      pen_down: penDown || e.buttons === 1
    });
  }
  _endStroke(e) {
    this._addPoint(e, false);
    this.currentStroke = null;
  }
  getData(label) {
    return {
      label,
      timestamp: new Date().toISOString(),
      strokes: this.strokes.map((points, i) => ({
        stroke_id: i + 1,
        points
      }))
    };
  }
}

class HandwritingUI {
  constructor() {
    this.canvas = document.getElementById('draw-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.labelInput = document.getElementById('label');
    this.clearCanvasBtn = document.getElementById('clear-canvas-btn');
    this.newSampleBtn = document.getElementById('clear-btn');
    this.saveBtn = document.getElementById('save-btn');
    this.status = document.getElementById('status');
    this.recorder = new StrokeRecorder(this.canvas);
    this._initUIEvents();
    this.clearCanvas();
  }

  _initUIEvents() {
    this.clearCanvasBtn.addEventListener('click', () => this.clearCanvas());
    this.newSampleBtn.addEventListener('click', () => this.newSample());
    this.saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.saveSample();
    });
    // Canvas touch prevention for scrolling
    this.canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.recorder.reset();
    this.setStatus('Canvas cleared.');
  }

  newSample() {
    this.clearCanvas();
    this.labelInput.value = '';
    this.setStatus('Ready for new sample.');
  }

  async saveSample() {
    const label = this.labelInput.value.trim();
    if (!label) {
      this.setStatus('Please enter a label before saving.');
      return;
    }
    // 1. Get JSON data
    const jsonData = this.recorder.getData(label);

    // 2. Get PNG blob
    const pngBlob = await new Promise(resolve => this.canvas.toBlob(resolve, 'image/png'));

    // 3. Send JSON
    let jsonRes = await fetch('http://192.168.139.217:8000/save_stroke_data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonData)
    });

    // 4. Send PNG
    let pngRes = await fetch('http://192.168.139.217:8000/upload_png', {
      method: 'POST',
      body: (() => {
        const form = new FormData();
        form.append('file', pngBlob, `${label}.png`);
        form.append('label', label);
        form.append('timestamp', jsonData.timestamp);
        return form;
      })()
    });

    if (jsonRes.ok && pngRes.ok) {
      this.setStatus('Sample saved successfully!');
      this.clearCanvas();
    } else {
      this.setStatus('Save failed. Check backend.');
    }
  }

  setStatus(msg) {
    this.status.textContent = msg;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.handwritingUI = new HandwritingUI();
}); 