import { describe, expect, it } from 'vitest';
import { computeWindowStart, filterByWindow, INITIAL_LOOKBACK_MS, OVERLAP_MS } from './fetch-window';

const MINUTE = 60_000;
const T = 1_700_000_000_000;

function received(receivedAt: number) {
  return { receivedAt, externalId: String(receivedAt) };
}

describe('fetch window', () => {
  it('uses a 10 minute overlap and a 24 hour initial lookback', () => {
    expect(OVERLAP_MS).toBe(10 * MINUTE);
    expect(INITIAL_LOOKBACK_MS).toBe(24 * 60 * MINUTE);
  });

  it('FC-05 カーソルより前のメッセージは対象にしない', () => {
    const start = computeWindowStart(T, T + 30 * MINUTE);

    const kept = filterByWindow([received(T - 10 * MINUTE - 1), received(T - 60 * MINUTE)], start);

    expect(kept).toEqual([]);
  });

  it('FC-06 重ね時間の中のメッセージは対象にする', () => {
    const start = computeWindowStart(T, T + 30 * MINUTE);
    const atBoundary = received(T - 10 * MINUTE);
    const inside = received(T - 1);
    const after = received(T + MINUTE);

    expect(filterByWindow([atBoundary, inside, after], start)).toEqual([atBoundary, inside, after]);
  });

  it('FC-07 初回は24時間前から', () => {
    const S = T;
    const start = computeWindowStart(null, S);

    expect(start).toBe(S - 24 * 60 * MINUTE);
    expect(filterByWindow([received(S - 24 * 60 * MINUTE - 1), received(S - 24 * 60 * MINUTE)], start)).toEqual([
      received(S - 24 * 60 * MINUTE),
    ]);
  });
});
