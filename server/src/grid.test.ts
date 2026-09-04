import { describe, expect, it } from "vitest";
import { CELLS } from "@kabza/shared";
import { createGrid } from "./game/grid";

function gridWith(...ids: string[]) {
  const g = createGrid();
  for (const id of ids) g.ensureUser(id);
  return g;
}

describe("claim", () => {
  it("takes an empty cell and bumps the version", () => {
    const g = gridWith("a");
    const res = g.claim(7, "a");
    expect(res).toMatchObject({ ok: true, already: false, delta: { cellId: 7, owner: "a", version: 1 } });
    expect(g.version).toBe(1);
    expect(g.users.get("a")!.cellCount).toBe(1);
  });

  it("first writer wins, second gets taken", () => {
    const g = gridWith("a", "b");
    g.claim(7, "a");
    expect(g.claim(7, "b")).toEqual({ ok: false, reason: "taken" });
    expect(g.cells[7].owner).toBe("a");
    expect(g.version).toBe(1);
  });

  it("re-claiming your own cell acks without a new version", () => {
    const g = gridWith("a");
    g.claim(7, "a");
    const res = g.claim(7, "a");
    expect(res).toMatchObject({ ok: true, already: true, delta: { version: 1 } });
    expect(g.version).toBe(1);
    expect(g.users.get("a")!.cellCount).toBe(1);
  });

  it("rejects junk cell ids", () => {
    const g = gridWith("a");
    for (const bad of [-1, 1000, 1.5, NaN]) {
      expect(g.claim(bad, "a")).toEqual({ ok: false, reason: "invalid" });
    }
    expect(g.claim(1, "nobody")).toEqual({ ok: false, reason: "invalid" });
  });

  it("flags board full on the last cell only", () => {
    const g = gridWith("a");
    for (let i = 0; i < CELLS - 1; i++) {
      const res = g.claim(i, "a");
      expect(res.ok && !res.boardFull).toBe(true);
    }
    const last = g.claim(CELLS - 1, "a");
    expect(last.ok && last.boardFull).toBe(true);
  });
});

describe("deltasSince", () => {
  it("replays only what happened after the given version", () => {
    const g = gridWith("a");
    g.claim(1, "a");
    g.claim(2, "a");
    g.claim(3, "a");
    expect(g.deltasSince(1).map((d) => d.cellId)).toEqual([2, 3]);
    expect(g.deltasSince(3)).toEqual([]);
  });
});
