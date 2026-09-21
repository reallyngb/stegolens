import { describe, it, expect } from "vitest";
import {
  getLsb,
  clearLsb,
  setLsb,
  writeBit,
  bytesToBits,
  bitsToBytes,
  utf8Encode,
  utf8Decode,
} from "../src/stego/bitstream";

describe("bitstream primitives", () => {
  it("getLsb returns the correct bit", () => {
    expect(getLsb(0)).toBe(0);
    expect(getLsb(1)).toBe(1);
    expect(getLsb(0b10110100)).toBe(0);
    expect(getLsb(0b10110101)).toBe(1);
    expect(getLsb(0b11111110)).toBe(0);
    expect(getLsb(0b11111111)).toBe(1);
  });

  it("clearLsb strips the final bit", () => {
    expect(clearLsb(0b10110101)).toBe(0b10110100);
    expect(clearLsb(0b00000000)).toBe(0);
    expect(clearLsb(0b11111111)).toBe(0b11111110);
    expect(clearLsb(0b00000001)).toBe(0);
  });

  it("setLsb covers all four bit transitions", () => {
    // 0 -> 0
    expect(setLsb(0b10110100, 0)).toBe(0b10110100);
    // 0 -> 1
    expect(setLsb(0b10110100, 1)).toBe(0b10110101);
    // 1 -> 0
    expect(setLsb(0b10110101, 0)).toBe(0b10110100);
    // 1 -> 1
    expect(setLsb(0b10110101, 1)).toBe(0b10110101);
  });

  it("writeBit reports whether the bit changed", () => {
    expect(writeBit(180, 1).changed).toBe(true);
    expect(writeBit(181, 1).changed).toBe(false);
    expect(writeBit(180, 0).changed).toBe(false);
    expect(writeBit(181, 0).changed).toBe(true);
  });

  it("writeBit preserves all bits except the LSB", () => {
    const result = writeBit(0b10110100, 1);
    expect(result.before).toBe(0b10110100);
    expect(result.after).toBe(0b10110101);
    expect(result.oldLsb).toBe(0);
    expect(result.bit).toBe(1);
  });

  it("bytesToBits expands MSB first", () => {
    const bits = bytesToBits(new Uint8Array([0b10110001]));
    expect(bits.length).toBe(8);
    expect(Array.from(bits)).toEqual([1, 0, 1, 1, 0, 0, 0, 1]);
  });

  it("bytes <-> bits round-trips", () => {
    const bytes = new Uint8Array([0x53, 0x54, 0x47, 0x4c, 0x00, 0xff, 0x42]);
    const bits = bytesToBits(bytes);
    expect(bits.length).toBe(bytes.length * 8);
    expect(bitsToBytes(bits)).toEqual(bytes);
  });

  it("bitsToBytes refuses non-multiple-of-8 input", () => {
    expect(() => bitsToBytes(new Uint8Array([1, 0, 1]))).toThrow();
    expect(() => bitsToBytes(new Uint8Array([1, 0, 1, 1, 1, 0, 1]))).toThrow();
  });

  it("UTF-8 encode/decode round-trips plain ASCII", () => {
    const s = "Hello, world! 123";
    expect(utf8Decode(utf8Encode(s))).toBe(s);
  });

  it("UTF-8 encode/decode round-trips accented characters", () => {
    const s = "Ola, cafe, naive, resume";
    expect(utf8Decode(utf8Encode(s))).toBe(s);
  });

  it("UTF-8 encode/decode round-trips Japanese", () => {
    const s = "\u3053\u3093\u306b\u3061\u306f";
    expect(utf8Decode(utf8Encode(s))).toBe(s);
  });

  it("UTF-8 encode/decode round-trips emoji", () => {
    const s = "\uD83D\uDD10 Cybersecurity";
    expect(utf8Decode(utf8Encode(s))).toBe(s);
  });

  it("UTF-8 encode/decode round-trips empty string", () => {
    expect(utf8Decode(utf8Encode(""))).toBe("");
  });
});