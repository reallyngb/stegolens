import { describe, it, expect } from "vitest";
import {
  encodePayload,
  decodePayload,
  PayloadDecodeError,
  crc32,
  HEADER_SIZE,
  CHECKSUM_SIZE,
} from "../src/stego/payload";
import { utf8Encode } from "../src/stego/bitstream";

describe("payload container", () => {
  it("round-trips a simple ASCII message", () => {
    const message = utf8Encode("Hello from StegaLens.");
    const { bytes } = encodePayload(message);
    const decoded = decodePayload(bytes);
    expect(decoded.message).toEqual(message);
    expect(decoded.header.version).toBe(0x01);
    expect(decoded.header.length).toBe(message.length);
  });

  it("round-trips an empty message", () => {
    const message = new Uint8Array(0);
    const { bytes } = encodePayload(message);
    const decoded = decodePayload(bytes);
    expect(decoded.message.length).toBe(0);
    expect(decoded.header.length).toBe(0);
  });

  it("round-trips UTF-8 with accents and emoji", () => {
    const message = utf8Encode("Ola cafe \uD83D\uDD10");
    const { bytes } = encodePayload(message);
    const decoded = decodePayload(bytes);
    expect(decoded.message).toEqual(message);
  });

  it("produces bytes of the expected total length", () => {
    const message = utf8Encode("test");
    const { bytes } = encodePayload(message);
    expect(bytes.length).toBe(HEADER_SIZE + 4 + CHECKSUM_SIZE);
  });

  it("CRC-32 matches the known test vector", () => {
    // Standard CRC-32 of the ASCII string "123456789" is 0xCBF43926.
    expect(crc32(utf8Encode("123456789"))).toBe(0xcbf43926);
  });

  it("CRC-32 of an empty input is 0", () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });

  it("throws BAD_MAGIC when the magic byte is corrupted", () => {
    const { bytes } = encodePayload(utf8Encode("test"));
    const corrupted = new Uint8Array(bytes);
    corrupted[0] = 0x00;
    let error: unknown = null;
    try {
      decodePayload(corrupted);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(PayloadDecodeError);
    expect((error as PayloadDecodeError).code).toBe("BAD_MAGIC");
  });

  it("throws UNSUPPORTED_VERSION on a bad version byte", () => {
    const { bytes } = encodePayload(utf8Encode("test"));
    const corrupted = new Uint8Array(bytes);
    corrupted[4] = 0xff;
    let error: unknown = null;
    try {
      decodePayload(corrupted);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(PayloadDecodeError);
    expect((error as PayloadDecodeError).code).toBe("UNSUPPORTED_VERSION");
  });

  it("throws CHECKSUM_MISMATCH when the message is corrupted", () => {
    const { bytes } = encodePayload(utf8Encode("test"));
    const corrupted = new Uint8Array(bytes);
    corrupted[bytes.length - 1] ^= 0xff;
    let error: unknown = null;
    try {
      decodePayload(corrupted);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(PayloadDecodeError);
    expect((error as PayloadDecodeError).code).toBe("CHECKSUM_MISMATCH");
  });

  it("throws LENGTH_EXCEEDS_DATA when truncated", () => {
    const { bytes } = encodePayload(utf8Encode("this is a longer message for testing"));
    const truncated = bytes.slice(0, bytes.length - 4);
    let error: unknown = null;
    try {
      decodePayload(truncated);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(PayloadDecodeError);
    expect((error as PayloadDecodeError).code).toBe("LENGTH_EXCEEDS_DATA");
  });

  it("throws TOO_SHORT on tiny input", () => {
    let error: unknown = null;
    try {
      decodePayload(new Uint8Array([0x53, 0x54, 0x47, 0x4c]));
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(PayloadDecodeError);
    expect((error as PayloadDecodeError).code).toBe("TOO_SHORT");
  });
});
