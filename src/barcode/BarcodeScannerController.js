import { BarcodeScannerError, BarcodeStoppedError, BarcodeTimeoutError, BarcodeUnsupportedError } from './BarcodeError.js';

const ZXING_URL = 'https://esm.sh/@zxing/browser@0.1.5';

/**
 * @typedef {import('./types.js').BarcodeLifecycleState} BarcodeLifecycleState
 * @typedef {import('./types.js').BarcodeStartOptions} BarcodeStartOptions
 * @typedef {import('./types.js').BarcodeScanOnceOptions} BarcodeScanOnceOptions
 * @typedef {import('./types.js').BarcodeResult} BarcodeResult
 */

export class BarcodeScannerController {
  /** @private @type {BarcodeLifecycleState} */
  _state = 'idle';
  /** @private @type {number | null} */
  _frame = null;
  /** @private @type {BarcodeDetectorLike | null} */
  _detector = null;
  /** @private @type {ZXingControlsLike | null} */
  _zxingControls = null;
  /** @private @type {((result: BarcodeResult) => void) | null} */
  _onCode = null;
  /** @private @type {((error: Error) => void) | null} */
  _pendingReject = null;
  /** @private @type {Map<string, number>} */
  _lastReads = new Map();
  /** @private @type {number} */
  _duplicateDelayMs = 1000;

  /** @returns {BarcodeLifecycleState} */
  get state() { return this._state; }

  /** @param {BarcodeStartOptions} options @returns {Promise<void>} */
  async start(options) {
    this.stop();
    this._onCode = options.onCode;
    this._duplicateDelayMs = options.duplicateDelayMs ?? 1000;
    this._state = 'running';
    if (shouldUseNative(options.preferredEngine)) {
      this._detector = createDetector(options.formats);
      this._scanFrame(options.videoElement);
    } else {
      await this._startZXing(options.videoElement);
    }
  }

  /** @param {BarcodeScanOnceOptions} options @returns {Promise<BarcodeResult>} */
  async scanOnce(options) {
    this.stop();
    if (!shouldUseNative(options.preferredEngine)) {
      return this._scanOnceZXing(options.videoElement, options.timeoutMs ?? 30000);
    }
    const detector = createDetector(options.formats);
    const timeoutMs = options.timeoutMs ?? 30000;
    return new Promise((resolve, reject) => {
      let frame = 0;
      const timeout = setTimeout(() => {
        cancelAnimationFrame(frame);
        this._state = 'idle';
        reject(new BarcodeTimeoutError());
      }, timeoutMs);
      const scan = async () => {
        if (this._state === 'idle') {
          clearTimeout(timeout);
          reject(new BarcodeStoppedError());
          return;
        }
        try {
          const results = await detector.detect(options.videoElement);
          if (results.length) {
            clearTimeout(timeout);
            this._state = 'idle';
            resolve(normalizeResult(results[0]));
            return;
          }
        } catch (error) {
          clearTimeout(timeout);
          this._state = 'idle';
          reject(new BarcodeScannerError('Barcode detection failed', error instanceof Error ? error : undefined));
          return;
        }
        frame = requestAnimationFrame(scan);
      };
      this._state = 'running';
      frame = requestAnimationFrame(scan);
    });
  }

  stop() {
    if (this._frame !== null) cancelAnimationFrame(this._frame);
    this._frame = null;
    this._zxingControls?.stop();
    this._zxingControls = null;
    this._pendingReject?.(new BarcodeStoppedError());
    this._pendingReject = null;
    this._state = 'idle';
    this._detector = null;
    this._onCode = null;
  }

  pause() {
    if (this._state === 'running') this._state = 'paused';
  }

  resume() {
    if (this._state === 'paused') this._state = 'running';
  }

  /** @private @param {HTMLVideoElement} videoElement */
  _scanFrame(videoElement) {
    if (this._state !== 'running' || !this._detector) return;
    this._detector.detect(videoElement).then((results) => {
      const result = results[0];
      if (result && this._onCode) {
        const normalized = normalizeResult(result);
        const now = Date.now();
        if (now - (this._lastReads.get(normalized.value) ?? 0) >= this._duplicateDelayMs) {
          this._lastReads.set(normalized.value, now);
          this._onCode(normalized);
        }
      }
    }).catch(() => {}).finally(() => {
      if (this._state === 'running') this._frame = requestAnimationFrame(() => this._scanFrame(videoElement));
    });
  }

  /** @private @param {HTMLVideoElement} videoElement @returns {Promise<void>} */
  async _startZXing(videoElement) {
    const { BrowserMultiFormatReader } = await loadZXing();
    const reader = new BrowserMultiFormatReader();
    this._zxingControls = await reader.decodeFromVideoElement(videoElement, (result) => {
      if (!result || !this._onCode || this._state !== 'running') return;
      const normalized = normalizeZXingResult(result);
      const now = Date.now();
      if (now - (this._lastReads.get(normalized.value) ?? 0) >= this._duplicateDelayMs) {
        this._lastReads.set(normalized.value, now);
        this._onCode(normalized);
      }
    });
  }

  /** @private @param {HTMLVideoElement} videoElement @param {number} timeoutMs @returns {Promise<BarcodeResult>} */
  async _scanOnceZXing(videoElement, timeoutMs) {
    const { BrowserMultiFormatReader } = await loadZXing();
    const reader = new BrowserMultiFormatReader();
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        this._zxingControls?.stop();
        this._zxingControls = null;
        this._pendingReject = null;
        this._state = 'idle';
        reject(new BarcodeTimeoutError());
      }, timeoutMs);
      this._pendingReject = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this._pendingReject = null;
        reject(error);
      };
      this._state = 'running';
      reader.decodeFromVideoElement(videoElement, (result, _error, controls) => {
        this._zxingControls = controls;
        if (settled || !result) return;
        settled = true;
        clearTimeout(timeout);
        controls.stop();
        this._zxingControls = null;
        this._pendingReject = null;
        this._state = 'idle';
        resolve(normalizeZXingResult(result));
      }).catch((error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this._pendingReject = null;
        this._state = 'idle';
        reject(new BarcodeScannerError('ZXing barcode detection failed', error instanceof Error ? error : undefined));
      });
    });
  }
}

/** @returns {Promise<{ BrowserMultiFormatReader: new () => { decodeFromVideoElement(video: HTMLVideoElement, callback: ZXingCallback): Promise<ZXingControlsLike> } }>} */
function loadZXing() {
  return import(/* @vite-ignore */ ZXING_URL);
}

/** @typedef {{ detect(video: HTMLVideoElement): Promise<Array<{rawValue: string, format: string}>> }} BarcodeDetectorLike */
/** @typedef {{ stop(): void }} ZXingControlsLike */
/** @typedef {{ getText(): string, getBarcodeFormat(): unknown }} ZXingResultLike */
/** @typedef {(result: ZXingResultLike | undefined, error: unknown | undefined, controls: ZXingControlsLike) => void} ZXingCallback */

/** @param {string[]} [formats] @returns {BarcodeDetectorLike} */
function createDetector(formats) {
  const globalObject = /** @type {Record<string, unknown>} */ (globalThis);
  const Constructor = /** @type {new (options?: {formats?: string[]}) => BarcodeDetectorLike} */ (globalObject.BarcodeDetector);
  if (!Constructor) throw new BarcodeUnsupportedError('This browser does not provide BarcodeDetector');
  return new Constructor(formats ? { formats } : undefined);
}

/** @param {'native' | 'zxing'} [preferredEngine] @returns {boolean} */
function shouldUseNative(preferredEngine) {
  const globalObject = /** @type {Record<string, unknown>} */ (globalThis);
  return preferredEngine !== 'zxing' && typeof globalObject.BarcodeDetector === 'function';
}

/** @param {{rawValue: string, format: string}} detected @returns {BarcodeResult} */
function normalizeResult(detected) {
  return { value: detected.rawValue, format: detected.format, rawFormat: detected.format, source: 'native' };
}

/** @param {ZXingResultLike} detected @returns {BarcodeResult} */
function normalizeZXingResult(detected) {
  const format = String(detected.getBarcodeFormat()).toLowerCase();
  return { value: detected.getText(), format, rawFormat: format, source: 'zxing' };
}
