// @ts-nocheck
import { afterEach, describe, expect, test, vi } from 'vitest';

const zxing = vi.hoisted(() => ({
  callback: null,
  decodeError: null,
  controls: { stop: vi.fn() },
  reset: vi.fn(),
}));

vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: class {
    reset() { zxing.reset(); }
    decodeFromVideoElement(_video, callback) {
      zxing.callback = callback;
      if (zxing.decodeError) return Promise.reject(zxing.decodeError);
      return Promise.resolve(zxing.controls);
    }
  },
}));

const { BarcodeScannerController } = await import('../src/barcode/BarcodeScannerController.js');

afterEach(() => {
  delete globalThis.BarcodeDetector;
  zxing.callback = null;
  zxing.decodeError = null;
  zxing.controls.stop.mockClear();
  zxing.reset.mockClear();
});

describe('BarcodeScannerController', () => {
  test('prefers native BarcodeDetector', async () => {
    const detect = vi.fn().mockResolvedValue([{ rawValue: '123', format: 'ean_13' }]);
    globalThis.BarcodeDetector = class { constructor() { this.detect = detect; } };
    let scanner;
    const onCode = vi.fn(() => scanner.stop());
    scanner = new BarcodeScannerController();
    const originalRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (callback) => { queueMicrotask(callback); return 1; };

    await scanner.start({ videoElement: {}, onCode, duplicateDelayMs: 0 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    scanner.stop();
    globalThis.requestAnimationFrame = originalRaf;

    expect(detect).toHaveBeenCalled();
    expect(onCode).toHaveBeenCalledWith({ value: '123', format: 'ean_13', rawFormat: 'ean_13', source: 'native' });
  });

  test('starts ZXing locally and reports detections and runtime failures', async () => {
    const onCode = vi.fn();
    const onError = vi.fn();
    const scanner = new BarcodeScannerController();
    await scanner.start({ videoElement: {}, onCode, onError, formats: ['ean_13', 'code_128'] });

    zxing.callback({ getText: () => '456', getBarcodeFormat: () => 'EAN_13' }, undefined, zxing.controls);
    zxing.callback(undefined, new Error('decoder failed'), zxing.controls);

    expect(onCode).toHaveBeenCalledWith({ value: '456', format: 'ean_13', rawFormat: 'ean_13', source: 'zxing' });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ name: 'BarcodeScannerError' }));
    scanner.stop();
    expect(zxing.controls.stop).toHaveBeenCalled();
    expect(zxing.reset).toHaveBeenCalled();
  });

  test.each(['ChecksumException', 'FormatException'])('ignores routine ZXing %s frame misses', async (name) => {
    const onCode = vi.fn();
    const onError = vi.fn();
    const scanner = new BarcodeScannerController();
    await scanner.start({ videoElement: {}, onCode, onError, preferredEngine: 'zxing' });

    zxing.callback(undefined, { name }, zxing.controls);

    expect(onError).not.toHaveBeenCalled();
    expect(scanner.state).toBe('running');
    scanner.stop();
  });

  test('classifies renamed ZXing misses through getKind and constructor kind', async () => {
    const onCode = vi.fn();
    const onError = vi.fn();
    const scanner = new BarcodeScannerController();
    await scanner.start({ videoElement: {}, onCode, onError, preferredEngine: 'zxing' });

    const renamed = { name: 'BundledNotFoundError', getKind: () => 'NotFoundException' };
    class CrossBundleError {}
    CrossBundleError.kind = 'ChecksumException';
    zxing.callback(undefined, renamed, zxing.controls);
    zxing.callback(undefined, Object.assign(new CrossBundleError(), { name: 'UnrelatedError' }), zxing.controls);

    expect(onError).not.toHaveBeenCalled();
    expect(scanner.state).toBe('running');
    scanner.stop();
  });

  test('falls through throwing or non-string getKind to later discriminators', async () => {
    const onCode = vi.fn();
    const onError = vi.fn();
    const scanner = new BarcodeScannerController();
    await scanner.start({ videoElement: {}, onCode, onError, preferredEngine: 'zxing' });

    zxing.callback(undefined, { getKind: () => { throw new Error('broken kind'); }, name: 'FormatException' }, zxing.controls);
    zxing.callback(undefined, { getKind: () => 42, name: 'NotFoundException' }, zxing.controls);

    expect(onError).not.toHaveBeenCalled();
    expect(scanner.state).toBe('running');
    scanner.stop();
  });

  test('wraps unknown ZXing callback errors and continues scanning', async () => {
    const onCode = vi.fn();
    const onError = vi.fn();
    const scanner = new BarcodeScannerController();
    await scanner.start({ videoElement: {}, onCode, onError, preferredEngine: 'zxing' });
    const unknown = new Error('decoder failed');

    zxing.callback(undefined, unknown, zxing.controls);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ name: 'BarcodeScannerError', cause: unknown }));
    expect(scanner.state).toBe('running');

    zxing.callback({ getText: () => '789', getBarcodeFormat: () => 'QR_CODE' }, undefined, zxing.controls);
    expect(onCode).toHaveBeenCalledWith({ value: '789', format: 'qr_code', rawFormat: 'qr_code', source: 'zxing' });
    scanner.stop();
  });

  test('rejects a ZXing startup failure and returns to idle', async () => {
    zxing.decodeError = new Error('startup failed');
    const scanner = new BarcodeScannerController();

    await expect(scanner.start({ videoElement: {}, onCode: vi.fn(), preferredEngine: 'zxing' }))
      .rejects.toMatchObject({ name: 'BarcodeScannerError' });
    expect(scanner.state).toBe('idle');
    expect(zxing.reset).toHaveBeenCalled();
  });
});
