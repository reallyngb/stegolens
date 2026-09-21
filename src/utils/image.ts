import type { LoadedImage } from "../types";

export async function loadImageFile(file: File): Promise<LoadedImage> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Failed to load image"));
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return {
      fileName: file.name, fileType: file.type || "unknown", fileSize: file.size,
      width: canvas.width, height: canvas.height,
      original: new Uint8ClampedArray(data.data), element: img,
    };
  } finally { URL.revokeObjectURL(url); }
}

export function bufferToCanvas(data: Uint8ClampedArray, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d")!.putImageData(new ImageData(data, w, h), 0, 0);
  return c;
}

export function bufferToPngBlob(data: Uint8ClampedArray, w: number, h: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    bufferToCanvas(data, w, h).toBlob((b) => b ? resolve(b) : reject(new Error("PNG encode failed")), "image/png");
  });
}

export function generateDemoImage(w = 512, h = 512) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      data[i] = Math.floor((x / w) * 200) + 20;
      data[i + 1] = Math.floor((y / h) * 200) + 20;
      data[i + 2] = Math.floor(((Math.sin(x / 24) + Math.cos(y / 24) + 2) / 4) * 180) + 40;
      data[i + 3] = 255;
    }
  }
  const canvas = bufferToCanvas(data, w, h);
  const img = new Image();
  img.src = canvas.toDataURL("image/png");
  return { data, element: img };
}
