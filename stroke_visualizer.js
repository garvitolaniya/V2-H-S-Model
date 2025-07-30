// stroke_visualizer.js
// MODULE 8: Stroke Visualizer (Replayer)
// Loads a saved .json and visually replays it with advanced features.

import { StrokeRenderer } from './stroke_renderer.js';

export class StrokeVisualizer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.renderer = new StrokeRenderer(canvas, options);
    this.strokes = [];
    this.playbackSpeed = 1.0;
    this.colorMode = 'pressure'; // or 'velocity'
    this.isPlaying = false;
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this._animationFrame = null;
    this._bindUI(options.uiRoot || document.body);
  }

  async loadJSONFile(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    this.strokes = data.strokes || [];
    this.label = data.label || '';
    this.device = data.device || '';
    this._resetView();
    this.renderAll();
  }

  renderAll() {
    this.ctx.save();
    this._applyTransform();
    this.renderer.clear();
    this.renderer.renderStrokes(this.strokes, this._getColorFunc());
    this.ctx.restore();
  }

  async replay() {
    if (!this.strokes.length) return;
    this.isPlaying = true;
    this.renderer.clear();
    this.ctx.save();
    this._applyTransform();
    for (const stroke of this.strokes) {
      await this._replayStroke(stroke);
      if (!this.isPlaying) break;
    }
    this.ctx.restore();
    this.isPlaying = false;
  }

  async _replayStroke(stroke) {
    const points = stroke.points;
    for (let i = 1; i < points.length; i++) {
      if (!this.isPlaying) break;
      this.renderer.renderStroke(points.slice(0, i + 1), this._getColorFunc(points[i]));
      await this._sleep(10 / this.playbackSpeed);
    }
  }

  stop() {
    this.isPlaying = false;
    if (this._animationFrame) cancelAnimationFrame(this._animationFrame);
  }

  setPlaybackSpeed(speed) {
    this.playbackSpeed = speed;
  }

  setColorMode(mode) {
    this.colorMode = mode;
    this.renderAll();
  }

  // Color mapping for pressure/velocity
  _getColorFunc(point) {
    if (this.colorMode === 'velocity' && point && point.velocity != null) {
      // Map velocity to blue-red
      const v = Math.min(1, Math.max(0, point.velocity / 2));
      return `rgb(${Math.round(255 * v)},0,${Math.round(255 * (1 - v))})`;
    } else if (this.colorMode === 'pressure' && point && point.p != null) {
      // Map pressure to green-black
      const g = Math.round(255 * point.p);
      return `rgb(0,${g},0)`;
    }
    return null;
  }

  // Zoom and pan
  _applyTransform() {
    this.ctx.setTransform(this.zoom, 0, 0, this.zoom, this.pan.x, this.pan.y);
  }
  _resetView() {
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
  }

  // UI controls
  _bindUI(root) {
    // File selector
    let fileInput = root.querySelector('#visualizer-file');
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json';
      fileInput.id = 'visualizer-file';
      root.appendChild(fileInput);
    }
    fileInput.addEventListener('change', e => {
      if (e.target.files.length) this.loadJSONFile(e.target.files[0]);
    });
    // Playback controls
    let playBtn = root.querySelector('#visualizer-play');
    if (!playBtn) {
      playBtn = document.createElement('button');
      playBtn.id = 'visualizer-play';
      playBtn.textContent = 'Play';
      root.appendChild(playBtn);
    }
    playBtn.addEventListener('click', () => this.replay());
    let stopBtn = root.querySelector('#visualizer-stop');
    if (!stopBtn) {
      stopBtn = document.createElement('button');
      stopBtn.id = 'visualizer-stop';
      stopBtn.textContent = 'Stop';
      root.appendChild(stopBtn);
    }
    stopBtn.addEventListener('click', () => this.stop());
    // Speed control
    let speedInput = root.querySelector('#visualizer-speed');
    if (!speedInput) {
      speedInput = document.createElement('input');
      speedInput.type = 'range';
      speedInput.min = 0.1;
      speedInput.max = 3;
      speedInput.step = 0.1;
      speedInput.value = 1;
      speedInput.id = 'visualizer-speed';
      root.appendChild(speedInput);
    }
    speedInput.addEventListener('input', e => this.setPlaybackSpeed(Number(e.target.value)));
    // Color mode
    let colorSelect = root.querySelector('#visualizer-color');
    if (!colorSelect) {
      colorSelect = document.createElement('select');
      colorSelect.id = 'visualizer-color';
      colorSelect.innerHTML = '<option value="pressure">Pressure</option><option value="velocity">Velocity</option>';
      root.appendChild(colorSelect);
    }
    colorSelect.addEventListener('change', e => this.setColorMode(e.target.value));
    // Zoom/pan (basic: mouse wheel/drag)
    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      this.zoom *= e.deltaY < 0 ? 1.1 : 0.9;
      this.renderAll();
    });
    let dragging = false, last = {x:0, y:0};
    this.canvas.addEventListener('mousedown', e => { dragging = true; last = {x:e.clientX, y:e.clientY}; });
    this.canvas.addEventListener('mousemove', e => {
      if (dragging) {
        this.pan.x += e.clientX - last.x;
        this.pan.y += e.clientY - last.y;
        last = {x:e.clientX, y:e.clientY};
        this.renderAll();
      }
    });
    this.canvas.addEventListener('mouseup', e => { dragging = false; });
    this.canvas.addEventListener('mouseleave', e => { dragging = false; });
  }

  _sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
  }
} 