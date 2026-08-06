import { test, expect } from 'vitest';
import { 
  CameraController,
  CameraError,
  CameraPermissionError,
  CameraNotFoundError,
  CameraUnsupportedError,
  CameraStartError,
  CameraConstraintError,
  BarcodeScannerController,
  BarcodeError,
  BarcodeUnsupportedError,
  BarcodeTimeoutError,
  BarcodeScannerError,
  BarcodeStoppedError,
  listVideoInputDevices,
  getCameraPermissionState,
  stopMediaStream,
  attachStream,
  detachStream
} from '../src/index.js';

// Test that all exports are present
test('should export all expected APIs', () => {
  expect(typeof CameraController).toBe('function');
  expect(typeof CameraError).toBe('function');
  expect(typeof CameraPermissionError).toBe('function');
  expect(typeof CameraNotFoundError).toBe('function');
  expect(typeof CameraUnsupportedError).toBe('function');
  expect(typeof CameraStartError).toBe('function');
  expect(typeof CameraConstraintError).toBe('function');
  expect(typeof BarcodeScannerController).toBe('function');
  expect(typeof BarcodeError).toBe('function');
  expect(typeof BarcodeUnsupportedError).toBe('function');
  expect(typeof BarcodeTimeoutError).toBe('function');
  expect(typeof BarcodeScannerError).toBe('function');
  expect(typeof BarcodeStoppedError).toBe('function');
  expect(typeof listVideoInputDevices).toBe('function');
  expect(typeof getCameraPermissionState).toBe('function');
  expect(typeof stopMediaStream).toBe('function');
  expect(typeof attachStream).toBe('function');
  expect(typeof detachStream).toBe('function');
});

// Test error instances
test('should create error instances correctly', () => {
  const cameraError = new CameraError('Test', 'TEST_CODE');
  expect(cameraError).toBeInstanceOf(Error);
  expect(cameraError.code).toBe('TEST_CODE');

  const barcodeError = new BarcodeError('Test', 'TEST_CODE');
  expect(barcodeError).toBeInstanceOf(Error);
  expect(barcodeError.code).toBe('TEST_CODE');
});

// Test controller states
test('should have correct initial states', () => {
  const camera = new CameraController();
  expect(camera.state).toBe('idle');

  const barcode = new BarcodeScannerController();
  expect(barcode.state).toBe('idle');
});
