import { useSyncExternalStore } from "react";
import { getState, subscribe } from "./store";
import { claim } from "./socket";

export function Board() {
  const s = useSyncExternalStore(subscribe, getState);
  return (
    <div
      className={"board" + (s.status !== "online" ? " dim" : "")}
      onClick={(e) => {
        const id = (e.target as HTMLElement).dataset.cell;
        if (id != null) claim(+id);
      }}
    >
      {s.cells.map((c, i) => {
        const mine = s.pending.has(i);
        const fx = s.fx.get(i);
        const color = mine ? s.me?.color : c.color;
        return (
          <div
            key={fx ? `${i}:${fx.n}` : i}
            data-cell={i}
            className={"cell" + (mine ? " pending" : "") + (fx ? " " + fx.kind : "")}
            style={color ? { background: color } : undefined}
          />
        );
      })}
    </div>
  );
}
