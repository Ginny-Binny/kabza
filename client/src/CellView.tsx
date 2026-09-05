import { memo } from "react";
import type { Cell } from "@kabza/shared";
import { fillPaths, strokePaths } from "./cellPaths";
import type { Fx } from "./store";

type Props = { id: number; cell: Cell; pendingColor?: string; fx?: Fx };

export const CellView = memo(function CellView({ id, cell, pendingColor, fx }: Props) {
  const color = pendingColor ?? cell.color;
  return (
    <g className={"cellg" + (pendingColor ? " pending" : "") + (fx ? " " + fx.kind : "")}>
      {color &&
        fillPaths(id, color).map((p, i) => (
          <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill="none" />
        ))}
      {strokePaths(id).map((p, i) => (
        <path key={"s" + i} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill="none" />
      ))}
    </g>
  );
});
