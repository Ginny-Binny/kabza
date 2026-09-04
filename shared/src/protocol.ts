export type User = { id: string; name: string; color: string; cellCount: number };
export type Cell = { owner: string | null; color: string | null; version: number };
export type Delta = { cellId: number; owner: string; color: string; version: number };
export type Phase = "active" | "frozen";
export type NackReason = "taken" | "cooldown" | "frozen" | "invalid";

export type C2S =
  | { type: "hello"; userId: string; name?: string; sinceVersion?: number; round?: number }
  | { type: "claim"; cellId: number; clientSeq: number }
  | { type: "resync"; sinceVersion: number; round: number }
  | { type: "setName"; name: string };

export type S2C =
  | {
      type: "snapshot";
      round: number;
      phase: Phase;
      freezeEndsAt: number | null;
      globalVersion: number;
      cells: Cell[];
      users: User[];
      you: User;
    }
  | { type: "deltas"; round: number; deltas: Delta[] }
  | { type: "ack"; clientSeq: number; cellId: number; version: number }
  | { type: "nack"; clientSeq: number; cellId: number; reason: NackReason; retryAfterMs?: number }
  | { type: "presence"; online: number; round: number; leaderboard: User[] }
  | { type: "userUpdate"; id: string; name: string }
  | { type: "roundOver"; round: number; winner: User | null; standings: User[]; freezeMs: number }
  | { type: "roundStart"; round: number; globalVersion: number };
