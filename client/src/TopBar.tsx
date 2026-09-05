import { useState, useSyncExternalStore } from "react";
import { NAME_MAX } from "@kabza/shared";
import { getState, subscribe } from "./store";
import { rename } from "./socket";

export function TopBar() {
  const s = useSyncExternalStore(subscribe, getState);
  const [draft, setDraft] = useState<string | null>(null);
  const coolLeft = s.cooldownUntil - Date.now();

  const commit = () => {
    if (draft && draft.trim() && draft.trim() !== s.me?.name) rename(draft);
    setDraft(null);
  };

  return (
    <header className="topbar">
      <h1 className="logo">kabza</h1>
      <span className="meta">
        round {s.round} · {s.online} online
      </span>

      {s.me && (
        <div className="me">
          <span className="chipwrap">
            <span className="chip" style={{ background: s.me.color }} />
            {coolLeft > 0 && (
              <span key={s.cooldownUntil} className="ring" style={{ animationDuration: `${coolLeft}ms` }} />
            )}
          </span>
          {draft === null ? (
            <button className="name" title="click to rename" onClick={() => setDraft(s.me!.name)}>
              {s.me.name}
            </button>
          ) : (
            <input
              className="name-edit"
              autoFocus
              value={draft}
              maxLength={NAME_MAX}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setDraft(null);
              }}
            />
          )}
          <span className="count">{s.me.cellCount}</span>
        </div>
      )}

      <ol className="leaderboard">
        {s.leaderboard.map((u) => (
          <li key={u.id}>
            <span className="chip small" style={{ background: u.color }} /> {u.name}
            <b> {u.cellCount}</b>
          </li>
        ))}
      </ol>
    </header>
  );
}
