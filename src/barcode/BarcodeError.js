export class BarcodeError extends Error {
  /** @param {string} message @param {string} code @param {Error} [cause] */
  constructor(message, code, cause) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    if (cause) this.cause = cause;
  }
}

export class BarcodeUnsupportedError extends BarcodeError {
  /** @param {string} [message] @param {Error} [cause] */
  constructor(message, cause) { super(message ?? 'Barcode scanning is not supported', 'BARCODE_UNSUPPORTED', cause); }
}
export class BarcodeTimeoutError extends BarcodeError {
  /** @param {string} [message] @param {Error} [cause] */
  constructor(message, cause) { super(message ?? 'Barcode scan timed out', 'BARCODE_TIMEOUT', cause); }
}
export class BarcodeScannerError extends BarcodeError {
  /** @param {string} [message] @param {Error} [cause] */
  constructor(message, cause) { super(message ?? 'Barcode scanner failed', 'BARCODE_SCANNER_ERROR', cause); }
}
export class BarcodeStoppedError extends BarcodeError {
  /** @param {string} [message] @param {Error} [cause] */
  constructor(message, cause) { super(message ?? 'Barcode scan was stopped', 'BARCODE_STOPPED', cause); }
}
