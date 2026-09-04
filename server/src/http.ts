import { createServer } from "node:http";
import type { Grid } from "./game/grid";

export function createHttp(grid: Grid) {
  return createServer((req, res) => {
    if (req.url === "/healthz") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, round: grid.round, claimed: grid.claimed, version: grid.version }));
      return;
    }
    res.writeHead(404);
    res.end("not found");
  });
}
