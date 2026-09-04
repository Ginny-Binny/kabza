import { useSyncExternalStore } from "react";
import { Board } from "./Board";
import { getState, subscribe } from "./store";

export function App() {
  const s = useSyncExternalStore(subscribe, getState);
  return (
    <div className="app">
      <h1>kabza</h1>
      {s.status !== "online" && <div className="toast">{s.status}…</div>}
      <Board />
    </div>
  );
}
