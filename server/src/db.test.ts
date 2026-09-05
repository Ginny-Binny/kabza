import { describe, expect, it } from "vitest";
import { openDb } from "./db";
import { createGrid } from "./game/grid";

const user = (id: string, color = "#abc") => ({ id, name: id, color, cellCount: 0 });

describe("claim log", () => {
  it("rebuilds the grid from the log on boot", () => {
    const db = openDb(":memory:");
    db.upsertUser(user("a"));
    db.appendClaim({ cellId: 3, owner: "a", color: "#abc", version: 1 }, 1, 111);
    db.appendClaim({ cellId: 9, owner: "a", color: "#abc", version: 2 }, 1, 222);

    const grid = createGrid();
    grid.restore(db.load());
    expect(grid.version).toBe(2);
    expect(grid.claimed).toBe(2);
    expect(grid.cells[3]).toEqual({ owner: "a", color: "#abc", version: 1 });
    expect(grid.users.get("a")!.cellCount).toBe(2);
    expect(grid.deltasSince(1).map((d) => d.cellId)).toEqual([9]);
  });

  it("only replays the current round but keeps the global max version", () => {
    const db = openDb(":memory:");
    db.upsertUser(user("a"));
    db.appendClaim({ cellId: 1, owner: "a", color: "#abc", version: 1 }, 1, 1);
    db.appendClaim({ cellId: 2, owner: "a", color: "#abc", version: 2 }, 1, 2);
    db.setRound(2);
    db.appendClaim({ cellId: 5, owner: "a", color: "#abc", version: 3 }, 2, 3);

    const saved = db.load();
    expect(saved.round).toBe(2);
    expect(saved.version).toBe(3);
    expect(saved.deltas.map((d) => d.cellId)).toEqual([5]);
    expect(db.claimCount(1)).toBe(2);
    expect(db.claimCount(2)).toBe(1);
  });

  it("starts empty at round 1", () => {
    const db = openDb(":memory:");
    expect(db.load()).toEqual({ round: 1, version: 0, users: [], deltas: [] });
  });

  it("keeps the latest name on upsert", () => {
    const db = openDb(":memory:");
    db.upsertUser(user("a"));
    db.upsertUser({ ...user("a"), name: "renamed" });
    expect(db.load().users).toEqual([{ id: "a", name: "renamed", color: "#abc" }]);
  });
});
