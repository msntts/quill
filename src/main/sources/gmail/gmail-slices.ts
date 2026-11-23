import type { FetchSlice } from '../message-source';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD of an instant in UTC. */
export function utcDate(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

/**
 * One slice per UTC day, from the day holding windowStart to the day holding now.
 * Gmail's date search splits days at 00:00 UTC (observed, design.md D11).
 */
export function planGmailSlices(windowStart: number, now: number): FetchSlice[] {
  const slices: FetchSlice[] = [];
  for (let start = windowStart - (windowStart % DAY_MS); start <= now; start += DAY_MS) {
    slices.push({ label: utcDate(start), startsAt: start, endsAt: start + DAY_MS });
  }
  return slices;
}
