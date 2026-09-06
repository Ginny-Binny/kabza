import { useState, useSyncExternalStore } from "react";
import { CELLS, NAME_MAX } from "@kabza/shared";
import type { User } from "@kabza/shared";
import { getState, lastClaimV, subscribe } from "./store";
import { rename } from "./socket";

function liveStandings(users: Map<string, User>): User[] {
  return [...users.values()]
    .filter((u) => u.cellCount > 0)
    .sort(
      (a, b) =>
        b.cellCount - a.cellCount ||
        (lastClaimV.get(a.id) ?? 0) - (lastClaimV.get(b.id) ?? 0) ||
        (a.id < b.id ? -1 : 1),
    );
}

export function TopBar() {
  const s = useSyncExternalStore(subscribe, getState);
  const [draft, setDraft] = useState<string | null>(null);
  const [hover, setHover] = useState<{ name: string; count: number; color?: string; x: number } | null>(null);
  const coolLeft = s.cooldownUntil - Date.now();

  const standings = liveStandings(s.users);
  const myRank = s.me ? standings.findIndex((u) => u.id === s.me!.id) + 1 : 0;
  const top = standings.slice(0, 8);
  const others = standings.slice(8).reduce((n, u) => n + u.cellCount, 0);

  const commit = () => {
    if (draft && draft.trim() && draft.trim() !== s.me?.name) rename(draft);
    setDraft(null);
  };

  return (
    <>
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
              <button className="name" onClick={() => setDraft(s.me!.name)}>
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
            <span className="count">
              <b className="cnum" key={s.me.cellCount}>{s.me.cellCount}</b>
              {myRank > 0 && <span className="rank"> · #{myRank}</span>}
            </span>
          </div>
        )}

        <ol className="leaderboard">
          {standings.slice(0, 5).map((u) => (
            <li key={u.id}>
              <span className="chip small" style={{ background: u.color }} /> {u.name}
              <b className="cnum" key={`${u.id}:${u.cellCount}`}> {u.cellCount}</b>
            </li>
          ))}
        </ol>
      </header>

      <div className="territory-wrap">
        <div className="territory" onMouseLeave={() => setHover(null)}>
          {top.map((u) => (
            <span
              key={u.id}
              className="tseg"
              style={{ width: `${(u.cellCount / CELLS) * 100}%`, background: u.color }}
              onMouseEnter={(e) => setHover({ name: u.name, count: u.cellCount, color: u.color, x: segX(e) })}
            />
          ))}
          {others > 0 && (
            <span
              className="tseg others"
              style={{ width: `${(others / CELLS) * 100}%` }}
              onMouseEnter={(e) => setHover({ name: `${standings.length - top.length} others`, count: others, x: segX(e) })}
            />
          )}
          <span
            className="tseg rest"
            onMouseEnter={(e) => setHover({ name: "unclaimed", count: unclaimed(standings), x: segX(e) })}
          />
        </div>
        {hover && (
          <div className="ttip" style={{ left: hover.x }}>
            {hover.color && <span className="chip small" style={{ background: hover.color }} />} {hover.name} ·{" "}
            {hover.count}
          </div>
        )}
      </div>
    </>
  );
}

const unclaimed = (standings: User[]) => CELLS - standings.reduce((n, u) => n + u.cellCount, 0);

function segX(e: React.MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  const wrap = e.currentTarget.closest(".territory-wrap")!.getBoundingClientRect();
  return Math.min(r.left - wrap.left + r.width / 2, wrap.width - 70);
}
