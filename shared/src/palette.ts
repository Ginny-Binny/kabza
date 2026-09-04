export const PAPER = "#faf9f6";
export const INK = "#4a4a45";

export const PALETTE = [
  "#f4a8a8",
  "#f7c59f",
  "#f0dc82",
  "#b8e0a8",
  "#a3d9c9",
  "#a8d8e8",
  "#a8c0f0",
  "#c5b3e6",
  "#f0b3d9",
  "#e6b8b8",
  "#d9c8a0",
  "#b3c7e6",
];

export function colorFor(userId: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return PALETTE[h % PALETTE.length];
}
