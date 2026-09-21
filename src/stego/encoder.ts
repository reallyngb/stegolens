import { encodePayload } from "./payload";
import { writeBit, type BitWrite } from "./bitstream";
import type { EmbedMode } from "../types";

export interface EncodeTrace {
  index: number;
  x: number;
  y: number;
  channel: 0 | 1 | 2;
  bitIndex: number;
  write: BitWrite;
}

export function usableBitsPerPixel(mode: EmbedMode = "rgb"): number {
  return mode === "rgb" ? 3 : 1;
}

export function capacityBits(w: number, h: number, mode: EmbedMode = "rgb"): number {
  return w * h * usableBitsPerPixel(mode);
}

function* channelIterator(mode: EmbedMode) {
  if (mode === "red" || mode === "rgb") yield 0;
  if (mode === "green" || mode === "rgb") yield 1;
  if (mode === "blue" || mode === "rgb") yield 2;
}

export function encodeImage(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  message: Uint8Array,
  options: { mode?: EmbedMode } = {},
) {
  const mode = options.mode ?? "rgb";
  const { bits, bytes } = encodePayload(message);
  const cap = capacityBits(width, height, mode);

  if (bits.length > cap) {
    throw new Error(
      "Payload needs " + bits.length + " bits, only " + cap + " available",
    );
  }

  const out = new Uint8ClampedArray(data);
  const trace: EncodeTrace[] = [];
  const chans = Array.from(channelIterator(mode));
  const changedPixels = new Set<number>();
  let changedChannels = 0;

  for (let i = 0; i < bits.length; i++) {
    const ch = chans[i % chans.length];
    const pix = Math.floor(i / chans.length);
    const x = pix % width;
    const y = Math.floor(pix / width);
    const off = pix * 4 + ch;
    const before = out[off];
    const res = writeBit(before, bits[i] as 0 | 1);

    if (res.changed) {
      out[off] = res.after;
      changedChannels++;
      changedPixels.add(pix);
    }

    trace.push({
      index: i,
      x,
      y,
      channel: ch as 0 | 1 | 2,
      bitIndex: i,
      write: res,
    });
  }

  return {
    data: out,
    payloadBytes: bytes,
    payloadBits: bits,
    trace,
    changedChannels,
    changedPixels: changedPixels.size,
  };
}