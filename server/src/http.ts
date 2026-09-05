import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { ADMIN_TOKEN } from "./config";
import type { Grid } from "./game/grid";
import type { Rounds } from "./game/rounds";
import type { Broadcast } from "./broadcast";
import type { Db } from "./db";

const DIST = fileURLToPath(new URL("../../client/dist", import.meta.url));

const TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
};

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

    // static client build (prod; in dev vite serves the client itself)
    const path = (req.url ?? "/").split("?")[0];
    const file = normalize(join(DIST, path === "/" ? "index.html" : path));
    if (!file.startsWith(DIST)) {
      res.writeHead(403);
      return res.end();
    }
    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404);
      return res.end("not found");
    }
    res.writeHead(200, {
      "content-type": TYPES[extname(file)] ?? "application/octet-stream",
      // vite hashes asset filenames, so those can cache forever
      "cache-control": path.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
    });
    createReadStream(file).pipe(res);
  });
}
