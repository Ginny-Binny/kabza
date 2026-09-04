import { CELLS, colorFor } from "@kabza/shared";
import type { Cell, Delta, Phase, User } from "@kabza/shared";

export type ClaimResult =
  | { ok: true; delta: Delta; already: boolean; boardFull: boolean }
  | { ok: false; reason: "taken" | "invalid" };

export function createGrid() {
  const cells: Cell[] = Array.from({ length: CELLS }, () => ({ owner: null, color: null, version: 0 }));
  const users = new Map<string, User>();
  const history: Delta[] = []; // deltas for the current round, in version order
  let version = 0;
  let claimed = 0;
  let round = 1;
  let phase: Phase = "active";
  let freezeEndsAt: number | null = null;

  return {
    cells,
    users,
    get version() { return version; },
    get round() { return round; },
    get phase() { return phase; },
    get freezeEndsAt() { return freezeEndsAt; },
    get claimed() { return claimed; },

    ensureUser(id: string, name?: string): User {
      let u = users.get(id);
      if (!u) {
        u = { id, name: name?.trim() || `player-${users.size + 1}`, color: colorFor(id), cellCount: 0 };
        users.set(id, u);
      }
      return u;
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
      claimed++;
      cell.owner = userId;
      cell.color = user.color;
      cell.version = version;
      user.cellCount++;
      const delta = { cellId, owner: userId, color: user.color, version };
      history.push(delta);
      return { ok: true, delta, already: false, boardFull: claimed === CELLS };
    },

    deltasSince(since: number): Delta[] {
      // TODO: backpressure if delta history grows past one round somehow
      return history.filter((d) => d.version > since);
    },
  };
}

export type Grid = ReturnType<typeof createGrid>;
