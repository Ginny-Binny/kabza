import { CELLS, colorFor } from "@kabza/shared";
import type { Cell, Delta, Phase, User } from "@kabza/shared";

export type ClaimResult =
  | { ok: true; delta: Delta; already: boolean; boardFull: boolean }
  | { ok: false; reason: "taken" | "invalid" };

export function createGrid() {
  const cells: Cell[] = Array.from({ length: CELLS }, () => ({ owner: null, color: null, version: 0 }));
  const users = new Map<string, User>();
  const history: Delta[] = []; // deltas for the current round, in version order
  const lastClaim = new Map<string, number>(); // userId -> version of their latest claim, for tie-breaks
  let version = 0;
  let claimed = 0;
  let round = 1;
  let phase: Phase = "active";
  let freezeEndsAt: number | null = null;

  function apply(d: Delta) {
    const cell = cells[d.cellId];
    cell.owner = d.owner;
    cell.color = d.color;
    cell.version = d.version;
    claimed++;
    history.push(d);
    lastClaim.set(d.owner, d.version);
    const u = users.get(d.owner);
    if (u) u.cellCount++;
  }

  return {
    cells,
    users,
    get version() { return version; },
    get round() { return round; },
    get phase() { return phase; },
    get freezeEndsAt() { return freezeEndsAt; },
    get claimed() { return claimed; },

    ensureUser(id: string, name?: string): { user: User; created: boolean } {
      let u = users.get(id);
      if (u) return { user: u, created: false };
      u = { id, name: name?.trim() || `player-${users.size + 1}`, color: colorFor(id), cellCount: 0 };
      users.set(id, u);
      return { user: u, created: true };
    },

    claim(cellId: number, userId: string): ClaimResult {
      if (!Number.isInteger(cellId)) return { ok: false, reason: "invalid" };
      const cell = cells[cellId];
      const user = users.get(userId);
      if (!cell || !user) return { ok: false, reason: "invalid" };
      if (cell.owner === userId) {
        // retried claim after a reconnect — ack it again, change nothing
        return {
          ok: true,
          already: true,
          delta: { cellId, owner: userId, color: cell.color!, version: cell.version },
          boardFull: false,
        };
      }
      if (cell.owner) return { ok: false, reason: "taken" };
      version++;
      const delta = { cellId, owner: userId, color: user.color, version };
      apply(delta);
      return { ok: true, delta, already: false, boardFull: claimed === CELLS };
    },

    deltasSince(since: number): Delta[] {
      // TODO: backpressure if delta history grows past one round somehow
      return history.filter((d) => d.version > since);
    },

    restore(saved: { round: number; version: number; users: { id: string; name: string; color: string }[]; deltas: Delta[] }) {
      round = saved.round;
      version = saved.version;
      for (const u of saved.users) users.set(u.id, { ...u, cellCount: 0 });
      for (const d of saved.deltas) apply(d);
    },

    freeze(until: number) {
      phase = "frozen";
      freezeEndsAt = until;
    },

    resetForNewRound(newRound: number) {
      for (let i = 0; i < cells.length; i++) cells[i] = { owner: null, color: null, version: 0 };
      history.length = 0;
      lastClaim.clear();
      claimed = 0;
      for (const u of users.values()) u.cellCount = 0;
      round = newRound;
      phase = "active";
      freezeEndsAt = null;
    },

    standings(): User[] {
      return [...users.values()]
        .filter((u) => u.cellCount > 0)
        .sort(
          (a, b) =>
            b.cellCount - a.cellCount ||
            (lastClaim.get(a.id) ?? 0) - (lastClaim.get(b.id) ?? 0) ||
            (a.id < b.id ? -1 : 1),
        );
    },
  };
}

export type Grid = ReturnType<typeof createGrid>;
