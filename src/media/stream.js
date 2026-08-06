/** @param {MediaStream} stream */
export function stopMediaStream(stream) {
  stream.getTracks().forEach((track) => track.stop());
}

/** @param {HTMLVideoElement} videoElement @param {MediaStream} stream @returns {Promise<void>} */
export async function attachStream(videoElement, stream) {
  videoElement.srcObject = stream;
  videoElement.muted = true;
  videoElement.playsInline = true;
  await videoElement.play();
}

/** @param {HTMLVideoElement} videoElement */
export function detachStream(videoElement) {
  videoElement.pause();
  videoElement.srcObject = null;
}
