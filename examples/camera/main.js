import { CameraController } from '/src/index.js';

const camera = new CameraController();
const video = document.querySelector('#video');
const status = document.querySelector('#status');
const photoButton = document.querySelector('#photo-button');
let photoUrl;

document.querySelector('#start').addEventListener('click', async () => {
  try {
    await camera.start({ videoElement: video, facingMode: 'environment' });
    photoButton.disabled = false;
    status.textContent = 'Camera is running.';
  } catch (error) { status.textContent = `${error.name}: ${error.message}`; }
});
photoButton.addEventListener('click', async () => {
  try {
    const blob = await camera.takePhoto();
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = URL.createObjectURL(blob);
    document.querySelector('#photo').src = photoUrl;
  } catch (error) { status.textContent = `${error.name}: ${error.message}`; }
});
document.querySelector('#stop').addEventListener('click', () => {
  camera.stop();
  photoButton.disabled = true;
  status.textContent = 'Camera stopped.';
});
