# Repository Skeleton TODO

Use `AGENTS.md` as the source of truth. Implement only the package skeleton and
public interfaces in this pass. Keep runtime behavior to the minimum needed for
the modules to import, lint, and type-check.

## Scope Rules

- [ ] Use plain ESM JavaScript with `// @ts-check`; do not add TypeScript files.
- [ ] Add JSDoc for all public classes, methods, options, results, and exported
      helpers.
- [ ] Keep the package framework-independent and browser-only.
- [ ] Do not add React, Vue, Odoo, backend, product-specific, or UI code.
- [ ] Do not add ZXing or implement camera access, photo capture, detection
      loops, duplicate filtering, timers, permissions, or browser fallbacks yet.
- [ ] Do not invent compatibility layers or export internal-only helpers.
- [ ] Prefer small, explicit files and minimal placeholder bodies.

## 1. Project Tooling

- [ ] Create `package.json` with:
  - Package name `@guadalstore/browser-devices`.
  - `"type": "module"`.
  - An entry point and package export for `src/index.js`.
  - `lint`, `typecheck`, and `test` scripts.
  - Only ESLint, TypeScript, and Vitest development dependencies.
- [ ] Create `tsconfig.json` for strict JavaScript checking using the settings
      recommended in `AGENTS.md`.
- [ ] Add a minimal ESLint flat configuration for browser ESM JavaScript.
- [ ] Add a minimal `.gitignore` covering dependencies, coverage, and generated
      output.

## 2. Source Layout

- [ ] Create this structure exactly:

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

## 3. Camera Contracts

- [ ] In `src/camera/types.js`, define JSDoc types for at least:
  - `CameraFacingMode`: `"user" | "environment"`.
  - `CameraStartOptions`: required `HTMLVideoElement videoElement`, optional
    `CameraFacingMode facingMode`, optional `string deviceId`, and optional
    ideal `number width` and `number height`.
  - A camera lifecycle state union such as `"idle" | "starting" | "active" |
    "paused"`.
- [ ] In `src/camera/CameraError.js`, create and export:
  - `CameraError` base class with a stable string `code` property and optional
    error `cause`.
  - `CameraPermissionError`.
  - `CameraNotFoundError`.
  - `CameraUnsupportedError`.
  - `CameraStartError`.
- [ ] In `src/camera/CameraController.js`, expose this interface:
  - Read-only `stream` getter returning `MediaStream | null`.
  - Read-only `state` getter.
  - `start(options): Promise<void>`.
  - `takePhoto(): Promise<Blob>`.
  - `stop(): void`.
  - `pause(): void`.
  - `resume(): Promise<void>`.
- [ ] Keep controller implementation minimal:
  - Initialize private state and stream fields.
  - Make `stop()` idempotently reset skeleton state without implementing media
    cleanup.
  - Have unimplemented asynchronous operations reject with a clear
    `CameraUnsupportedError` or base `CameraError` saying the implementation is
    not available yet.
  - Do not call `navigator.mediaDevices`, attach a stream, draw a canvas, or
    manipulate tracks in this pass.
- [ ] Re-export intentional camera APIs from `src/camera/index.js`.

## 4. Barcode Contracts

- [ ] In `src/barcode/types.js`, define JSDoc types for at least:
  - `BarcodeSource`: initially `"native" | "zxing"`.
  - `BarcodeResult` with `value`, `format`, `rawFormat`, and `source`.
  - `BarcodeStartOptions` with required `HTMLVideoElement videoElement` and
    `onCode(result)` callback; optional `MediaStream stream`, `string[] formats`,
    `number duplicateDelayMs`, and `"native" | "zxing" preferredEngine`.
  - `BarcodeScanOnceOptions`, matching start input where relevant and adding
    optional `number timeoutMs` without requiring `onCode`.
  - A scanner lifecycle state union such as `"idle" | "running" | "paused"`.
- [ ] In `src/barcode/BarcodeError.js`, create and export:
  - `BarcodeError` base class with a stable string `code` property and optional
    error `cause`.
  - `BarcodeUnsupportedError`.
  - `BarcodeTimeoutError`.
  - `BarcodeScannerError`.
  - `BarcodeStoppedError` for manual cancellation of `scanOnce()`.
- [ ] In `src/barcode/BarcodeScannerController.js`, expose this interface:
  - Read-only `state` getter.
  - `start(options): Promise<void>`.
  - `scanOnce(options): Promise<BarcodeResult>`.
  - `stop(): void`.
  - `pause(): void`.
  - `resume(): void`.
- [ ] Keep scanner implementation minimal:
  - Initialize only lifecycle fields.
  - Make `stop()` idempotently reset skeleton state.
  - Have `start()` and `scanOnce()` reject with `BarcodeUnsupportedError`
    explaining that no scanner engine is implemented yet.
  - Do not open or stop a camera stream.
  - Do not implement `BarcodeDetector`, ZXing, animation frames, timers, or
    duplicate filtering in this pass.
- [ ] Re-export intentional barcode APIs from `src/barcode/index.js`.

## 5. Media Helper Contracts

- [ ] In `src/media/devices.js`, declare and export
      `listVideoInputDevices(): Promise<MediaDeviceInfo[]>`.
- [ ] In `src/media/permissions.js`, declare a JSDoc camera permission state and
      export `getCameraPermissionState(): Promise<PermissionState | "unknown">`.
- [ ] In `src/media/stream.js`, declare and export:
  - `stopMediaStream(stream): void`.
  - `attachStream(videoElement, stream): Promise<void>`.
  - `detachStream(videoElement): void`.
- [ ] Keep helper bodies minimal and side-effect free for this skeleton. Throw a
      clear base camera error for unsupported async operations; use safe no-op
      bodies only where the contract permits it.
- [ ] Re-export intentional media helpers from `src/media/index.js`.

## 6. Root Public API

- [ ] Export only these intentional APIs from `src/index.js`:
  - `CameraController` and camera error classes.
  - `BarcodeScannerController` and barcode error classes.
  - `listVideoInputDevices`, `getCameraPermissionState`, `stopMediaStream`,
    `attachStream`, and `detachStream`.
- [ ] Keep JSDoc-only types internal to their modules; do not attempt runtime
      exports for typedefs.
- [ ] Confirm importing `src/index.js` has no browser side effects and does not
      access `navigator`, `document`, or `window` at module evaluation time.

## 7. Minimal Tests And Documentation

- [ ] Add small Vitest tests only for skeleton guarantees:
  - Public entry-point exports exist.
  - Error classes preserve `name`, `code`, message, and cause.
  - Fresh controllers have the documented initial state.
  - Repeated `stop()` calls do not throw.
  - Placeholder async methods reject with the documented typed error.
- [ ] Do not mock browser media APIs or test future behavior in this pass.
- [ ] Replace the README placeholder with:
  - Package purpose and current skeleton status.
  - A public API overview.
  - A short usage example that clearly notes runtime camera and barcode engines
    are not implemented yet.
  - Development commands.

## 8. Verification

- [ ] Run dependency installation with the repository's package manager.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test -- --run`.
- [ ] Fix all failures without adding real browser-device implementation.
- [ ] Report created files, exported interfaces, verification results, and any
      deliberate placeholders.

## Definition Of Done

- The repository has the architecture described in `AGENTS.md`.
- Consumers can import the planned public names and inspect their documented
  interfaces.
- JavaScript passes strict JSDoc type checking and linting.
- Tests establish the skeleton contracts without pretending camera or barcode
  functionality works.
- No camera acquisition, photo capture, barcode detection, fallback engine,
  example UI, or product integration is implemented.
