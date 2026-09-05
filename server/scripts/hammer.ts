import WebSocket from "ws";
import { CELLS } from "@kabza/shared";

// spam the server well over the rate limit from many users, then check
// that every view of the board agrees: acks, snapshot, memory, sqlite

const BASE = process.env.HAMMER_URL ?? "http://localhost:8090";
const WS_URL = BASE.replace("http", "ws") + "/ws";
const TOKEN = process.env.ADMIN_TOKEN ?? "dev-token";
const USERS = 40;
const TARGET = 800;
const TIMEOUT_MS = 60_000;

const reset = await fetch(`${BASE}/admin/reset`, { method: "POST", headers: { authorization: `Bearer ${TOKEN}` } });
if (!reset.ok) {
  console.error("admin reset failed, is the server running with the right ADMIN_TOKEN?");
  process.exit(1);
}

// idempotent re-acks repeat an old version, so unique versions = real claims
const ackedVersions = new Set<number>();
let taken = 0;
let cooldown = 0;
const ackLat: number[] = [];
const deltaLat: number[] = [];
const sentAt = new Map<string, number>(); // "user:cell" -> t, for delta latency at the observer

const connect = (hello: object, onMsg: (m: any) => void) =>
  new Promise<WebSocket>((res, rej) => {
    const ws = new WebSocket(WS_URL);
    ws.on("message", (raw) => onMsg(JSON.parse(raw.toString())));
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "hello", ...hello }));
      res(ws);
    });
    ws.on("error", rej);
  });

const observer = await connect({ userId: "hammer-observer" }, (m) => {
  if (m.type !== "deltas") return;
  const now = Date.now();
  for (const d of m.deltas) {
    const t = sentAt.get(`${d.owner}:${d.cellId}`);
    if (t) deltaLat.push(now - t);
  }
});

const workers: { ws: WebSocket; timer: NodeJS.Timeout }[] = [];
for (let i = 0; i < USERS; i++) {
  const id = `hammer-${i}`;
  const inflight = new Map<number, number>(); // seq -> sent time
  let seq = 1;
  const ws = await connect({ userId: id }, (m) => {
    if (m.type === "ack") {
      const t = inflight.get(m.clientSeq);
      if (t) ackLat.push(Date.now() - t);
      ackedVersions.add(m.version);
    } else if (m.type === "nack") {
      if (m.reason === "taken") taken++;
      else if (m.reason === "cooldown") cooldown++;
    }
  });
  const timer = setInterval(() => {
    if (ackedVersions.size >= TARGET) return;
    const cellId = Math.floor(Math.random() * CELLS);
    const t = Date.now();
    inflight.set(seq, t);
    sentAt.set(`${id}:${cellId}`, t);
    ws.send(JSON.stringify({ type: "claim", cellId, clientSeq: seq++ }));
  }, 250); // 4/sec each, 4x over the limit
  workers.push({ ws, timer });
}

const started = Date.now();
while (ackedVersions.size < TARGET && Date.now() - started < TIMEOUT_MS) {
  await new Promise((r) => setTimeout(r, 200));
}
for (const w of workers) clearInterval(w.timer);
await new Promise((r) => setTimeout(r, 800)); // let stragglers land

let snapshotOwned = -1;
await connect({ userId: "hammer-observer-2" }, (m) => {
  if (m.type === "snapshot") snapshotOwned = m.cells.filter((c: any) => c.owner).length;
});
await new Promise((r) => setTimeout(r, 500));

const health = (await fetch(`${BASE}/healthz`).then((r) => r.json())) as any;
for (const w of workers) w.ws.close();
observer.close();

const pct = (arr: number[], p: number) => {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
};

const accepted = ackedVersions.size;
console.log(`accepted ${accepted}, taken ${taken}, cooldown ${cooldown}`);
console.log(`claim->ack     p50 ${pct(ackLat, 50)}ms  p95 ${pct(ackLat, 95)}ms`);
console.log(`claim->seen    p50 ${pct(deltaLat, 50)}ms  p95 ${pct(deltaLat, 95)}ms  (${deltaLat.length} observed)`);
console.log(`snapshot ${snapshotOwned} | memory ${health.claimed} | sqlite ${health.dbClaimsThisRound}`);

const consistent = snapshotOwned === accepted && health.claimed === accepted && health.dbClaimsThisRound === accepted;
if (!consistent) {
  console.error("INCONSISTENT — the four counts don't agree");
  process.exit(1);
}
if (cooldown === 0) {
  console.error("rate limiter never kicked in?");
  process.exit(1);
}
console.log("consistent, limiter engaged — pass");
process.exit(0);
