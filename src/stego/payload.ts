import { bytesToBits } from "./bitstream";
export const MAGIC = new Uint8Array([0x53, 0x54, 0x47, 0x4c]);
export const VERSION = 0x01;
export const ENCODING_UTF8 = 0x01;
export const HEADER_SIZE = 11;
export const CHECKSUM_SIZE = 4;

let crcTable: Uint32Array | null = null;
function getCrcTable() {
  if (crcTable) return crcTable;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  crcTable = t;
  return t;
}
export function crc32(bytes: Uint8Array): number {
  const t = getCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = t[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function encodePayload(message: Uint8Array) {
  const checksum = crc32(message);
  const total = HEADER_SIZE + message.length + CHECKSUM_SIZE;
  const bytes = new Uint8Array(total);
  const view = new DataView(bytes.buffer);
  bytes.set(MAGIC, 0);
  bytes[4] = VERSION;
  bytes[5] = 0;
  bytes[6] = ENCODING_UTF8;
  view.setUint32(7, message.length, false);
  bytes.set(message, HEADER_SIZE);
  view.setUint32(HEADER_SIZE + message.length, checksum, false);
  return { bytes, bits: bytesToBits(bytes) };
}

export class PayloadDecodeError extends Error {
  code: string;
  constructor(code: string, msg: string) { super(msg); this.code = code; }
}

export function decodePayload(bytes: Uint8Array) {
  if (bytes.length < HEADER_SIZE + CHECKSUM_SIZE) throw new PayloadDecodeError("TOO_SHORT", "Payload too short");
  for (let i = 0; i < 4; i++) if (bytes[i] !== MAGIC[i]) throw new PayloadDecodeError("BAD_MAGIC", "No STGL header");
  if (bytes[4] !== VERSION) throw new PayloadDecodeError("UNSUPPORTED_VERSION", "Bad version");
  if (bytes[6] !== ENCODING_UTF8) throw new PayloadDecodeError("UNSUPPORTED_ENCODING", "Bad encoding");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const length = view.getUint32(7, false);
  const msgEnd = HEADER_SIZE + length;
  if (bytes.length < msgEnd + CHECKSUM_SIZE) throw new PayloadDecodeError("LENGTH_EXCEEDS_DATA", "Truncated");
  const message = bytes.slice(HEADER_SIZE, msgEnd);
  const stored = view.getUint32(msgEnd, false);
  const computed = crc32(message);
  if (stored !== computed) throw new PayloadDecodeError("CHECKSUM_MISMATCH", "Checksum mismatch");
  return { header: { version: bytes[4], length, checksum: stored }, message };
}
