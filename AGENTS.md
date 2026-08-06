# AI Development Guidelines

## Repository Purpose

This repository provides reusable browser device utilities for Guadalstore web projects.

The first scope is:

- Camera access and photo capture.
- Barcode scanning.
- Shared browser media helpers.
- Robust lifecycle and error handling for mobile and desktop browsers.

This package must stay independent from product-specific pages, Odoo logic, backend code, and UI frameworks.

The barcode reader depends on camera input because some devices and browsers can auto-detect barcodes, while others require implementing barcode scanning over the live camera stream.

## Language And Tooling

Use plain JavaScript, not TypeScript.

Do not introduce `.ts` files or TypeScript-only syntax.

Type safety should be achieved with:

- JSDoc annotations.
- `// @ts-check` in JavaScript files.
- TypeScript compiler in `checkJs` mode.
- ESLint rules that detect likely type and runtime errors.

Preferred `package.json` scripts:

```json
{
  "type": "module",
  "scripts": {
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "test": "vitest"
  }
}
```

Use `tsconfig.json` only for checking JavaScript:

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "strict": true,
    "module": "ESNext",
    "target": "ES2022",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src/**/*.js", "tests/**/*.js"]
}
```

## Architecture

Keep the package framework-independent.

Recommended structure:

```text
src/
  camera/
    CameraController.js
    CameraError.js
    types.js
    index.js

  barcode/
    BarcodeScannerController.js
    BarcodeError.js
    types.js
    index.js

  media/
    devices.js
    permissions.js
    stream.js
    index.js

  index.js
```

Avoid React, Vue, Svelte, Shadow DOM, or product-specific UI inside the core package.

UI wrappers can be created later in separate packages or inside each product.

## Page Integration Model

This package is controlled by the web page through plain JavaScript imports.

The shared package must expose controller classes and small helper functions. It must not own the page UI.

Example usage:

```js
import {
  BarcodeScannerController,
  CameraController,
} from "@guadalstore/browser-devices";

const camera = new CameraController();
const scanner = new BarcodeScannerController();

await camera.start({
  videoElement,
  facingMode: "environment",
});

const result = await scanner.scanOnce({
  videoElement,
  timeoutMs: 30000,
});

console.log(result.value);

scanner.stop();
camera.stop();
```

Product pages are responsible for:

- Buttons.
- Forms.
- Modals.
- Loading states.
- Error messages.
- Odoo/backend communication.
- Navigation flow.

The shared package is responsible for:

- Camera lifecycle.
- Stream cleanup.
- Barcode detection loop.
- Duplicate filtering.
- Typed errors.
- Browser compatibility.

## Core Design Rule

Camera and barcode are related but not the same abstraction.

The camera module owns:

- Opening the camera.
- Selecting devices.
- Starting and stopping streams.
- Attaching streams to video elements.
- Taking photos.
- Cleaning up `MediaStreamTrack`s.

The barcode module owns:

- Reading barcodes from an existing camera/video stream.
- Choosing scanner implementation.
- Filtering duplicate reads.
- Pausing and resuming scanning.
- Returning normalized barcode results.

Important: barcode scanning depends on camera input, but the barcode controller should not hide all camera behavior. Some devices can auto-detect barcodes natively, while others require scanning over the live camera feed. Design the API so both cases can be supported.

## Camera Ownership

The camera controller owns the camera stream.

The barcode controller reads from a video element or stream, but it should not silently open or close the camera unless the API explicitly says so.

Preferred flow:

```js
await camera.start({ videoElement });
const code = await scanner.scanOnce({ videoElement });
camera.stop();
```

The scanner may stop its own detection loop after finding a barcode, but it should not stop the camera stream by default.

## Camera API

Target public API:

```js
const camera = new CameraController();

await camera.start({
  videoElement,
  facingMode: "environment",
});

const photo = await camera.takePhoto();

camera.stop();
```

Camera controller responsibilities:

- Validate browser support.
- Request camera permission.
- Prefer back camera on mobile when requested.
- Expose the active stream.
- Stop every track during cleanup.
- Avoid leaking camera usage after navigation or errors.
- Provide clear errors for permission denied, no device, unsupported browser, and stream failure.

## Barcode API

Target public API:

```js
const scanner = new BarcodeScannerController();

await scanner.start({
  videoElement,
  onCode(code) {
    console.log(code.value);
  },
});

scanner.stop();
```

Barcode result shape:

```js
{
  value: "8437000000000",
  format: "ean_13",
  rawFormat: "ean_13",
  source: "native"
}
```

The scanner should support this strategy:

1. Use native `BarcodeDetector` when available.
2. Fall back to a library such as ZXing when native detection is unavailable.
3. Keep the public result format stable regardless of implementation.

## Barcode Scan Modes

The barcode controller must support two different usage modes.

### Scan Once

Use this when the page wants to open the camera, wait until a barcode is detected, then continue.

Target API:

```js
const code = await scanner.scanOnce({
  videoElement,
  timeoutMs: 30000,
  formats: ["ean_13", "qr_code"],
});
```

Expected behavior:

- Start the barcode detection loop.
- Resolve the promise when the first valid barcode is detected.
- Stop the barcode loop automatically after detection.
- Leave the camera running by default, because the camera is owned by `CameraController`.
- Reject with a typed error on timeout, unsupported browser, scanner failure, or manual stop.

This is the preferred mode for workflows like:

- Scan one product barcode.
- Wait until the user presents a code.
- Read one label and move to the next screen.

### Continuous Scan

Use this when the page wants to keep reading codes until the user stops manually.

Target API:

```js
await scanner.start({
  videoElement,
  duplicateDelayMs: 1000,
  onCode(code) {
    console.log(code.value);
  },
});

scanner.stop();
```

Expected behavior:

- Keep scanning until `stop()` is called.
- Avoid repeated callbacks for the same code inside `duplicateDelayMs`.
- Support `pause()` and `resume()`.

## Barcode And Camera Relationship

Do not assume every barcode use case needs the same camera flow.

The design should allow:

```js
await camera.start({ videoElement });
await scanner.start({ videoElement });
```

And later also allow more advanced modes, for example:

```js
await scanner.start({
  stream: camera.stream,
  videoElement,
  preferredEngine: "native",
});
```

Barcode code must not duplicate low-level camera cleanup logic unless absolutely necessary. Prefer reusing media helpers.

## Error Handling

Use explicit custom errors.

Examples:

```text
CameraPermissionError
CameraNotFoundError
CameraUnsupportedError
CameraStartError
BarcodeUnsupportedError
BarcodeTimeoutError
BarcodeScannerError
```

Errors should be useful for UI code. Product apps need to distinguish:

- User denied permission.
- Browser does not support camera.
- No camera exists.
- Camera already in use.
- Barcode scanning is unsupported.
- Barcode scan timed out.
- Scanner failed unexpectedly.

## Lifecycle Rules

Every controller must have predictable lifecycle methods:

```js
start()
stop()
pause()
resume()
```

Rules:

- `stop()` must be safe to call more than once.
- `start()` should not create duplicate active loops.
- `scanOnce()` should not leave a running detection loop after resolving or rejecting.
- Camera streams must always stop all tracks.
- Barcode scan loops must stop when requested.
- Cleanup must happen when initialization fails halfway.
- Avoid global mutable state.

## Duplicate Barcode Reads

Barcode readers often detect the same code many times.

Implement duplicate filtering with configurable options:

```js
await scanner.start({
  videoElement,
  duplicateDelayMs: 1000,
  onCode(code) {
    // Called only once per code within duplicateDelayMs.
  },
});
```

Default behavior should avoid repeated callbacks for the same barcode in a short time window.

## Browser Compatibility

Prioritize real browser behavior over ideal API design.

Important cases:

- Mobile Chrome on Android.
- Mobile Safari on iOS.
- Desktop Chrome and Firefox.
- HTTPS requirement for camera APIs.
- Permission denial.
- Device labels unavailable before permission is granted.
- Back camera selection may fail or be ignored.

Do not assume browser APIs are always available.

Always feature-detect:

```js
if (!navigator.mediaDevices?.getUserMedia) {
  throw new CameraUnsupportedError();
}
```

For native barcode:

```js
if ("BarcodeDetector" in globalThis) {
  // Use native implementation.
}
```

## Testing

Use unit tests for pure logic:

- Error classes.
- Device filtering.
- Stream cleanup helpers.
- Duplicate barcode filtering.
- Scanner state transitions.
- `scanOnce()` resolve, timeout, stop, and failure behavior.

Browser/device behavior should have a plain HTML example app for manual testing.

Suggested example:

```text
examples/plain-html/
  index.html
  main.js
```

The example should allow testing:

- Start camera.
- Stop camera.
- Take photo.
- Start barcode scanner.
- Scan once until detected.
- Stop barcode scanner.
- Show last barcode result.
- Show errors clearly.

## Coding Style

Use modern JavaScript modules.

Good:

```js
export class CameraController {
}
```

Avoid CommonJS:

```js
module.exports = {};
```

Use English for all code, comments, docs, errors, and public API names.

Keep comments short and useful. Prefer readable code over explaining obvious lines.

## Dependency Policy

Keep dependencies minimal.

Allowed if useful:

- ESLint.
- TypeScript only for `checkJs` validation.
- Vitest.
- A barcode fallback library such as `@zxing/browser`.

Avoid adding UI frameworks, state managers, or build complexity unless needed.

## Public API Stability

Export only intentional APIs from `src/index.js`.

Good:

```js
export { CameraController } from "./camera/index.js";
export { BarcodeScannerController } from "./barcode/index.js";
export { listVideoInputDevices } from "./media/index.js";
```

Do not expose internal helper functions unless they are meant to be reused by apps.

## Non-Goals

This package should not contain:

- OdooRPC code.
- Product-specific workflows.
- Product-specific CSS.
- Checkout, stock, sales, or inventory logic.
- React or Vue components unless a separate UI package is created later.
- Backend code.

## Development Priority

Build in this order:

1. Camera lifecycle.
2. Camera photo capture.
3. Media device listing.
4. Barcode `scanOnce()` using native `BarcodeDetector`.
5. Barcode continuous scanning using native `BarcodeDetector`.
6. Barcode fallback implementation.
7. Duplicate scan filtering.
8. Plain HTML example.
9. Tests for lifecycle and pure logic.
