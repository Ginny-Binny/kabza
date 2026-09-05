import type { WebSocket } from "ws";
import { BATCH_MS } from "@kabza/shared";
import type { Delta, S2C } from "@kabza/shared";
import type { Grid } from "./game/grid";

export function createBroadcast(grid: Grid) {
  const sockets = new Map<WebSocket, string>();
  const byUser = new Map<string, Set<WebSocket>>();
  let queue: Delta[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  function sendAll(msg: S2C) {
    const raw = JSON.stringify(msg);
    for (const ws of sockets.keys()) if (ws.readyState === ws.OPEN) ws.send(raw);
  }

  function flush() {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!queue.length) return;
    sendAll({ type: "deltas", round: grid.round, deltas: queue });
    queue = [];
  }

  return {
    add(ws: WebSocket, userId: string) {
      sockets.set(ws, userId);
      let set = byUser.get(userId);
      if (!set) byUser.set(userId, (set = new Set()));
      set.add(ws);
    },
    remove(ws: WebSocket) {
      const userId = sockets.get(ws);
      sockets.delete(ws);
      if (!userId) return;
      const set = byUser.get(userId);
      set?.delete(ws);
      if (set && !set.size) byUser.delete(userId);
    },
    delta(d: Delta) {
      queue.push(d);
      if (!timer) timer = setTimeout(flush, BATCH_MS);
    },
    flushNow: flush,
    clearQueue() {
      queue = [];
    },
    sendAll,
    get online() { return byUser.size; },
  };
}

export type Broadcast = ReturnType<typeof createBroadcast>;
