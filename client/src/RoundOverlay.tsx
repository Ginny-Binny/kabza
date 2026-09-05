import { useEffect, useState } from "react";
import type { Overlay } from "./store";

export function RoundOverlay({ overlay }: { overlay: Overlay }) {
  const [left, setLeft] = useState(() => Math.ceil((overlay.endsAt - Date.now()) / 1000));

  useEffect(() => {
    const iv = setInterval(() => setLeft(Math.max(0, Math.ceil((overlay.endsAt - Date.now()) / 1000))), 250);
    return () => clearInterval(iv);
  }, [overlay.endsAt]);

  return (
    <div className="overlay">
      <div className="overlay-card">
        <h2>board full!</h2>
        {overlay.winner && (
          <p className="winner">
            <span className="chip" style={{ background: overlay.winner.color }} /> {overlay.winner.name} takes the
            round with {overlay.winner.cellCount} cells
          </p>
        )}
        <ol>
          {overlay.standings.slice(0, 5).map((u) => (
            <li key={u.id}>
              <span className="chip small" style={{ background: u.color }} /> {u.name} <b>{u.cellCount}</b>
            </li>
          ))}
        </ol>
        <p className="countdown">fresh board in {left}s</p>
      </div>
    </div>
  );
}
