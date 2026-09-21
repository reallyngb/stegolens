export function computeLsbDistribution(
  data: Uint8ClampedArray, width: number, height: number,
) {
  const total = width * height * 3;
  let zeros = 0, ones = 0;
  for (let p = 0; p < width * height; p++) {
    const base = p * 4;
    for (let c = 0; c < 3; c++) {
      if (data[base + c] & 1) ones++; else zeros++;
    }
  }
  return { zeros, ones, total, zeroRatio: zeros / total, oneRatio: ones / total };
}
