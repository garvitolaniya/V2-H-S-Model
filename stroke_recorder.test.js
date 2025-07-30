import { StrokeRecorder } from './stroke_recorder.js';

document.body.innerHTML = '<canvas id="test-canvas" width="400" height="400"></canvas>';
const canvas = document.getElementById('test-canvas');

describe('StrokeRecorder', () => {
  let recorder;
  beforeEach(() => {
    recorder = new StrokeRecorder(canvas, 'Test Device');
    recorder.attach();
    recorder.reset();
  });
  afterEach(() => {
    recorder.detach();
  });

  function firePointer(type, props) {
    const event = new PointerEvent(type, Object.assign({
      pointerType: 'pen',
      clientX: 100,
      clientY: 100,
      pressure: 0.5,
      tiltX: 10,
      tiltY: 5,
      azimuthAngle: 1.0,
      altitudeAngle: 0.8,
      buttons: 1
    }, props));
    canvas.dispatchEvent(event);
  }

  test('records a single stroke with metadata', () => {
    firePointer('pointerdown', { clientX: 100, clientY: 100 });
    firePointer('pointermove', { clientX: 110, clientY: 110 });
    firePointer('pointerup', { clientX: 120, clientY: 120 });
    const sample = recorder.getSample('A');
    expect(sample.label).toBe('A');
    expect(sample.device).toBe('Test Device');
    expect(sample.strokes.length).toBe(1);
    expect(sample.strokes[0].points.length).toBeGreaterThanOrEqual(2);
    const pt = sample.strokes[0].points[0];
    expect(pt).toHaveProperty('x');
    expect(pt).toHaveProperty('y');
    expect(pt).toHaveProperty('t');
    expect(pt).toHaveProperty('p');
    expect(pt).toHaveProperty('tiltX');
    expect(pt).toHaveProperty('tiltY');
    expect(pt).toHaveProperty('azimuth');
    expect(pt).toHaveProperty('altitude');
    expect(pt).toHaveProperty('pointerType');
    expect(pt).toHaveProperty('dx');
    expect(pt).toHaveProperty('dy');
    expect(pt).toHaveProperty('velocity');
    expect(pt).toHaveProperty('curvature');
    expect(pt).toHaveProperty('pen_down');
  });

  test('records multiple strokes', () => {
    // First stroke
    firePointer('pointerdown', { clientX: 100, clientY: 100 });
    firePointer('pointerup', { clientX: 110, clientY: 110 });
    // Second stroke
    firePointer('pointerdown', { clientX: 200, clientY: 200 });
    firePointer('pointerup', { clientX: 210, clientY: 210 });
    const sample = recorder.getSample('B');
    expect(sample.strokes.length).toBe(2);
    expect(sample.strokes[0].stroke_id).toBe(1);
    expect(sample.strokes[1].stroke_id).toBe(2);
  });

  test('sampling_rate is computed', () => {
    firePointer('pointerdown', { clientX: 100, clientY: 100 });
    firePointer('pointermove', { clientX: 110, clientY: 110 });
    firePointer('pointerup', { clientX: 120, clientY: 120 });
    const sample = recorder.getSample('C');
    expect(sample.sampling_rate).not.toBeNull();
  });

  test('fields are null if not supported', () => {
    // Simulate missing fields
    const event = new PointerEvent('pointerdown', { pointerType: 'pen', clientX: 100, clientY: 100 });
    canvas.dispatchEvent(event);
    const sample = recorder.getSample('D');
    const pt = sample.strokes[0].points[0];
    expect(pt.tiltX).toBeNull();
    expect(pt.tiltY).toBeNull();
    expect(pt.azimuth).toBeNull();
    expect(pt.altitude).toBeNull();
  });
}); 