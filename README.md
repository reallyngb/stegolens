# StegaLens

**See what steganography actually changes.**

An interactive LSB image steganography laboratory. Inspect every bit as it is written into the pixels.

**Author:** Joel Akinsanya (@reallyngb)
**Repository:** https://github.com/reallyngb/stegolens

---

## Copyright and license

Copyright (c) 2026 Joel Akinsanya (@reallyngb). All rights reserved.

This project is source-available. See LICENSE for the full terms.

Key points:
- Attribution is mandatory. Any use must retain the copyright notice, author name, and link to https://github.com/reallyngb/stegolens.
- Commercial use requires written permission.
- Removing or altering the copyright notice is a violation of copyright law and will be enforced.

---

## Features

- LSB steganography with a documented payload container (STGL magic + CRC-32)
- UTF-8 message support including emoji
- Pixel Microscope - inspect any pixel RGB values in binary
- Bit Write Operation viewer - see the exact AND/OR math
- Difference map with 1x-100x amplification
- LSB distribution analysis
- Capacity meter
- Embedding modes: RGB, Red-only, Green-only, Blue-only
- 100 percent browser-local, no backend, no telemetry
- 35 automated tests (vitest)
- Challenge mode with three built-in puzzles

---

## How LSB steganography works

Each RGB channel of a pixel is an 8-bit number. The rightmost bit is the least significant bit. Changing it alters the channel value by at most 1.

Original: 180 = 10110100
Payload bit: 1
Result:   181 = 10110101

Formula: newValue = (oldValue AND 0b11111110) OR secretBit

---

## Payload format

Offset 0, size 4: Magic STGL (0x53 54 47 4C)
Offset 4, size 1: Version (0x01)
Offset 5, size 1: Flags (must be 0)
Offset 6, size 1: Encoding (0x01 = UTF-8)
Offset 7, size 4: Message length (big-endian)
Offset 11, size N: Message bytes
Offset 11+N, size 4: CRC-32 of message bytes

Traversal order: RGB, pixel by pixel, row-major. Alpha is never modified.

---

## Run locally

    npm install
    npm run dev

Open the URL it prints. Click Run Demo to try it without uploading anything.

## Run tests

    npm test

35 tests covering bit operations, UTF-8, payload container, CRC-32, encoder round-trip, alpha preservation, capacity overflow, and decoder error paths.

---

## Limitations

- Recompression (JPEG) destroys LSB payloads. Use PNG.
- LSB embedding is statistically detectable.
- Missing a StegaLens header does not prove an image is clean.
- This is educational, not an operational covert channel.

---

## Author

Joel Akinsanya
GitHub: https://github.com/reallyngb
Project: https://github.com/reallyngb/stegolens

---

## License

Custom source-available license. See LICENSE.

Copyright (c) 2026 Joel Akinsanya. All rights reserved.
