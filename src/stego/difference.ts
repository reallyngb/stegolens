export function computeDifference(
  original: Uint8ClampedArray, stego: Uint8ClampedArray,
  width: number, height: number,
) {
  const totalPixels = width * height;
  const totalChannels = totalPixels * 3;
  let changedPixels = 0, changedChannels = 0, totalDiff = 0, maxDiff = 0;
  for (let p = 0; p < totalPixels; p++) {
    const base = p * 4;
    let pixelChanged = false;
    for (let c = 0; c < 3; c++) {
      const d = Math.abs(original[base + c] - stego[base + c]);
      if (d !== 0) {
        changedChannels++; pixelChanged = true; totalDiff += d;
        if (d > maxDiff) maxDiff = d;
      }
    }
    if (pixelChanged) changedPixels++;
  }
  return {
    totalPixels, totalChannels, changedPixels, changedChannels,
    percentChangedPixels: (changedPixels / totalPixels) * 100,
    percentChangedChannels: (changedChannels / totalChannels) * 100,
    averageChannelDifference: totalChannels === 0 ? 0 : totalDiff / totalChannels,
    maxChannelDifference: maxDiff,
  };
}
