# Security Analysis & Threat Model

StegaLens is an **educational** tool. This document explains how it hides data, what protection that gives, and exactly where it fails.

## Contents

- [Summary](#summary)
- [The bitwise mechanism](#the-bitwise-mechanism)
- [Not encryption: obfuscation only](#not-encryption-obfuscation-only)
- [Statistical detectability (Chi-Square)](#statistical-detectability-chi-square)
- [JPEG compression destroys the payload](#jpeg-compression-destroys-the-payload)
- [Integrity: CRC-32 checksum](#integrity-crc-32-checksum)
- [Threat model](#threat-model)
- [Recommendations](#recommendations)

---

## Summary

| Property | Status |
|---|:---:|
| Confidentiality | ❌ None; obfuscation only |
| Undetectability | ❌ Detectable statistically |
| Survives lossy compression | ❌ No |
| Integrity detection | ✅ CRC-32 (accidental corruption only) |
| Authenticity / tamper-proofing | ❌ CRC is not a MAC |

---

## The bitwise mechanism

Each colour channel is one byte. The **Least Significant Bit** is the rightmost bit; changing it alters the value by at most 1.

```typescript
const newValue = (oldValue & 0b11111110) | secretBit;
```

| Step | Operation | Effect |
|---|---|---|
| 1 | `oldValue & 0b11111110` | **AND clears the LSB** and keeps the upper 7 bits |
| 2 | `\| secretBit` | **OR sets the new bit** into the cleared position |

Worked example, hiding a `1` in a channel value of 180:

```text
  10110100   oldValue (180)
& 11111110   mask
----------
  10110100   LSB cleared
| 00000001   secretBit = 1
----------
  10110101   newValue (181)
```

If the original LSB already equals the secret bit, the value does not change at all.

---

## Not encryption: obfuscation only

LSB steganography conceals **that a message exists**. It does nothing to protect **what the message says**.

- The algorithm is public. Anyone who suspects LSB embedding can extract the bits.
- StegaLens' STGL payload begins with a fixed magic number (`STGL`), so a StegaLens payload is trivially recognisable once the LSBs are read.
- The message is stored in plaintext.

> **Security through obscurity is not security.** If the content is sensitive, encrypt it with a vetted algorithm (e.g. AES-GCM) *before* embedding.

---

## Statistical detectability (Chi-Square)

In natural images, adjacent value pairs (e.g. 180 and 181) occur with **unequal frequencies**. Embedding changes this:

1. Encrypted or compressed payload bits are effectively **random**: roughly 50% zeros, 50% ones.
2. Writing them into LSBs makes each pair of values (2k, 2k+1) occur **about equally often**.
3. A **Chi-Square test** compares observed pair frequencies with the expected equalised distribution. A close match means a high probability that data is embedded.

```text
Natural image LSB plane     →  structured, uneven 0/1 distribution
After full-capacity embed   →  near-uniform 0/1 distribution  ← red flag
```

StegaLens exposes this in its **LSB Distribution panel** so users can see detectability directly. Embedding fewer bytes, or using a single channel, reduces but does not remove the signal.

---

## JPEG compression destroys the payload

JPEG is **lossy**. It does not store pixels; it stores quantised frequency coefficients:

1. Pixels are converted to YCbCr and split into 8×8 blocks.
2. Each block goes through a **Discrete Cosine Transform (DCT)**.
3. Coefficients are **quantised** (rounded) and high-frequency detail is discarded.
4. Decoding reconstructs *approximate* pixels.

Reconstructed values differ from the originals by small amounts, which is exactly the magnitude of an LSB. The embedded bits are overwritten, effectively at random.

**Consequences**

- Sending a stego image through WhatsApp, Instagram or Facebook re-encodes it and destroys the payload.
- Always keep and share the file as **PNG** (lossless).

---

## Integrity: CRC-32 checksum

Every payload ends with a 4-byte **CRC-32** of the message, stored big-endian.

```typescript
view.setUint32(HEADER_SIZE + message.length, checksum, false); // big-endian trailer
```

**On decode:**

1. Read the header and validate the `STGL` magic number.
2. Read the declared message length and extract that many bytes.
3. Recompute CRC-32 over the extracted message.
4. Compare with the stored trailer.

| Result | Behaviour |
|---|---|
| Magic mismatch | "No StegaLens payload found" |
| CRC mismatch | Warning: image was modified or compressed; message **not** displayed as valid |
| CRC match | Message returned |

This prevents the app from silently presenting garbage text after an image has been altered.

**Limits of CRC-32:** it detects *accidental* corruption. It is not cryptographic, so an attacker can modify the message and recompute a valid CRC. For tamper resistance, use an HMAC or authenticated encryption.

---

## Threat model

| Adversary | Capability | Outcome |
|---|---|---|
| Casual observer | Views image | ✅ Sees nothing unusual |
| Forensic analyst | Runs Chi-Square / LSB-plane analysis | ❌ Likely detects embedding |
| Anyone who knows the format | Extracts LSBs | ❌ Reads plaintext message |
| Social platform | Re-encodes to JPEG | ❌ Payload destroyed |
| Active attacker | Edits payload and recomputes CRC | ❌ Undetected modification |

---

## Recommendations

1. **Encrypt before embedding** (AES-GCM) if the content matters.
2. Use **PNG**; never lossy formats.
3. Embed **small messages** in **large images** to reduce statistical footprint.
4. Use authenticated encryption or a MAC if tamper detection is required.
5. Treat StegaLens as a **learning lab**, not a covert-communication system.

---

## Reporting issues

Found a flaw? Open a GitHub issue or contact **Joel Akinsanya** ([@reallyngb](https://github.com/reallyngb)).
