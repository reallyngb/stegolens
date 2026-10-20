# Architecture

This document explains the engineering decisions behind StegaLens: how the code is organised, how it is tested, and how it ships.

## Contents

- [Design principles](#design-principles)
- [Separation of concerns](#separation-of-concerns)
- [Engine design](#engine-design)
- [Testing strategy](#testing-strategy)
- [CI/CD pipeline](#cicd-pipeline)
- [Production build fix: strict typing](#production-build-fix-strict-typing)
- [Tech stack](#tech-stack)

---

## Design principles

1. **Engine and UI must be independent.** The steganography logic is a library; the React app is one consumer of it.
2. **Fail loudly, never silently.** Wrong image, corrupted data or oversized message produces an explicit error, never garbage output.
3. **Prove correctness with tests**, not hope.
4. **Strict types everywhere.** Production builds must compile under strict TypeScript.

---

## Separation of concerns

```text
┌──────────────────────────────────────────────┐
│  UI LAYER (React)                            │
│  src/components/ · src/pages/ · src/App.tsx  │
│  State, Canvas rendering, user interaction   │
└───────────────────────┬──────────────────────┘
                        │ calls (arrays in, arrays out)
┌───────────────────────▼──────────────────────┐
│  ENGINE LAYER (pure TypeScript)              │
│  src/stego/                                  │
│  Bit ops · payload format · CRC-32 · diff    │
│  ZERO React imports                          │
└──────────────────────────────────────────────┘
```

| Layer | Location | Responsibility | May import React? |
|---|---|---|:---:|
| **UI** | `src/components`, `src/pages`, `src/App.tsx` | State, HTML Canvas, visualisation | ✅ |
| **Engine** | `src/stego` | Takes arrays of numbers, returns arrays of numbers | ❌ |

**Why it matters:** because `src/stego` has no framework or DOM dependency, it can be reused unchanged in a Node.js backend, a CLI tool or an AWS Lambda function, and it can be unit tested without a browser.

---

## Engine design

| Module | Role |
|---|---|
| `bitstream.ts` | Bit primitives, e.g. `writeBit` using `(c & 0b11111110) \| b`; tracks whether a pixel actually changed |
| `encoder.ts` | Pixel traversal and `channelIterator` (RGB / R / G / B modes) |
| `payload.ts` | STGL header serialisation with `DataView`, CRC-32 trailer |
| `difference.ts` | Amplified difference map: `min(255, abs(a - b) * 100)` |

Channel selection is a generator, so embedding modes add no branching to the hot loop:

```typescript
function* channelIterator(mode: EmbedMode) {
  if (mode === "red"   || mode === "rgb") yield 0;
  if (mode === "green" || mode === "rgb") yield 1;
  if (mode === "blue"  || mode === "rgb") yield 2;
}
```

The alpha channel (offset 3) is never yielded, so it is preserved byte for byte.

---

## Testing strategy

**35 automated tests** run with [Vitest](https://vitest.dev/).

| Area | What is verified |
|---|---|
| UTF-8 encoder | ASCII, emoji, Japanese, empty and very large strings |
| Bit primitives | Set/clear behaviour, no-op when bit already matches |
| Payload | Magic number, header layout, big-endian length |
| Checksum | Valid CRC passes; any modification fails |
| Alpha channel | Alpha bytes identical before and after encoding |
| Round trip | Full encode → decode cycle |

### The round-trip invariant

The most important property of the system:

```text
decode(encode(image, msg)) === msg
```

```typescript
// tests/encoder.test.ts
it("decode(encode(image, msg)) === msg", () => {
  const originalImage = makeImage(100, 100);
  const secretMessage = "This is a top secret message! 🔐";

  const encoded = encodeImage(originalImage, 100, 100, utf8Encode(secretMessage));
  const decoded = decodeImage(encoded.data, 100, 100);

  expect(utf8Decode(decoded.payload.message)).toBe(secretMessage);
});
```

If this passes across varied inputs, the encoder and decoder are exact inverses.

---

## CI/CD pipeline

Defined in `.github/workflows/deploy.yml`. On every push to `main`:

```text
git push ──▶ GitHub Actions runner (Linux)
                │
                ├─ 1. checkout + install dependencies
                ├─ 2. run the test suite      ── fail ─▶ stop, nothing deployed
                ├─ 3. production build (tsc strict + vite build)
                └─ 4. publish static output to GitHub Pages
```

Broken code cannot reach the live site: tests and the strict type-check gate every deployment.

**Live:** <https://reallyngb.github.io/stegolens/>

---

## Production build fix: strict typing

Development mode tolerated this; the strict production build did not. `ImageData` expects a specific typed-array overload, so passing a loosely typed buffer failed to compile.

```tsx
// ❌ Failed in the production build
new ImageData(image.original, width, height);

// ✅ Fixed: wrap the buffer in a fresh Uint8ClampedArray
new ImageData(new Uint8ClampedArray(image.original), width, height);
```

The wrapper also copies the data, which prevents the UI from accidentally mutating the engine's original pixel buffer.

---

## Tech stack

| Tool | Purpose |
|---|---|
| **Vite** | Fast dev server and production bundler |
| **React** | Component UI |
| **TypeScript (strict)** | Type safety |
| **Tailwind CSS** | Dark, terminal-inspired styling |
| **Vitest** | Unit testing |
| **GitHub Actions + Pages** | CI/CD and hosting |

---

Author: **Joel Akinsanya** ([@reallyngb](https://github.com/reallyngb))
