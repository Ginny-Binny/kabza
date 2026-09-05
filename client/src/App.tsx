import { useSyncExternalStore } from "react";
import { Board } from "./Board";
import { RoundOverlay } from "./RoundOverlay";
import { getState, subscribe } from "./store";

export function App() {
  const s = useSyncExternalStore(subscribe, getState);
  return (
    <div className="app">
      <div className="bar">
        <h1>kabza</h1>
        <span>round {s.round}</span>
        <span>{s.online} online</span>
        {s.me && (
          <span>
            <span className="chip" style={{ background: s.me.color }} /> {s.me.name} · {s.me.cellCount}
          </span>
        )}
        <span className="lb">
          {s.leaderboard.map((u, i) => (
            <span key={u.id}>
              {i + 1}. {u.name} ({u.cellCount}){" "}
            </span>
          ))}
        </span>
      </div>
      {s.status !== "online" && <div className="toast">{s.status}…</div>}
      <Board />
      {s.overlay && <RoundOverlay overlay={s.overlay} />}
    </div>
  );
}
