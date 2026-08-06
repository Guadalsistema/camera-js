# camera-js

Small, framework-independent browser camera and barcode utilities.

## Purpose

- Camera access and photo capture
- Barcode scanning
- Shared browser media helpers
- Native `BarcodeDetector` scanning with `@zxing/browser` fallback

Native detection is preferred when available. Browsers without
`BarcodeDetector` load `@zxing/browser` from `esm.sh` automatically. The
fallback therefore requires network access to the CDN.

## Public API

```js
import {
  CameraController,
  BarcodeScannerController,
  listVideoInputDevices,
  getCameraPermissionState,
  stopMediaStream,
  attachStream,
  detachStream
} from '@guadalstore/browser-devices';

// Camera operations
const camera = new CameraController();
await camera.start({ videoElement });

// Values and ranges reported by the active camera track
console.log(camera.capabilities);
console.log(camera.settings);

// External UI can apply any browser-supported MediaTrackConstraints
const settings = await camera.applyConstraints({
  advanced: [{ zoom: 2 }]
});

// Barcode operations
const scanner = new BarcodeScannerController();
const result = await scanner.scanOnce({ videoElement });

// Media helpers
const devices = await listVideoInputDevices();
```

## Install From GitHub

This package is consumed directly from GitHub and does not need to be
published to the npm registry:

```bash
npm install github:Guadalsistema/camera-js
```

Then import it normally:

```js
import { CameraController, BarcodeScannerController } from
  '@guadalstore/browser-devices';
```

## Examples

The Docker image serves two manual test pages:

- `http://localhost:8080/camera`
- `http://localhost:8080/barcode`

Camera APIs require a secure context in normal browsers. `localhost` is treated
as secure by modern browsers.

```bash
docker build -t camera-js .
docker run --rm -p 8080:8080 camera-js
```

The barcode page works with native `BarcodeDetector` or the ZXing CDN fallback.

## Development

```bash
# Install dependencies
npm install

# Run linter
npm run lint

# Run type checker
npm run typecheck

# Run tests
npm test

# Serve the examples without Docker
npm run serve
```
