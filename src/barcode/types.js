/**
 * @typedef {'native' | 'zxing'} BarcodeSource
 */

/**
 * @typedef {Object} BarcodeResult
 * @property {string} value
 * @property {string} format
 * @property {string} rawFormat
 * @property {BarcodeSource} source
 */

/**
 * @typedef {Object} BarcodeStartOptions
 * @property {HTMLVideoElement} videoElement
 * @property {(result: BarcodeResult) => void} onCode
 * @property {MediaStream} [stream]
 * @property {string[]} [formats]
 * @property {number} [duplicateDelayMs]
 * @property {'native' | 'zxing'} [preferredEngine]
 */

/**
 * @typedef {Object} BarcodeScanOnceOptions
 * @property {HTMLVideoElement} videoElement
 * @property {MediaStream} [stream]
 * @property {string[]} [formats]
 * @property {number} [timeoutMs]
 * @property {'native' | 'zxing'} [preferredEngine]
 */

/**
 * @typedef {'idle' | 'running' | 'paused'} BarcodeLifecycleState
 */

export {};
