# 🔬 StegaLens

**An interactive LSB image steganography laboratory.** Hide text inside an image, then *see* exactly how it was hidden: down to the individual bit.

[![Deploy](https://github.com/reallyngb/stegolens/actions/workflows/deploy.yml/badge.svg)](https://github.com/reallyngb/stegolens/actions/workflows/deploy.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![React](https://img.shields.io/badge/React-Vite-61dafb)
![Tests](https://img.shields.io/badge/tests-35%20passing-brightgreen)

---

## Table of Contents

- [Try it](#try-it)
- [What is LSB Steganography?](#what-is-lsb-steganography)
- [Features](#features)
- [How it works](#how-it-works)
- [Payload Format](#payload-format)
- [Embedding Modes](#embedding-modes)
- [Project Structure](#project-structure)
- [Run Locally](#run-locally)
- [Run Tests](#run-tests)
- [Limitations](#limitations)
- [Further Reading](#further-reading)
- [Author and License](#author-and-license)

---

## Try it

🌐 **Live demo:** [https://reallyngb.github.io/stegolens/](https://reallyngb.github.io/stegolens/)

Deployed automatically to GitHub Pages by a GitHub Actions pipeline on every push to `main`.

---

## What is LSB Steganography?

**Steganography hides the *existence* of a message. Encryption hides its *content*.**

Every pixel is made of Red, Green and Blue channels. Each channel is one byte (0–255). The rightmost bit is the **Least Significant Bit (LSB)**. Flipping it changes the value by at most **1 out of 255**, which is invisible to the human eye.

```text
Original channel value : 180  =  1011010 0
Secret bit to hide     :  1                ▲
                                           │ only this bit changes
Stego channel value    : 181  =  1011010 1
```

```text
10110100  →  10110101
```

Repeat this across thousands of channels and an entire message disappears into the image.

---

## Features

| Tool | What it shows |
|---|---|
| **Encode / Decode** | Hide and extract UTF-8 messages (including emoji and non-Latin scripts) |
| **Pixel Microscope** | Click any pixel to see its RGB bytes in binary, before and after encoding |
| **Bit Write Operation viewer** | The exact bitwise equation executed on a single bit |
| **Difference Map** | Original minus stego, amplified ×100, which makes the hidden layer visible |
| **Capacity Meter** | How many bytes the chosen image and mode can hold |
| **LSB Distribution panel** | Ratio of 0s and 1s, the statistic forensic tools look at |

---

## How it works

Core operation, in `src/stego/bitstream.ts`:

```typescript
// Clear the LSB with AND, then set the secret bit with OR
const newValue = (oldValue & 0b11111110) | secretBit;
```

The encoder walks the image pixel by pixel, row by row, writing one payload bit into the LSB of each selected channel. The alpha channel is never touched.

---

## Payload Format

Raw text dumped into an image can't be located, bounded or validated. StegaLens wraps every message in a custom binary format called **STGL**:

| Offset | Size | Field | Description |
|---:|---:|---|---|
| `0` | 4 | **Magic** | `0x53 0x54 0x47 0x4C` (`"STGL"`) identifies a StegaLens payload |
| `4` | 1 | **Version** | Format version (`0x01`) |
| `5` | 1 | **Flags** | Reserved feature flags |
| `6` | 1 | **Encoding** | `0x01` = UTF-8 |
| `7` | 4 | **Message Length** | Big-endian `uint32`, length `N` in bytes |
| `11` | N | **Message** | The payload itself |
| `11 + N` | 4 | **CRC-32 Checksum** | Big-endian `uint32` integrity check over the message |

Total overhead: **15 bytes** (11-byte header + 4-byte trailer).

---

## Embedding Modes

| Mode | Bits per pixel | Trade-off |
|---|:---:|---|
| **RGB** | 3 | Maximum capacity |
| **Red only** | 1 | ~66% less capacity, different statistical footprint |
| **Green only** | 1 | ~66% less capacity, different statistical footprint |
| **Blue only** | 1 | ~66% less capacity, different statistical footprint |

---

## Project Structure

```text
stegolens/
├── .github/workflows/deploy.yml   # CI/CD: test → build → deploy
├── src/
│   ├── stego/                     # Pure TypeScript engine (NO React imports)
│   │   ├── bitstream.ts           #   bit primitives
│   │   ├── encoder.ts             #   embed + channel iterator
│   │   ├── payload.ts             #   STGL format + CRC-32
│   │   └── difference.ts          #   difference-map maths
│   ├── components/                # React UI layer
│   ├── pages/
│   └── App.tsx
├── tests/                         # Vitest suite (35 tests)
├── ARCHITECTURE.md
├── SECURITY.md
└── LICENSE
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the reasoning behind this layout.

---

## Run Locally

```bash
git clone https://github.com/reallyngb/stegolens.git
cd stegolens
npm install
npm run dev
```

**Stack:** Vite · React · TypeScript (strict) · Tailwind CSS

---

## Run Tests

```bash
npm test
```

**35 automated tests** (Vitest) covering the UTF-8 encoder, bit primitives, payload checksum, alpha-channel preservation, and edge cases (empty strings, very large strings, emoji, Japanese text). The key invariant:

```text
decode(encode(image, msg)) === msg
```

---

## Limitations

StegaLens is an **educational** tool. Be honest about what LSB steganography cannot do:

- ❌ **It is not encryption.** The message is hidden, not protected. Anyone who knows to extract LSBs can read it. Encrypt first if confidentiality matters.
- ❌ **It is fragile against JPEG compression.** Lossy compression (including WhatsApp, Instagram and Facebook re-encoding) alters pixel values and destroys the payload. Use lossless formats such as PNG.
- ❌ **It is statistically detectable.** Embedded data makes the LSB plane look random, which Chi-Square analysis can flag.

Full analysis in [SECURITY.md](./SECURITY.md).

---

## Further Reading

- [ARCHITECTURE.md](./ARCHITECTURE.md): separation of concerns, testing strategy, CI/CD
- [SECURITY.md](./SECURITY.md): threat model, bitwise maths, detectability, CRC-32

---

## Author and License

**Joel Akinsanya** ([@reallyngb](https://github.com/reallyngb)) · [LinkedIn](https://linkedin.com/in/joelakinsanya)

Released under a **custom source-available license**: attribution is required (credit the author and link back to this repository) and **commercial use requires written permission**. See [LICENSE](./LICENSE).
