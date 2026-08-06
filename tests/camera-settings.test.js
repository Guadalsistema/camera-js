import { describe, expect, test } from 'vitest';
import { CameraConstraintError, CameraController } from '../src/index.js';

describe('camera settings', () => {
  test('exposes capabilities and current settings from the active track', () => {
    const camera = createCameraWithTrack({
      getCapabilities: () => ({ width: { min: 320, max: 1920 } }),
      getSettings: () => ({ width: 1280 }),
      applyConstraints: async () => {},
    });

    expect(camera.capabilities).toEqual({ width: { min: 320, max: 1920 } });
    expect(camera.settings).toEqual({ width: 1280 });
  });

  test('applies constraints and returns updated settings', async () => {
    /** @type {MediaTrackConstraints | undefined} */
    let applied;
    const camera = createCameraWithTrack({
      getCapabilities: () => ({}),
      getSettings: () => ({ frameRate: 30 }),
      applyConstraints: async (constraints) => { applied = constraints; },
    });
    const constraints = { frameRate: { ideal: 30 } };

    await expect(camera.applyConstraints(constraints)).resolves.toEqual({ frameRate: 30 });
    expect(applied).toBe(constraints);
  });

  test('rejects setting changes when the camera is not active', async () => {
    await expect(new CameraController().applyConstraints({ frameRate: 30 })).rejects.toBeInstanceOf(CameraConstraintError);
  });
});

/**
 * @param {Pick<MediaStreamTrack, 'applyConstraints' | 'getCapabilities' | 'getSettings'>} track
 * @returns {CameraController}
 */
function createCameraWithTrack(track) {
  const camera = new CameraController();
  const stream = { getVideoTracks: () => [track] };
  Object.defineProperty(camera, '_stream', { value: stream, writable: true });
  return camera;
}
