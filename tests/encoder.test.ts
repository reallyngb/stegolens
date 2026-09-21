import { describe, it, expect } from "vitest";
import { encodeImage } from "../src/stego/encoder";
import { decodeImage } from "../src/stego/decoder";
import { utf8Encode, utf8Decode } from "../src/stego/bitstream";

function makeImage(width: number, height: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const base = i * 4;
    data[base] = (i * 7) & 0xff;
    data[base + 1] = (i * 13) & 0xff;
    data[base + 2] = (i * 29) & 0xff;
    data[base + 3] = 255;
  }
  return data;
}

describe("encoder and decoder round-trip", () => {
  it("recovers an ASCII message", () => {
    const w = 128;
    const h = 128;
    const original = makeImage(w, h);
    const message = "Hello, StegaLens!";
    const encoded = encodeImage(original, w, h, utf8Encode(message));
    const decoded = decodeImage(encoded.data, w, h);
    expect(decoded.payload).not.toBeNull();
    expect(utf8Decode(decoded.payload!.message)).toBe(message);
  });

  it("recovers a UTF-8 message with accents and emoji", () => {
    const w = 128;
    const h = 128;
    const original = makeImage(w, h);
    const message = "\uD83D\uDD10 cafe \u3053\u3093\u306b\u3061\u306f";
    const encoded = encodeImage(original, w, h, utf8Encode(message));
    const decoded = decodeImage(encoded.data, w, h);
    expect(decoded.payload).not.toBeNull();
    expect(utf8Decode(decoded.payload!.message)).toBe(message);
  });

  it("recovers an empty message", () => {
    const w = 64;
    const h = 64;
    const original = makeImage(w, h);
    const encoded = encodeImage(original, w, h, new Uint8Array(0));
    const decoded = decodeImage(encoded.data, w, h);
    expect(decoded.payload).not.toBeNull();
    expect(decoded.payload!.message.length).toBe(0);
  });

  it("never modifies the alpha channel", () => {
    const w = 64;
    const h = 64;
    const original = makeImage(w, h);
    const encoded = encodeImage(original, w, h, utf8Encode("alpha test"));
    for (let i = 0; i < w * h; i++) {
      expect(encoded.data[i * 4 + 3]).toBe(original[i * 4 + 3]);
    }
  });

  it("leaves pixels outside the payload unchanged", () => {
    const w = 128;
    const h = 128;
    const original = makeImage(w, h);
    const encoded = encodeImage(original, w, h, utf8Encode("short"));
    const usedPixels = Math.ceil(encoded.payloadBits.length / 3);
    for (let i = usedPixels + 1; i < w * h; i++) {
      const base = i * 4;
      expect(encoded.data[base]).toBe(original[base]);
      expect(encoded.data[base + 1]).toBe(original[base + 1]);
      expect(encoded.data[base + 2]).toBe(original[base + 2]);
    }
  });

  it("does not mutate the input buffer", () => {
    const w = 64;
    const h = 64;
    const original = makeImage(w, h);
    const snapshot = new Uint8ClampedArray(original);
    encodeImage(original, w, h, utf8Encode("test"));
    expect(original).toEqual(snapshot);
  });

  it("throws when the payload does not fit", () => {
    const w = 8;
    const h = 8;
    const original = makeImage(w, h);
    const big = new Uint8Array(1000).fill(65);
    expect(() => encodeImage(original, w, h, big)).toThrow();
  });

  it("supports red-only embedding mode", () => {
    const w = 64;
    const h = 64;
    const original = makeImage(w, h);
    const message = "red only";
    const encoded = encodeImage(original, w, h, utf8Encode(message), {
      mode: "red",
    });
    for (let i = 0; i < w * h; i++) {
      const base = i * 4;
      expect(encoded.data[base + 1]).toBe(original[base + 1]);
      expect(encoded.data[base + 2]).toBe(original[base + 2]);
    }
    const decoded = decodeImage(encoded.data, w, h, { mode: "red" });
    expect(decoded.payload).not.toBeNull();
    expect(utf8Decode(decoded.payload!.message)).toBe(message);
  });

  it("decode(encode(image, msg)) === msg (full round-trip)", () => {
    const w = 96;
    const h = 96;
    const original = makeImage(w, h);
    const message = "Round-trip verification.";
    const encoded = encodeImage(original, w, h, utf8Encode(message));
    const decoded = decodeImage(encoded.data, w, h);
    expect(decoded.payload).not.toBeNull();
    expect(utf8Decode(decoded.payload!.message)).toBe(message);
  });
});

describe("decoder error handling", () => {
  it("returns BAD_MAGIC for a plain image with no payload", () => {
    const w = 64;
    const h = 64;
    const original = makeImage(w, h);
    const result = decodeImage(original, w, h);
    expect(result.payload).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error!.code).toBe("BAD_MAGIC");
  });

  it("returns TOO_SHORT for a tiny image", () => {
    const original = new Uint8ClampedArray(2 * 4);
    const result = decodeImage(original, 2, 1);
    expect(result.payload).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error!.code).toBe("TOO_SHORT");
  });
});
