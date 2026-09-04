import { describe, expect, it } from "vitest";
import { RESYNC_MAX_GAP } from "@kabza/shared";
import { chooseSync } from "./ws";

describe("chooseSync", () => {
  it("snapshots a fresh client", () => {
    expect(chooseSync(undefined, undefined, 1, 500)).toBe("snapshot");
  });

  it("snapshots across a round boundary", () => {
    expect(chooseSync(1, 490, 2, 500)).toBe("snapshot");
  });

  it("snapshots when the gap is too big", () => {
    expect(chooseSync(1, 500 - RESYNC_MAX_GAP - 1, 1, 500)).toBe("snapshot");
  });

  it("snapshots a client ahead of the server (wiped restart)", () => {
    expect(chooseSync(1, 900, 1, 500)).toBe("snapshot");
  });

  it("replays deltas for a small gap", () => {
    expect(chooseSync(1, 490, 1, 500)).toBe("deltas");
    expect(chooseSync(1, 500 - RESYNC_MAX_GAP, 1, 500)).toBe("deltas");
    expect(chooseSync(1, 500, 1, 500)).toBe("deltas");
  });
});
