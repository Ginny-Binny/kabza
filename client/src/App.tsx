import { useState, useSyncExternalStore } from "react";
import { Board } from "./Board";
import { TopBar } from "./TopBar";
import { RoundOverlay } from "./RoundOverlay";
import { Welcome } from "./Welcome";
import { getState, subscribe } from "./store";

function seenWelcome() {
  try {
    return !!localStorage.getItem("kabza:seen");
  } catch {
    return true;
  }
}

export function App() {
  const s = useSyncExternalStore(subscribe, getState);
  const [welcome, setWelcome] = useState(() => !seenWelcome());
  const closeWelcome = () => {
    try {
      localStorage.setItem("kabza:seen", "1");
    } catch {}
    setWelcome(false);
  };
  const showHint = s.me && s.me.cellCount === 0 && s.pending.size === 0 && !s.overlay && !welcome;
  return (
    <div className="app">
      <TopBar />
      {s.status !== "online" && <div className="toast">{s.status}…</div>}
      <Board />
      <p className={"hint" + (showHint ? "" : " gone")}>click any square to claim it</p>
      {s.tip && <div className="tip">{s.tip}</div>}
      {welcome && s.me && s.status === "online" && <Welcome me={s.me} onClose={closeWelcome} />}
      {s.overlay && <RoundOverlay overlay={s.overlay} />}
    </div>
  );
}
