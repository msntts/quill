import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SqliteInboxStore } from '../inbox/sqlite-inbox-store';
import { FakeSource, inboxMessage, SLICE_MS } from '../sources/__fixtures__/fake-source';
import { runFetchCycle } from './fetch-cycle';
import { OVERLAP_MS } from './fetch-window';
import { startScheduler } from './scheduler';

const INTERVAL = 30 * 60_000;
const CURSOR = 1_700_000_000_000;

describe('scheduler with fetch cycles', () => {
  let store: SqliteInboxStore;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(CURSOR + INTERVAL);
    store = SqliteInboxStore.open(':memory:');
    store.saveBatch('gmail', [], { cursorAt: CURSOR, fetchedAt: CURSOR });
  });

  afterEach(() => {
    store.close();
    vi.useRealTimers();
  });

  it('FC-14 失敗の次の回', async () => {
    const source = new FakeSource(
      'gmail',
      FakeSource.failed({ kind: 'cli-timeout' }),
      FakeSource.ok([inboxMessage('m-1', CURSOR + 60_000)]),
    );
    const noop = { append: () => {} };
    const scheduler = startScheduler({
      runCycle: () => runFetchCycle({ source, store, log: noop, now: () => Date.now(), onEvent: () => {} }),
      intervalMs: INTERVAL,
      log: noop,
      now: () => Date.now(),
    });

    await vi.advanceTimersByTimeAsync(INTERVAL);
    scheduler.stop();

    expect(source.windowStarts).toEqual([CURSOR - OVERLAP_MS, CURSOR - OVERLAP_MS]);
    expect(store.getCursor('gmail')).toBe(CURSOR + 2 * INTERVAL);
    expect(store.listMessages('gmail').map((m) => m.externalId)).toEqual(['m-1']);
  });

  it('FC-14 失敗の次の回は、前の回が終わった時点のカーソルから', async () => {
    const source = new FakeSource(
      'gmail',
      FakeSource.ok([inboxMessage('m-1', CURSOR + 60_000)]),
      FakeSource.failed({ kind: 'cli-timeout' }),
      FakeSource.ok([]),
    ).withSlices(2);
    const noop = { append: () => {} };
    const scheduler = startScheduler({
      runCycle: () => runFetchCycle({ source, store, log: noop, now: () => Date.now(), onEvent: () => {} }),
      intervalMs: INTERVAL,
      log: noop,
      now: () => Date.now(),
    });

    await vi.advanceTimersByTimeAsync(INTERVAL);
    scheduler.stop();

    const firstSliceEnd = CURSOR - OVERLAP_MS + SLICE_MS;
    expect(source.windowStarts).toEqual([CURSOR - OVERLAP_MS, firstSliceEnd - OVERLAP_MS]);
  });
});
