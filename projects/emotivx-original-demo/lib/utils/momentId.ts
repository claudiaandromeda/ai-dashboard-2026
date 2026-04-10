import { createHash } from "crypto";

export type MomentIdInput = {
  feedProvider: string;
  matchId: string;
  eventId: string;
  timestamp: string;
  rulesetVersion: string;
};

export function generateMomentId(input: MomentIdInput): string {
  const payload = [
    input.feedProvider,
    input.matchId,
    input.eventId,
    input.timestamp,
    input.rulesetVersion,
  ].join("|");

  return createHash("sha256").update(payload).digest("hex");
}
