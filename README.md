# kabza

A shared board of 1000 hand drawn cells. Open the site, click a square and it's yours. Everyone else sees it in under 100ms. When the board fills up, a winner is shown, the board freezes for 10 seconds and a fresh round starts on its own.

![the board mid-round](docs/board.png)

No signup. You get a color and a name like player-7 the moment you open it, and you can rename yourself from the top bar while playing.

## run it

Needs node 20+.

```sh
npm install
npm run dev        # server on :8090, app on http://localhost:5173
```

For prod it's one process that serves everything:

```sh
npm run build
npm start          # all on :8090
```

Also there:

```sh
npm test           # unit tests
npm run hammer     # 40 fake users spam claims, then it checks all counts still match
```

Config is just env vars: `PORT`, `DB_PATH`, `ADMIN_TOKEN`. VPS setup lives in [deploy/DEPLOY.md](deploy/DEPLOY.md).

## how it talks

One websocket per tab, plain JSON. I used raw `ws` instead of socket.io because writing the protocol myself was the point of this project. All message types are in [shared/src/protocol.ts](shared/src/protocol.ts).

Client sends:

- `hello` - join or rejoin, also tells the server the last update I saw
- `claim` - try to take a cell
- `resync` - ask for missed updates if I notice a gap
- `setName` - rename

Server sends:

- `snapshot` - the whole board
- `deltas` - accepted claims, grouped every 50ms into one message
- `ack` / `nack` - your claim worked, or why it didn't (taken, cooldown, frozen, invalid)
- `presence` - online count and leaderboard, every 5s and once right when you join
- `userUpdate`, `roundOver`, `roundStart`

## two people click the same cell

The server is the only authority and node runs message handlers one at a time. So two clicks on the same cell just arrive in some order. First one wins, second one gets `nack taken`. No locks anywhere, the event loop is the lock.

Every accepted claim gets a version number that only goes up. The client only applies an update if its version is newer than what it already has, so acks, broadcasts and replays can arrive in any order and nothing breaks.

Claiming a cell you already own just gets an ok again. That makes retries after a reconnect completely safe.

## why it feels instant

Your click paints the cell right away, before the server even answers. If the server says no, the cell shakes and goes back. The ack carries the version number so the cell can settle immediately instead of flashing while waiting for the broadcast.

## storage

The board lives in memory. Every claim is also written to sqlite inside the same handler, so the log can never be behind what players saw. On restart the server replays the current round from the log and the board comes back exactly as it was.

On reconnect the client says the last version it saw. Small gap: server sends just what was missed. Big gap, new round, or a wiped db: full snapshot.

Sqlite runs in WAL mode with synchronous NORMAL, which means a power cut could lose the last second of claims. An app crash loses nothing. Fine trade for a game.

## rounds instead of a reset button

A public reset button on a shared board is just griefing, so there isn't one. Board fills up, everyone sees the standings, 10 second freeze, new round. There is a private `POST /admin/reset` behind a token for demos and accidents.

## rate limit

1 claim per second with a burst of 3, per user (GCRA, about 25 lines). Too fast gets a nack with the wait time and the UI shows a small ring. I've shipped this same algorithm in a webhook delivery pipeline before, it's my favorite tiny limiter.

The hammer script is the proof: 40 users clicking 4x over the limit. On my machine acks come back in about 1ms, other clients see a claim in about 60ms, and at the end the acks, the snapshot, memory and sqlite all agree exactly.

## the look

rough.js rectangles on one big svg, each cell drawn with a fixed seed so it never wiggles between redraws. Excalifont for the text (open license, bundled in the repo). Colors are 12 fixed pastels picked by hashing the user id, never random.

## choices i made

- tsx runs the server in prod, no build step. It's an io bound app, fine.
- better-sqlite3 pinned to v11, since v12 has no prebuilt binary for node 20 on windows.
- no snapshot table in the db, replaying one round is at most 1000 rows.

## if this had to scale

Move cell ownership to redis (SET NX per cell), take versions from INCR, fan updates out over pub/sub and keep the websocket servers stateless. At 100k cells you'd also only send a client updates for the part of the board they can actually see. None of that is built on purpose, 1000 cells doesn't need it.

## not done

Auth, teams, chat, zoom and pan, replay mode (the claim log already holds everything a replay would need).
