import { useSyncExternalStore } from "react";
import { Board } from "./Board";
import { TopBar } from "./TopBar";
import { RoundOverlay } from "./RoundOverlay";
import { getState, subscribe } from "./store";

export function App() {
  const s = useSyncExternalStore(subscribe, getState);
  const showHint = s.me && s.me.cellCount === 0 && s.pending.size === 0 && !s.overlay;
  return (
    <div className="app">
      <TopBar />
      {s.status !== "online" && <div className="toast">{s.status}…</div>}
      <Board />
      <p className={"hint" + (showHint ? "" : " gone")}>click any square to claim it</p>
      {s.overlay && <RoundOverlay overlay={s.overlay} />}
    </div>
  );
}
