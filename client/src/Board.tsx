import { useSyncExternalStore } from "react";
import { GRID_H, GRID_W } from "@kabza/shared";
import { getState, subscribe } from "./store";
import { claim } from "./socket";
import { CELL } from "./cellPaths";
import { CellView } from "./CellView";

const W = GRID_W * CELL;
const H = GRID_H * CELL;

export function Board() {
  const s = useSyncExternalStore(subscribe, getState);

  const onClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const col = Math.floor((((e.clientX - r.left) / r.width) * W) / CELL);
    const row = Math.floor((((e.clientY - r.top) / r.height) * H) / CELL);
    if (col >= 0 && col < GRID_W && row >= 0 && row < GRID_H) claim(row * GRID_W + col);
  };

  return (
    <svg
      className={"board" + (s.status !== "online" ? " dim" : "")}
      viewBox={`0 0 ${W} ${H}`}
      onClick={onClick}
    >
      {s.cells.map((c, i) => {
        const fx = s.fx.get(i);
        return (
          <CellView
            key={fx ? `${i}:${fx.n}` : i}
            id={i}
            cell={c}
            pendingColor={s.pending.has(i) ? s.me?.color : undefined}
            fx={fx}
          />
        );
      })}
    </svg>
  );
}
