import { useRef, useState, useSyncExternalStore } from "react";
import { GRID_H, GRID_W } from "@kabza/shared";
import { getState, subscribe } from "./store";
import { claim } from "./socket";
import { CELL } from "./cellPaths";
import { CellView } from "./CellView";

const W = GRID_W * CELL;
const H = GRID_H * CELL;
const center = (id: number) =>
  [(id % GRID_W) * CELL + CELL / 2, Math.floor(id / GRID_W) * CELL + CELL / 2] as const;

export function Board() {
  const s = useSyncExternalStore(subscribe, getState);
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ id: number; x: number; y: number } | null>(null);
  const cooling = s.cooldownUntil > Date.now();

  const cellAt = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const col = Math.floor(((e.clientX - r.left) / r.width) * GRID_W);
    const row = Math.floor(((e.clientY - r.top) / r.height) * GRID_H);
    if (col < 0 || col >= GRID_W || row < 0 || row >= GRID_H) return null;
    return { id: row * GRID_W + col, col, row };
  };

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const c = cellAt(e);
    const owner = c && s.cells[c.id]?.owner;
    if (!c || !owner) {
      if (hover) setHover(null);
      return;
    }
    if (hover?.id === c.id) return;
    const r = e.currentTarget.getBoundingClientRect();
    const w = wrap.current!;
    const wr = w.getBoundingClientRect();
    const cw = r.width / GRID_W;
    setHover({
      id: c.id,
      x: Math.min(Math.max(r.left - wr.left + w.scrollLeft + (c.col + 0.5) * cw, 40), w.scrollWidth - 46),
      y: r.top - wr.top + (c.row * r.height) / GRID_H,
    });
  };

  const owner = hover ? s.cells[hover.id]?.owner : null;
  const user = owner ? s.users.get(owner) : null;

  return (
    <div className="boardwrap" ref={wrap}>
      <svg
        className={"board" + (s.status !== "online" ? " dim" : "") + (cooling ? " cooling" : "")}
        viewBox={`0 0 ${W} ${H}`}
        onClick={(e) => {
          const c = cellAt(e);
          if (c) claim(c.id);
        }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
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
        {[...s.fx].map(([id, f]) => {
          if (f.kind !== "cool" || !f.ms) return null;
          const [x, y] = center(id);
          return (
            <circle key={f.n} className="coolring" cx={x} cy={y} r={9} style={{ animationDuration: `${f.ms}ms` }} />
          );
        })}
        {s.floats.map((f) => {
          const [x, y] = center(f.cellId);
          return (
            <text key={f.n} className="float1" x={x} y={y}>
              +1
            </text>
          );
        })}
      </svg>
      {hover && owner && (
        <div className="ttip cell-tip" style={{ left: hover.x, top: hover.y }}>
          <span className="chip small" style={{ background: s.cells[hover.id]!.color ?? undefined }} />{" "}
          {user?.name ?? "…"}
          {user && user.cellCount > 0 && <b> {user.cellCount}</b>}
          {owner === s.me?.id && " (you)"}
        </div>
      )}
    </div>
  );
}
