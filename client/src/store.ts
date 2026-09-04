import { CELLS } from "@kabza/shared";
import type { Cell, S2C, User } from "@kabza/shared";

export type Status = "connecting" | "online" | "reconnecting";
export type Fx = { kind: "pop" | "shake"; n: number };

type State = {
  cells: Cell[];
  users: Map<string, User>;
  me: User | null;
  round: number;
  version: number;
  status: Status;
  pending: Map<number, number>; // cellId -> clientSeq, painted optimistically as mine
  fx: Map<number, Fx>;
};

const emptyCells = () => Array.from({ length: CELLS }, (): Cell => ({ owner: null, color: null, version: 0 }));

let state: State = {
  cells: emptyCells(),
  users: new Map(),
  me: null,
  round: 1,
  version: 0,
  status: "connecting",
  pending: new Map(),
  fx: new Map(),
};

const seqs = new Map<number, { cellId: number; resent: boolean }>();
let fxN = 0;
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

export function optimistic(cellId: number, seq: number) {
  seqs.set(seq, { cellId, resent: false });
  const pending = new Map(state.pending).set(cellId, seq);
  const fx = new Map(state.fx).set(cellId, { kind: "pop", n: ++fxN });
  set({ pending, fx });
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
    let pending = state.pending;
    let fx = state.fx;
    for (const d of msg.deltas) {
      const cur = cells[d.cellId];
      if (cur && d.version > cur.version) cells[d.cellId] = { owner: d.owner, color: d.color, version: d.version };
      if (d.version > version) version = d.version;
      const seq = state.pending.get(d.cellId);
      if (seq != null) {
        if (pending === state.pending) {
          pending = new Map(pending);
          fx = new Map(fx);
        }
        pending.delete(d.cellId);
        seqs.delete(seq);
        if (d.owner !== state.me?.id) fx.set(d.cellId, { kind: "shake", n: ++fxN });
      }
    }
    set({ cells, version, pending, fx });
  } else if (msg.type === "ack") {
    const info = seqs.get(msg.clientSeq);
    if (!info || !state.me) return;
    seqs.delete(msg.clientSeq);
    const cells = state.cells.slice();
    const cur = cells[msg.cellId];
    if (cur && msg.version > cur.version) {
      cells[msg.cellId] = { owner: state.me.id, color: state.me.color, version: msg.version };
    }
    // note: global version only advances via the delta stream, so a lost
    // batch is still detectable as a gap after this ack
    const pending = new Map(state.pending);
    pending.delete(msg.cellId);
    set({ cells, pending });
  } else if (msg.type === "nack") {
    const info = seqs.get(msg.clientSeq);
    if (!info) return;
    seqs.delete(msg.clientSeq);
    const pending = new Map(state.pending);
    pending.delete(msg.cellId);
    const fx = new Map(state.fx).set(msg.cellId, { kind: "shake", n: ++fxN });
    set({ pending, fx });
  }
}

// after a reconnect sync: my claims that landed are confirmed, lost races
// shake, still-unclaimed ones get one resend with the same seq
export function settleAfterSync(): { seq: number; cellId: number }[] {
  const resend: { seq: number; cellId: number }[] = [];
  const pending = new Map(state.pending);
  const fx = new Map(state.fx);
  for (const [seq, info] of [...seqs]) {
    const cell = state.cells[info.cellId];
    if (!cell) {
      seqs.delete(seq);
      pending.delete(info.cellId);
    } else if (cell.owner === state.me?.id) {
      seqs.delete(seq);
      pending.delete(info.cellId);
    } else if (cell.owner) {
      seqs.delete(seq);
      pending.delete(info.cellId);
      fx.set(info.cellId, { kind: "shake", n: ++fxN });
    } else if (!info.resent) {
      info.resent = true;
      resend.push({ seq, cellId: info.cellId });
    } else {
      seqs.delete(seq);
      pending.delete(info.cellId);
    }
  }
  set({ pending, fx });
  return resend;
}

export function setStatus(status: Status) {
  set({ status });
}
