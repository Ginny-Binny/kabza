import { useSyncExternalStore } from "react";
import { getState, subscribe } from "./store";
import { claim } from "./socket";

export function Board() {
  const s = useSyncExternalStore(subscribe, getState);
  return (
    <div
      className="board"
      onClick={(e) => {
        const id = (e.target as HTMLElement).dataset.cell;
        if (id != null) claim(+id);
      }}
    >
      {s.cells.map((c, i) => (
        <div key={i} data-cell={i} className="cell" style={c.color ? { background: c.color } : undefined} />
      ))}
    </div>
  );
}
