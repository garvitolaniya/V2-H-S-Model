import { HandwritingUI } from './handwriting_ui.js';

document.body.innerHTML = `
  <canvas id="handwriting-canvas"></canvas>
  <input id="label-input" />
  <button id="clear-btn"></button>
  <button id="new-sample-btn"></button>
  <button id="save-btn"></button>
  <div id="status"></div>
`;

describe('HandwritingUI', () => {
  let ui;
  beforeEach(() => {
    ui = new HandwritingUI(
      'handwriting-canvas',
      'label-input',
      'clear-btn',
      'new-sample-btn',
      'save-btn',
      'status'
    );
  });

  test('initializes UI elements', () => {
    expect(ui.canvas).toBeDefined();
    expect(ui.labelInput).toBeDefined();
    expect(ui.clearBtn).toBeDefined();
    expect(ui.newSampleBtn).toBeDefined();
    expect(ui.saveBtn).toBeDefined();
    expect(ui.status).toBeDefined();
  });

  test('clearCanvas updates status', () => {
    ui.clearCanvas();
    expect(ui.status.textContent).toBe('Canvas cleared.');
  });

  test('newSample clears label and updates status', () => {
    ui.labelInput.value = 'test';
    ui.newSample();
    expect(ui.labelInput.value).toBe('');
    expect(ui.status.textContent).toBe('Ready for new sample.');
  });

  test('saveSample sets placeholder status', () => {
    ui.saveSample();
    expect(ui.status.textContent).toBe('Save functionality coming soon.');
  });
}); 