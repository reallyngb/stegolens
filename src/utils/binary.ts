export function byteToBinary(v: number): string {
  return (v >>> 0).toString(2).padStart(8, "0");
}
