const MINUTE_MS = 60_000;

/** How far before the cursor each fetch reaches back, to catch late arrivals. */
export const OVERLAP_MS = 10 * MINUTE_MS;

/** How far back the very first fetch of a source reaches. */
export const INITIAL_LOOKBACK_MS = 24 * 60 * MINUTE_MS;

/** Start (inclusive, UNIX ms) of the period a fetch covers. */
export function computeWindowStart(cursor: number | null, now: number): number {
  return cursor === null ? now - INITIAL_LOOKBACK_MS : cursor - OVERLAP_MS;
}

/** Keeps only messages received at or after the window start. */
export function filterByWindow<T extends { receivedAt: number }>(messages: readonly T[], windowStart: number): T[] {
  return messages.filter((m) => m.receivedAt >= windowStart);
}
