import type { C2S } from "@kabza/shared";
import { getState, handle, optimistic, setStatus, settleAfterSync } from "./store";

const userId = localStorage.getItem("kabza:userId") ?? crypto.randomUUID();
localStorage.setItem("kabza:userId", userId);

let ws: WebSocket | null = null;
let seq = 1;
let attempts = 0;
let awaitingSync = false;
let hasSynced = false;

export function connect() {
  ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);

  ws.onopen = () => {
    attempts = 0;
    awaitingSync = true;
    const s = getState();
    send({
      type: "hello",
      userId,
      name: s.me?.name,
      sinceVersion: hasSynced ? s.version : undefined,
      round: hasSynced ? s.round : undefined,
    });
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "deltas" && !awaitingSync) {
      const first = msg.deltas[0];
      if (first && first.version > getState().version + 1) {
        // missed a batch somewhere, don't apply out of order
        send({ type: "resync", sinceVersion: getState().version, round: getState().round });
        return;
      }
    }
    handle(msg);
    if (awaitingSync && (msg.type === "snapshot" || msg.type === "deltas")) {
      awaitingSync = false;
      hasSynced = true;
      setStatus("online");
      for (const p of settleAfterSync()) send({ type: "claim", cellId: p.cellId, clientSeq: p.seq });
    }
  };

  ws.onclose = () => {
    setStatus("reconnecting");
    const delay = Math.min(500 * 2 ** attempts++, 8000) * (0.8 + Math.random() * 0.4);
    setTimeout(connect, delay);
  };
}

function send(msg: C2S) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

export function claim(cellId: number) {
  const s = getState();
  if (s.status !== "online" || !s.me) return;
  const cell = s.cells[cellId];
  if (!cell || cell.owner || s.pending.has(cellId)) return;
  const n = seq++;
  optimistic(cellId, n);
  send({ type: "claim", cellId, clientSeq: n });
}
