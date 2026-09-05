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
        <h2>round over</h2>
        {overlay.winner && (
          <p>
            <span className="chip" style={{ background: overlay.winner.color }} /> {overlay.winner.name} wins with{" "}
            {overlay.winner.cellCount} cells
          </p>
        )}
        <ol>
          {overlay.standings.slice(0, 5).map((u) => (
            <li key={u.id}>
              {u.name} — {u.cellCount}
            </li>
          ))}
        </ol>
        <p>next round in {left}s</p>
      </div>
    </div>
  );
}
