import { createServer } from "node:http";
import { ADMIN_TOKEN } from "./config";
import type { Grid } from "./game/grid";
import type { Rounds } from "./game/rounds";
import type { Broadcast } from "./broadcast";
import type { Db } from "./db";

export function createHttp(grid: Grid, bcast: Broadcast, rounds: Rounds, db: Db) {
  return createServer((req, res) => {
    const json = (code: number, body: unknown) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };

    if (req.url === "/healthz") {
      return json(200, {
        ok: true,
        round: grid.round,
        phase: grid.phase,
        online: bcast.online,
        claimed: grid.claimed,
        version: grid.version,
        dbClaimsThisRound: db.claimCount(grid.round),
      });
    }

    if (req.url === "/admin/reset") {
      if (req.method !== "POST") return json(405, { error: "post only" });
      if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return json(401, { error: "bad token" });
      rounds.adminReset();
      return json(200, { ok: true, round: grid.round });
    }

    res.writeHead(404);
    res.end("not found");
  });
}
