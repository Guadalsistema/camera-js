import { CameraUnsupportedError } from '../camera/CameraError.js';

/** @returns {Promise<MediaDeviceInfo[]>} */
export async function listVideoInputDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) throw new CameraUnsupportedError();
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === 'videoinput');
}
