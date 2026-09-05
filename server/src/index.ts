import { PRESENCE_MS } from "@kabza/shared";
import { DB_PATH, PORT } from "./config";
import { openDb } from "./db";
import { createGrid } from "./game/grid";
import { createLimiter } from "./game/gcra";
import { createRounds } from "./game/rounds";
import { createBroadcast } from "./broadcast";
import { createHttp } from "./http";
import { attachWs } from "./ws";

const db = openDb(DB_PATH);
const grid = createGrid();
grid.restore(db.load());

const bcast = createBroadcast(grid);
const limiter = createLimiter();
const rounds = createRounds(grid, bcast, db);
rounds.bootCheck();

const server = createHttp(grid, bcast, rounds, db);
attachWs(server, { grid, bcast, db, limiter, rounds });

setInterval(() => {
  bcast.sendAll({
    type: "presence",
    online: bcast.online,
    round: grid.round,
    leaderboard: grid.standings().slice(0, 5),
  });
  limiter.sweep();
}, PRESENCE_MS);

server.listen(PORT, () => {
  console.log(`kabza server on :${PORT}, round ${grid.round}, ${grid.claimed} cells claimed`);
});
