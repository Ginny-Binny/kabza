import rough from "roughjs";
import { GRID_W, INK } from "@kabza/shared";

export const CELL = 28;
const PAD = 2;
const SIZE = CELL - PAD * 2;

const gen = rough.generator();

export type PathAttrs = { d: string; stroke: string; strokeWidth: number };

// paths are cached per cell (and per color for fills) with a fixed seed,
// so a cell always redraws with the exact same wobble — no jitter
const strokes = new Map<number, PathAttrs[]>();
const fills = new Map<string, PathAttrs[]>();

const xy = (id: number) => [(id % GRID_W) * CELL + PAD, Math.floor(id / GRID_W) * CELL + PAD] as const;

function toAttrs(drawable: ReturnType<typeof gen.rectangle>): PathAttrs[] {
  return gen
    .toPaths(drawable)
    .filter((p) => p.stroke !== "none")
    .map((p) => ({ d: p.d, stroke: p.stroke, strokeWidth: p.strokeWidth }));
}

export function strokePaths(id: number): PathAttrs[] {
  let p = strokes.get(id);
  if (!p) {
    const [x, y] = xy(id);
    p = toAttrs(
      gen.rectangle(x, y, SIZE, SIZE, {
        roughness: 1.1,
        bowing: 0.8,
        stroke: INK,
        strokeWidth: 1.5,
        seed: id * 7919 + 1,
      }),
    );
    strokes.set(id, p);
  }
  return p;
}

export function fillPaths(id: number, color: string): PathAttrs[] {
  const key = `${id}:${color}`;
  let p = fills.get(key);
  if (!p) {
    const [x, y] = xy(id);
    p = toAttrs(
      gen.rectangle(x, y, SIZE, SIZE, {
        fill: color,
        fillStyle: "hachure",
        hachureGap: 3.5,
        fillWeight: 2.2,
        stroke: "none",
        roughness: 1,
        seed: id * 7919 + 1,
      }),
    );
    fills.set(key, p);
  }
  return p;
}
