import { describe, expect, it } from "vitest";
import { createLimiter } from "./game/gcra";

function testClock() {
  let t = 0;
  return { now: () => t, tick: (ms: number) => (t += ms) };
}

describe("gcra limiter", () => {
  it("allows a burst of 3 then denies with a retry hint", () => {
    const clock = testClock();
    const lim = createLimiter(clock.now);
    expect(lim.check("a").ok).toBe(true);
    expect(lim.check("a").ok).toBe(true);
    expect(lim.check("a").ok).toBe(true);
    const fourth = lim.check("a");
    expect(fourth).toEqual({ ok: false, retryAfterMs: 1000 });
  });

  it("lets you back in after the retry hint elapses", () => {
    const clock = testClock();
    const lim = createLimiter(clock.now);
    for (let i = 0; i < 3; i++) lim.check("a");
    const denied = lim.check("a");
    if (denied.ok) throw new Error("should be denied");
    clock.tick(denied.retryAfterMs);
    expect(lim.check("a").ok).toBe(true);
  });

  it("sustains exactly one claim per second", () => {
    const clock = testClock();
    const lim = createLimiter(clock.now);
    for (let i = 0; i < 3; i++) lim.check("a"); // spend the burst
    for (let i = 0; i < 20; i++) {
      clock.tick(1000);
      expect(lim.check("a").ok).toBe(true);
      expect(lim.check("a").ok).toBe(false);
    }
  });

  it("recovers the full burst after sitting idle", () => {
    const clock = testClock();
    const lim = createLimiter(clock.now);
    for (let i = 0; i < 4; i++) lim.check("a");
    clock.tick(10_000);
    expect(lim.check("a").ok).toBe(true);
    expect(lim.check("a").ok).toBe(true);
    expect(lim.check("a").ok).toBe(true);
    expect(lim.check("a").ok).toBe(false);
  });

  it("keeps users separate", () => {
    const clock = testClock();
    const lim = createLimiter(clock.now);
    for (let i = 0; i < 4; i++) lim.check("a");
    expect(lim.check("b").ok).toBe(true);
  });
});
