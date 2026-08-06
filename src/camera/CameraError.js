export class CameraError extends Error {
  /** @param {string} message @param {string} code @param {Error} [cause] */
  constructor(message, code, cause) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    if (cause) this.cause = cause;
  }
}

export class CameraPermissionError extends CameraError {
  /** @param {string} [message] @param {Error} [cause] */
  constructor(message, cause) { super(message ?? 'Camera permission was denied', 'CAMERA_PERMISSION_DENIED', cause); }
}

export class CameraNotFoundError extends CameraError {
  /** @param {string} [message] @param {Error} [cause] */
  constructor(message, cause) { super(message ?? 'No camera was found', 'CAMERA_NOT_FOUND', cause); }
}

export class CameraUnsupportedError extends CameraError {
  /** @param {string} [message] @param {Error} [cause] */
  constructor(message, cause) { super(message ?? 'Camera access is not supported', 'CAMERA_UNSUPPORTED', cause); }
}

export class CameraStartError extends CameraError {
  /** @param {string} [message] @param {Error} [cause] */
  constructor(message, cause) { super(message ?? 'The camera could not be started', 'CAMERA_START_FAILED', cause); }
}

export class CameraConstraintError extends CameraError {
  /** @param {string} [message] @param {Error} [cause] */
  constructor(message, cause) { super(message ?? 'Camera settings could not be applied', 'CAMERA_CONSTRAINT_FAILED', cause); }
}
