import { CELLS } from "@kabza/shared";
import type { Cell, S2C, User } from "@kabza/shared";

export type Status = "connecting" | "online" | "reconnecting";

type State = {
  cells: Cell[];
  users: Map<string, User>;
  me: User | null;
  round: number;
  version: number;
  status: Status;
};

const emptyCells = () => Array.from({ length: CELLS }, (): Cell => ({ owner: null, color: null, version: 0 }));

let state: State = {
  cells: emptyCells(),
  users: new Map(),
  me: null,
  round: 1,
  version: 0,
  status: "connecting",
};

const subs = new Set<() => void>();

export const getState = () => state;

export function subscribe(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  for (const fn of subs) fn();
}

export function handle(msg: S2C) {
  if (msg.type === "snapshot") {
    set({
      cells: msg.cells,
      users: new Map(msg.users.map((u) => [u.id, u])),
      me: msg.you,
      round: msg.round,
      version: msg.globalVersion,
      status: "online",
    });
  } else if (msg.type === "deltas") {
    if (msg.round !== state.round) return;
    const cells = state.cells.slice();
    let version = state.version;
    for (const d of msg.deltas) {
      const cur = cells[d.cellId];
      if (!cur || d.version <= cur.version) continue;
      cells[d.cellId] = { owner: d.owner, color: d.color, version: d.version };
      if (d.version > version) version = d.version;
    }
    set({ cells, version });
  }
}

export function setStatus(status: Status) {
  set({ status });
}
