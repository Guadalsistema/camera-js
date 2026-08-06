import { BarcodeScannerController, CameraController } from '/src/index.js';

const camera = new CameraController();
const scanner = new BarcodeScannerController();
const video = document.querySelector('#video');
const status = document.querySelector('#status');
const result = document.querySelector('#result');
const controls = document.querySelector('#camera-controls');
const settingsContainer = document.querySelector('#camera-settings');

async function ensureCamera() {
  if (!camera.stream) {
    await camera.start({ videoElement: video, facingMode: 'environment' });
    renderCameraControls();
  }
}
function showCode(code) { result.textContent = `${code.value} (${code.format})`; }
document.querySelector('#start').addEventListener('click', async () => {
  try { await ensureCamera(); await scanner.start({ videoElement: video, onCode: showCode }); status.textContent = 'Scanning continuously.'; }
  catch (error) { status.textContent = `${error.name}: ${error.message}`; }
});
document.querySelector('#once').addEventListener('click', async () => {
  try { await ensureCamera(); showCode(await scanner.scanOnce({ videoElement: video })); status.textContent = 'Barcode found.'; }
  catch (error) { status.textContent = `${error.name}: ${error.message}`; }
});
document.querySelector('#stop').addEventListener('click', () => {
  scanner.stop(); camera.stop(); controls.hidden = true; settingsContainer.replaceChildren(); status.textContent = 'Scanner and camera stopped.';
});

function renderCameraControls() {
  settingsContainer.replaceChildren();
  const capabilities = camera.capabilities ?? {};
  const settings = camera.settings ?? {};
  for (const [name, capability] of Object.entries(capabilities)) {
    if (name === 'deviceId' || name === 'groupId') continue;
    const control = createControl(name, capability, settings[name]);
    if (control) settingsContainer.append(control);
  }
  controls.hidden = settingsContainer.childElementCount === 0;
}

function createControl(name, capability, currentValue) {
  const label = document.createElement('label');
  const title = document.createElement('span');
  const output = document.createElement('output');
  let input;
  title.textContent = name;

  if (capability && typeof capability === 'object' && 'min' in capability && 'max' in capability) {
    input = document.createElement('input');
    input.type = 'range';
    input.min = capability.min;
    input.max = capability.max;
    input.step = capability.step || 'any';
    input.value = currentValue ?? capability.min;
  } else if (Array.isArray(capability) && capability.length > 0) {
    input = document.createElement('select');
    for (const value of capability) input.add(new Option(value, value, false, value === currentValue));
  } else if (typeof capability === 'boolean' && capability) {
    input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(currentValue);
  } else {
    return null;
  }

  output.value = String(currentValue ?? '');
  input.addEventListener('change', async () => {
    const value = input.type === 'checkbox' ? input.checked
      : input.type === 'range' ? Number(input.value) : input.value;
    try {
      const nextSettings = await camera.applyConstraints({ advanced: [{ [name]: value }] });
      output.value = String(nextSettings[name] ?? value);
      status.textContent = `${name} updated.`;
    } catch (error) {
      status.textContent = `${error.name}: ${error.message}`;
    }
  });
  label.append(title, input, output);
  return label;
}
