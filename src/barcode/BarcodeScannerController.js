import { BarcodeScannerError, BarcodeStoppedError, BarcodeTimeoutError, BarcodeUnsupportedError } from './BarcodeError.js';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

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
  /** @private @type {ZXingReaderLike | null} */
  _zxingReader = null;
  /** @private @type {((result: BarcodeResult) => void) | null} */
  _onCode = null;
  /** @private @type {((error: import('./BarcodeError.js').BarcodeError) => void) | null} */
  _onError = null;
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
    this._onError = options.onError ?? null;
    this._duplicateDelayMs = options.duplicateDelayMs ?? 1000;
    this._state = 'running';
    try {
      if (shouldUseNative(options.preferredEngine)) {
        this._detector = createDetector(options.formats);
        this._scanFrame(options.videoElement);
      } else {
        await this._startZXing(options.videoElement, options.formats);
      }
    } catch (error) {
      this.stop();
      throw toScannerError(error, 'ZXing barcode scanner failed to start');
    }
  }

  /** @param {BarcodeScanOnceOptions} options @returns {Promise<BarcodeResult>} */
  async scanOnce(options) {
    this.stop();
    if (!shouldUseNative(options.preferredEngine)) {
      return this._scanOnceZXing(options.videoElement, options.timeoutMs ?? 30000, options.formats);
    }
    const detector = createDetector(options.formats);
    const timeoutMs = options.timeoutMs ?? 30000;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this._pendingReject = null;
        this.stop();
        this._state = 'idle';
        reject(new BarcodeTimeoutError());
      }, timeoutMs);
      this._pendingReject = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
      const scan = async () => {
        if (this._state === 'idle') {
          this._pendingReject?.(new BarcodeStoppedError());
          return;
        }
        try {
          const results = await detector.detect(options.videoElement);
          if (results.length) {
            clearTimeout(timeout);
            this._pendingReject = null;
            this._state = 'idle';
            this._frame = null;
            resolve(normalizeResult(results[0]));
            return;
          }
        } catch (error) {
          clearTimeout(timeout);
          this._pendingReject = null;
          this._state = 'idle';
          reject(new BarcodeScannerError('Barcode detection failed', error instanceof Error ? error : undefined));
          return;
        }
        this._frame = requestAnimationFrame(scan);
      };
      this._state = 'running';
      this._frame = requestAnimationFrame(scan);
    });
  }

  stop() {
    if (this._frame !== null) cancelAnimationFrame(this._frame);
    this._frame = null;
    this._zxingControls?.stop();
    this._zxingControls = null;
    this._zxingReader?.reset?.();
    this._zxingReader = null;
    this._pendingReject?.(new BarcodeStoppedError());
    this._pendingReject = null;
    this._state = 'idle';
    this._detector = null;
    this._onCode = null;
    this._onError = null;
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
    }).catch((error) => {
      this._reportError(toScannerError(error, 'Barcode detection failed'));
    }).finally(() => {
      if (this._state === 'running') this._frame = requestAnimationFrame(() => this._scanFrame(videoElement));
    });
  }

  /** @param {HTMLVideoElement} videoElement @param {string[]} [formats] @returns {Promise<void>} */
  async _startZXing(videoElement, formats) {
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const reader = new BrowserMultiFormatReader(createHints(formats));
    this._zxingReader = /** @type {ZXingReaderLike} */ (reader);
    this._zxingControls = await reader.decodeFromVideoElement(videoElement, (result, error) => {
      if (error && error.name !== 'NotFoundException') {
        this._reportError(toScannerError(error, 'ZXing barcode detection failed'));
      }
      if (!result || !this._onCode || this._state !== 'running') return;
      const normalized = normalizeZXingResult(result);
      const now = Date.now();
      if (now - (this._lastReads.get(normalized.value) ?? 0) >= this._duplicateDelayMs) {
        this._lastReads.set(normalized.value, now);
        this._onCode(normalized);
      }
    });
  }

  /** @param {HTMLVideoElement} videoElement @param {number} timeoutMs @param {string[]} [formats] @returns {Promise<BarcodeResult>} */
  async _scanOnceZXing(videoElement, timeoutMs, formats) {
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const reader = new BrowserMultiFormatReader(createHints(formats));
    this._zxingReader = /** @type {ZXingReaderLike} */ (reader);
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
        this._zxingReader?.reset?.();
        this._zxingReader = null;
        reject(toScannerError(error, 'ZXing barcode detection failed'));
      });
    });
  }

  /** @private @param {import('./BarcodeError.js').BarcodeError} error */
  _reportError(error) {
    this._onError?.(error);
  }
}

/** @typedef {{ detect(video: HTMLVideoElement): Promise<Array<{rawValue: string, format: string}>> }} BarcodeDetectorLike */
/** @typedef {{ stop(): void }} ZXingControlsLike */
/** @typedef {{ reset?(): void }} ZXingReaderLike */
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

/** @param {string[] | undefined} formats @returns {Map<import('@zxing/library').DecodeHintType, unknown> | undefined} */
function createHints(formats) {
  if (!formats) return undefined;
  // ZXing accepts its enum values through DecodeHintType.POSSIBLE_FORMATS.
  return /** @type {Map<import('@zxing/library').DecodeHintType, unknown>} */ (new Map([[DecodeHintType.POSSIBLE_FORMATS, formats.map((format) => formatToZXing(format)).filter((format) => format !== undefined)]]));
}

/** @param {string} format @returns {number | undefined} */
function formatToZXing(format) {
  const formats = /** @type {Record<string, number>} */ ({ aztec: BarcodeFormat.AZTEC, codabar: BarcodeFormat.CODABAR, code_39: BarcodeFormat.CODE_39,
    code_93: BarcodeFormat.CODE_93, code_128: BarcodeFormat.CODE_128, data_matrix: BarcodeFormat.DATA_MATRIX,
    ean_8: BarcodeFormat.EAN_8, ean_13: BarcodeFormat.EAN_13, itf: BarcodeFormat.ITF,
    maxicode: BarcodeFormat.MAXICODE, pdf_417: BarcodeFormat.PDF_417, qr_code: BarcodeFormat.QR_CODE,
    rss_14: BarcodeFormat.RSS_14, rss_expanded: BarcodeFormat.RSS_EXPANDED, upc_a: BarcodeFormat.UPC_A, upc_e: BarcodeFormat.UPC_E });
  return formats[format.toLowerCase()];
}

/** @param {unknown} error @param {string} message @returns {BarcodeScannerError} */
function toScannerError(error, message) {
  return error instanceof BarcodeScannerError ? error : new BarcodeScannerError(message, error instanceof Error ? error : undefined);
}
