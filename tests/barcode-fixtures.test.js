import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import jpeg from 'jpeg-js';
import { BarcodeFormat, BinaryBitmap, DecodeHintType, MultiFormatReader, RGBLuminanceSource, HybridBinarizer } from '@zxing/library';
import { PNG } from 'pngjs';
import { describe, expect, test } from 'vitest';

const directory = fileURLToPath(new URL('../fixtures/barcodes/', import.meta.url));
const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'));

/** @typedef {{ file: string, value: string, format?: string }} BarcodeFixture */

describe('barcode image fixtures', () => {
  test('manifest is available', () => {
    expect(Array.isArray(manifest.fixtures)).toBe(true);
  });

  test.each(/** @type {BarcodeFixture[]} */ (manifest.fixtures))('%s decodes the expected barcode', (fixture) => {
    const image = readImage(join(directory, fixture.file));
    const pixels = toArgbPixels(image.data, image.width, image.height);
    const source = new RGBLuminanceSource(pixels, image.width, image.height);
    const bitmap = new BinaryBitmap(new HybridBinarizer(source));
    const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.AZTEC,
      BarcodeFormat.CODABAR,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.CODE_128,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.EAN_8,
      BarcodeFormat.EAN_13,
      BarcodeFormat.ITF,
      BarcodeFormat.MAXICODE,
      BarcodeFormat.PDF_417,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
    ]]]);
    const result = new MultiFormatReader().decode(bitmap, hints);

    expect(result.getText()).toBe(fixture.value);
    if (fixture.format) expect(formatName(result.getBarcodeFormat())).toBe(fixture.format.toLowerCase());
  });
});

/** @param {string} file @returns {{ data: Uint8Array, width: number, height: number }} */
function readImage(file) {
  const data = readFileSync(file);
  const extension = extname(file).toLowerCase();
  if (extension === '.png') {
    const image = PNG.sync.read(data);
    return { data: image.data, width: image.width, height: image.height };
  }
  if (extension === '.jpg' || extension === '.jpeg') {
    const image = jpeg.decode(data, { useTArray: true });
    return { data: image.data, width: image.width, height: image.height };
  }
  throw new Error(`Unsupported fixture image format: ${extension}`);
}

/** @param {Uint8Array} rgba @param {number} width @param {number} height @returns {Int32Array} */
function toArgbPixels(rgba, width, height) {
  const channels = rgba.length / (width * height);
  const pixels = new Int32Array(width * height);
  for (let index = 0; index < pixels.length; index += 1) {
    const offset = index * channels;
    pixels[index] = (rgba[offset] << 16) | (rgba[offset + 1] << 8) | rgba[offset + 2];
  }
  return pixels;
}

/** @param {unknown} format @returns {string} */
function formatName(format) {
  const names = [
    'aztec', 'codabar', 'code_39', 'code_93', 'code_128', 'data_matrix',
    'ean_8', 'ean_13', 'itf', 'maxicode', 'pdf_417', 'qr_code', 'rss_14',
    'rss_expanded', 'upc_a', 'upc_e', 'upc_ean_extension', 'micro_qr_code',
  ];
  return typeof format === 'number' ? names[format] ?? String(format) : String(format).toLowerCase();
}
