export interface BitWrite {
  before: number; after: number; bit: 0 | 1; oldLsb: 0 | 1; changed: boolean;
}
export function getLsb(v: number): 0 | 1 { return (v & 1) as 0 | 1; }
export function clearLsb(v: number): number { return v & 0b11111110; }
export function setLsb(v: number, b: 0 | 1): number { return (v & 0b11111110) | b; }
export function writeBit(v: number, b: 0 | 1): BitWrite {
  const oldLsb = getLsb(v);
  const after = setLsb(v, b);
  return { before: v, after, bit: b, oldLsb, changed: oldLsb !== b };
}
export function utf8Encode(s: string): Uint8Array { return new TextEncoder().encode(s); }
export function utf8Decode(b: Uint8Array): string { return new TextDecoder("utf-8", { fatal: true }).decode(b); }
export function bytesToBits(bytes: Uint8Array): Uint8Array {
  const bits = new Uint8Array(bytes.length * 8);
  for (let i = 0; i < bytes.length; i++)
    for (let b = 0; b < 8; b++) bits[i * 8 + b] = (bytes[i] >> (7 - b)) & 1;
  return bits;
}
export function bitsToBytes(bits: Uint8Array): Uint8Array {
  if (bits.length % 8 !== 0) throw new Error("bits not multiple of 8");
  const bytes = new Uint8Array(bits.length / 8);
  for (let i = 0; i < bytes.length; i++) {
    let by = 0;
    for (let b = 0; b < 8; b++) by = (by << 1) | (bits[i * 8 + b] & 1);
    bytes[i] = by;
  }
  return bytes;
}
