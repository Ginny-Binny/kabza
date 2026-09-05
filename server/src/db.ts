import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Delta, User } from "@kabza/shared";

export function openDb(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  // NORMAL can lose the last few claims on a power cut, not on an app crash.
  // fine for a game, called out in the readme
  db.pragma("synchronous = NORMAL");

  db.exec(`
    create table if not exists meta (key text primary key, value text not null);
    create table if not exists users (id text primary key, name text not null, color text not null);
    create table if not exists claims (
      version integer primary key,
      round integer not null,
      cell_id integer not null,
      user_id text not null,
      color text not null,
      claimed_at integer not null
    );
    create index if not exists idx_claims_round on claims (round, version);
  `);

  const getMeta = db.prepare("select value from meta where key = ?");
  const setMeta = db.prepare(
    "insert into meta (key, value) values (?, ?) on conflict (key) do update set value = excluded.value",
  );
  const upsert = db.prepare(
    "insert into users (id, name, color) values (?, ?, ?) on conflict (id) do update set name = excluded.name",
  );
  const insertClaim = db.prepare(
    "insert into claims (version, round, cell_id, user_id, color, claimed_at) values (?, ?, ?, ?, ?, ?)",
  );
  const forRound = db.prepare(
    "select version, cell_id as cellId, user_id as owner, color from claims where round = ? order by version",
  );
  const maxVersion = db.prepare("select coalesce(max(version), 0) as v from claims");
  const countForRound = db.prepare("select count(*) as n from claims where round = ?");
  const allUsers = db.prepare("select id, name, color from users");

  return {
    get round() {
      const row = getMeta.get("round") as { value: string } | undefined;
      return row ? Number(row.value) : 1;
    },
    setRound(r: number) {
      setMeta.run("round", String(r));
    },
    upsertUser(u: User) {
      upsert.run(u.id, u.name, u.color);
    },
    appendClaim(d: Delta, round: number, at: number) {
      insertClaim.run(d.version, round, d.cellId, d.owner, d.color, at);
    },
    load() {
      const round = this.round;
      return {
        round,
        version: (maxVersion.get() as { v: number }).v,
        users: allUsers.all() as { id: string; name: string; color: string }[],
        deltas: forRound.all(round) as Delta[],
      };
    },
    claimCount(round: number) {
      return (countForRound.get(round) as { n: number }).n;
    },
    close() {
      db.close();
    },
  };
}

export type Db = ReturnType<typeof openDb>;
