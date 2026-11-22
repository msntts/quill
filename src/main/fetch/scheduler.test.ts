import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CallLogEntry } from '../log/call-log';
import { DEFAULT_INTERVAL_MS, startScheduler } from './scheduler';

const INTERVAL = 30 * 60_000;

describe('startScheduler', () => {
  let logged: CallLogEntry[];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    logged = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function start(runCycle: () => Promise<unknown>) {
    return startScheduler({ runCycle, intervalMs: INTERVAL, log: { append: (e) => logged.push(e) }, now: () => Date.now() });
  }

  it('defaults to a 30 minute interval', () => {
    expect(DEFAULT_INTERVAL_MS).toBe(INTERVAL);
  });

  it('FC-01 起動時に取得する', () => {
    const runCycle = vi.fn(async () => {});

    const scheduler = start(runCycle);

    expect(runCycle).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it('FC-02 間隔ごとに取得する', async () => {
    const runCycle = vi.fn(async () => {});
    const scheduler = start(runCycle);

    await vi.advanceTimersByTimeAsync(INTERVAL - 1);
    expect(runCycle).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(runCycle).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(INTERVAL);
    expect(runCycle).toHaveBeenCalledTimes(3);
    scheduler.stop();
  });

  it('FC-03 前回の取得が終わっていない', async () => {
    let finish: () => void = () => {};
    const runCycle = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const scheduler = start(runCycle);

    await vi.advanceTimersByTimeAsync(INTERVAL);

    expect(runCycle).toHaveBeenCalledTimes(1);
    expect(logged).toEqual([{ type: 'skipped', at: 1_700_000_000_000 + INTERVAL }]);
    finish();
    scheduler.stop();
  });

  it('FC-04 前回の取得が終わったあと', async () => {
    let finish: () => void = () => {};
    const runCycle = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const scheduler = start(runCycle);

    await vi.advanceTimersByTimeAsync(INTERVAL / 2);
    finish();
    await vi.advanceTimersByTimeAsync(INTERVAL / 2);

    expect(runCycle).toHaveBeenCalledTimes(2);
    expect(logged).toEqual([]);
    scheduler.stop();
  });

  it('keeps scheduling after a cycle rejects', async () => {
    const runCycle = vi.fn(async () => {
      throw new Error('boom');
    });
    const scheduler = start(runCycle);

    await vi.advanceTimersByTimeAsync(INTERVAL);

    expect(runCycle).toHaveBeenCalledTimes(2);
    expect(logged).toEqual([]);
    scheduler.stop();
  });

  it('stops scheduling after stop()', async () => {
    const runCycle = vi.fn(async () => {});
    start(runCycle).stop();

    await vi.advanceTimersByTimeAsync(INTERVAL * 3);

    expect(runCycle).toHaveBeenCalledTimes(1);
  });
});
