import { HEADER_SIZE, CHECKSUM_SIZE, decodePayload, PayloadDecodeError } from "./payload";
import { bitsToBytes } from "./bitstream";
import type { EmbedMode } from "../types";

function* channelIterator(mode: EmbedMode) {
  if (mode === "red" || mode === "rgb") yield 0;
  if (mode === "green" || mode === "rgb") yield 1;
  if (mode === "blue" || mode === "rgb") yield 2;
}

export function readPayloadBits(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  count: number,
  mode: EmbedMode = "rgb",
): Uint8Array {
  const totalPixels = width * height;
  const chans = Array.from(channelIterator(mode));
  const bits = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const ch = chans[i % chans.length];
    const pix = Math.floor(i / chans.length);
    if (pix >= totalPixels) throw new Error("Out of pixels");
    bits[i] = data[pix * 4 + ch] & 1;
  }
  return bits;
}

export function decodeImage(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: { mode?: EmbedMode; maxBits?: number } = {},
) {
  const mode = options.mode ?? "rgb";
  const totalBits = width * height * Array.from(channelIterator(mode)).length;
  const headerBits = HEADER_SIZE * 8;

  if (totalBits < headerBits + CHECKSUM_SIZE * 8) {
    return {
      payload: null,
      error: new PayloadDecodeError("TOO_SHORT", "Image too small"),
      bitsRead: 0,
    };
  }

  const headerBytes = bitsToBytes(
    readPayloadBits(data, width, height, headerBits, mode),
  );

  const magicOk =
    headerBytes[0] === 0x53 &&
    headerBytes[1] === 0x54 &&
    headerBytes[2] === 0x47 &&
    headerBytes[3] === 0x4c;

  if (!magicOk) {
    return {
      payload: null,
      error: new PayloadDecodeError("BAD_MAGIC", "No STGL header in image"),
      bitsRead: headerBits,
    };
  }

  const view = new DataView(
    headerBytes.buffer,
    headerBytes.byteOffset,
    headerBytes.byteLength,
  );
  const msgLen = view.getUint32(7, false);
  const totalPayloadBits = (HEADER_SIZE + msgLen + CHECKSUM_SIZE) * 8;

  if (totalPayloadBits > totalBits) {
    return {
      payload: null,
      error: new PayloadDecodeError(
        "LENGTH_EXCEEDS_DATA",
        "Payload longer than image",
      ),
      bitsRead: headerBits,
    };
  }

  const allBits = readPayloadBits(data, width, height, totalPayloadBits, mode);

  try {
    const payload = decodePayload(bitsToBytes(allBits));
    return { payload, error: null, bitsRead: totalPayloadBits };
  } catch (err) {
    if (err instanceof PayloadDecodeError) {
      return { payload: null, error: err, bitsRead: totalPayloadBits };
    }
    throw err;
  }
}