import { CELLS, FREEZE_MS } from "@kabza/shared";
import type { Grid } from "./grid";
import type { Broadcast } from "../broadcast";
import type { Db } from "../db";

export function createRounds(grid: Grid, bcast: Broadcast, db: Db) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  function enterFrozen() {
    bcast.flushNow(); // the winning delta has to land before roundOver
    const standings = grid.standings();
    grid.freeze(Date.now() + FREEZE_MS);
    bcast.sendAll({
      type: "roundOver",
      round: grid.round,
      winner: standings[0] ?? null,
      standings,
      freezeMs: FREEZE_MS,
    });
    timer = setTimeout(startNext, FREEZE_MS);
  }

  function startNext() {
    if (timer) clearTimeout(timer);
    timer = null;
    const next = grid.round + 1;
    db.setRound(next);
    grid.resetForNewRound(next);
    bcast.clearQueue();
    bcast.sendAll({ type: "roundStart", round: next, globalVersion: grid.version });
  }

  return {
    enterFrozen,
    // admin reset is just an early round start — old claims stay in the log
    adminReset: startNext,
    bootCheck() {
      // a restart mid-freeze isn't persisted; a full board on boot gets a fresh freeze
      if (grid.claimed === CELLS) enterFrozen();
    },
  };
}

export type Rounds = ReturnType<typeof createRounds>;
