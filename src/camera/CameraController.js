import {
  CameraNotFoundError,
  CameraPermissionError,
  CameraConstraintError,
  CameraStartError,
  CameraUnsupportedError,
} from './CameraError.js';
import { attachStream, detachStream, stopMediaStream } from '../media/stream.js';

/**
 * @typedef {import('./types.js').CameraLifecycleState} CameraLifecycleState
 * @typedef {import('./types.js').CameraStartOptions} CameraStartOptions
 */

export class CameraController {
  /** @private @type {MediaStream | null} */
  _stream = null;
  /** @private @type {HTMLVideoElement | null} */
  _videoElement = null;
  /** @private @type {CameraLifecycleState} */
  _state = 'idle';

  /** @returns {MediaStream | null} */
  get stream() { return this._stream; }

  /** @returns {CameraLifecycleState} */
  get state() { return this._state; }

  /** @returns {MediaTrackCapabilities | null} */
  get capabilities() {
    return this._videoTrack?.getCapabilities?.() ?? null;
  }

  /** @returns {MediaTrackSettings | null} */
  get settings() {
    return this._videoTrack?.getSettings?.() ?? null;
  }

  /** @private @returns {MediaStreamTrack | null} */
  get _videoTrack() {
    return this._stream?.getVideoTracks()[0] ?? null;
  }

  /** @param {CameraStartOptions} options @returns {Promise<void>} */
  async start(options) {
    if (!navigator.mediaDevices?.getUserMedia) throw new CameraUnsupportedError();
    this.stop();
    this._state = 'starting';
    const video = {
      facingMode: options.facingMode,
      deviceId: options.deviceId ? { exact: options.deviceId } : undefined,
      width: options.width ? { ideal: options.width } : undefined,
      height: options.height ? { ideal: options.height } : undefined,
    };
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      await attachStream(options.videoElement, stream);
      this._stream = stream;
      this._videoElement = options.videoElement;
      this._state = 'active';
    } catch (error) {
      this._state = 'idle';
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        throw new CameraPermissionError(undefined, error);
      }
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        throw new CameraNotFoundError(undefined, error);
      }
      throw new CameraStartError('The camera could not be started', error instanceof Error ? error : undefined);
    }
  }

  /** @returns {Promise<Blob>} */
  async takePhoto() {
    if (!this._stream || !this._videoElement) throw new CameraStartError('Start the camera before taking a photo');
    const video = this._videoElement;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) throw new CameraStartError('The camera video is not ready');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    return new Promise((resolve, reject) => canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new CameraStartError('The photo could not be created'));
    }, 'image/jpeg', 0.9));
  }

  /**
   * Applies browser-supported constraints to the active video track.
   * @param {MediaTrackConstraints} constraints
   * @returns {Promise<MediaTrackSettings>}
   */
  async applyConstraints(constraints) {
    const track = this._videoTrack;
    if (!track) throw new CameraConstraintError('Start the camera before changing its settings');
    try {
      await track.applyConstraints(constraints);
      return track.getSettings();
    } catch (error) {
      throw new CameraConstraintError('The requested camera settings are not supported', error instanceof Error ? error : undefined);
    }
  }

  stop() {
    if (this._videoElement) detachStream(this._videoElement);
    if (this._stream) stopMediaStream(this._stream);
    this._stream = null;
    this._videoElement = null;
    this._state = 'idle';
  }

  pause() {
    this._stream?.getVideoTracks().forEach((track) => { track.enabled = false; });
    if (this._stream) this._state = 'paused';
  }

  /** @returns {Promise<void>} */
  async resume() {
    if (!this._stream) throw new CameraStartError('Start the camera before resuming it');
    this._stream.getVideoTracks().forEach((track) => { track.enabled = true; });
    this._state = 'active';
  }
}
