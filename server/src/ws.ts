import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import type { Server } from "node:http";
import { RESYNC_MAX_GAP, WS_PATH } from "@kabza/shared";
import type { C2S, S2C, User } from "@kabza/shared";
import type { Grid } from "./game/grid";
import type { Broadcast } from "./broadcast";

export function chooseSync(
  clientRound: number | undefined,
  since: number | undefined,
  round: number,
  version: number,
): "snapshot" | "deltas" {
  if (since == null || clientRound !== round) return "snapshot";
  if (since > version || version - since > RESYNC_MAX_GAP) return "snapshot";
  return "deltas";
}

export function attachWs(server: Server, grid: Grid, bcast: Broadcast) {
  const wss = new WebSocketServer({ server, path: WS_PATH });
  const alive = new WeakMap<WebSocket, boolean>();

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (alive.get(ws) === false) {
        ws.terminate();
        continue;
      }
      alive.set(ws, false);
      ws.ping();
    }
  }, 30_000);
  wss.on("close", () => clearInterval(heartbeat));

  wss.on("connection", (ws) => {
    let userId: string | null = null;
    alive.set(ws, true);
    ws.on("pong", () => alive.set(ws, true));

    const send = (msg: S2C) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
    };

    const sync = (you: User, since: number | undefined, clientRound: number | undefined) => {
      if (chooseSync(clientRound, since, grid.round, grid.version) === "deltas") {
        send({ type: "deltas", round: grid.round, deltas: grid.deltasSince(since!) });
      } else {
        send({
          type: "snapshot",
          round: grid.round,
          phase: grid.phase,
          freezeEndsAt: grid.freezeEndsAt,
          globalVersion: grid.version,
          cells: grid.cells,
          users: [...grid.users.values()],
          you,
        });
      }
    };

    ws.on("message", (buf) => {
      let msg: C2S;
      try {
        msg = JSON.parse(buf.toString());
      } catch {
        return;
      }

      if (msg.type === "hello") {
        userId = String(msg.userId);
        const you = grid.ensureUser(userId, msg.name);
        // sync reply must go out before the socket joins the broadcaster,
        // so replayed deltas can't interleave with live batches
        sync(you, msg.sinceVersion, msg.round);
        bcast.add(ws, userId);
        return;
      }

      if (!userId) return;
      const user = grid.users.get(userId);
      if (!user) return;

      if (msg.type === "claim") {
        const res = grid.claim(msg.cellId, userId);
        if (!res.ok) {
          send({ type: "nack", clientSeq: msg.clientSeq, cellId: msg.cellId, reason: res.reason });
          return;
        }
        send({ type: "ack", clientSeq: msg.clientSeq, cellId: msg.cellId, version: res.delta.version });
        if (!res.already) bcast.delta(res.delta);
        return;
      }

      if (msg.type === "resync") {
        sync(user, msg.sinceVersion, msg.round);
      }
    });

    ws.on("close", () => bcast.remove(ws));
  });

  return wss;
}
