# Barcode Fixtures

Put barcode images in this directory and add one entry to `manifest.json` for
each image:

```json
{
  "fixtures": [
    {
      "file": "product-ean13.png",
      "value": "8437000000000",
      "format": "ean_13"
    }
  ]
}
```

Supported image formats are `.png`, `.jpg`, and `.jpeg`. The test uses ZXing's
Node-compatible decoder and checks `value`; `format` is checked when present.

Run the fixture test with:

```bash
npm test -- --run tests/barcode-fixtures.test.js
```
