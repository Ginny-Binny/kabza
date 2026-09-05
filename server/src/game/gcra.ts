import { CLAIM_BURST, CLAIM_INTERVAL_MS } from "@kabza/shared";

// gcra: one claim per second sustained, burst of 3. a denial doesn't
// consume budget, so hammering while limited doesn't dig a deeper hole
export function createLimiter(clock: () => number = Date.now) {
  const tat = new Map<string, number>(); // theoretical arrival time per user
  const tau = CLAIM_INTERVAL_MS * (CLAIM_BURST - 1);

  return {
    check(id: string): { ok: true } | { ok: false; retryAfterMs: number } {
      const now = clock();
      const t = Math.max(tat.get(id) ?? 0, now);
      const allowAt = t - tau;
      if (now < allowAt) return { ok: false, retryAfterMs: allowAt - now };
      tat.set(id, t + CLAIM_INTERVAL_MS);
      return { ok: true };
    },
    sweep() {
      const cutoff = clock() - 60_000;
      for (const [id, t] of tat) if (t < cutoff) tat.delete(id);
    },
  };
}

export type Limiter = ReturnType<typeof createLimiter>;
