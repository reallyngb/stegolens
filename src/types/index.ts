export type EmbedMode = "rgb" | "red" | "green" | "blue";

export interface LoadedImage {
  fileName: string;
  fileType: string;
  fileSize: number;
  width: number;
  height: number;
  original: Uint8ClampedArray;
  element: HTMLImageElement;
}
