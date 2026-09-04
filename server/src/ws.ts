import { WebSocketServer } from "ws";
import type { Server } from "node:http";
import { WS_PATH } from "@kabza/shared";
import type { C2S, S2C } from "@kabza/shared";
import type { Grid } from "./game/grid";
import type { Broadcast } from "./broadcast";

export function attachWs(server: Server, grid: Grid, bcast: Broadcast) {
  const wss = new WebSocketServer({ server, path: WS_PATH });

  wss.on("connection", (ws) => {
    let userId: string | null = null;
    const send = (msg: S2C) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
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
        bcast.add(ws, userId);
        return;
      }

      if (!userId) return;

      if (msg.type === "claim") {
        const res = grid.claim(msg.cellId, userId);
        if (res.ok) bcast.delta(res.delta);
      }
    });

    ws.on("close", () => bcast.remove(ws));
  });

  return wss;
}
