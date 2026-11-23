import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SqliteInboxStore } from '../inbox/sqlite-inbox-store';
import type { CallLogEntry } from '../log/call-log';
import { FAKE_STATS, FakeSource, inboxMessage } from '../sources/__fixtures__/fake-source';
import type { FetchEvent } from '../status/quill-status';
import { runFetchCycle } from './fetch-cycle';

const MINUTE = 60_000;
const CURSOR = 1_700_000_000_000;
const S = CURSOR + 30 * MINUTE;

describe('runFetchCycle', () => {
  let store: SqliteInboxStore;
  let logged: CallLogEntry[];
  let events: FetchEvent[];

  beforeEach(() => {
    store = SqliteInboxStore.open(':memory:');
    store.saveBatch('gmail', [], { cursorAt: CURSOR, fetchedAt: CURSOR });
    logged = [];
    events = [];
  });

  afterEach(() => store.close());

  function run(source: FakeSource, now = S) {
    return runFetchCycle({
      source,
      store,
      log: { append: (e) => logged.push(e) },
      now: () => now,
      onEvent: (e) => events.push(e),
    });
  }

  it('FC-08 成功したらカーソルを進める', async () => {
    await run(new FakeSource('gmail', FakeSource.ok([inboxMessage('m-1', CURSOR + MINUTE)])));

    expect(store.getCursor('gmail')).toBe(S);
    expect(store.listMessages('gmail').map((m) => m.externalId)).toEqual(['m-1']);
  });

  it('FC-09 新着が0件でもカーソルを進める', async () => {
    await run(new FakeSource('gmail', FakeSource.ok([])));

    expect(store.getCursor('gmail')).toBe(S);
  });

  it('FC-05 カーソルより前のメッセージは対象にしない (1回分として)', async () => {
    await run(new FakeSource('gmail', FakeSource.ok([inboxMessage('old', CURSOR - 10 * MINUTE - 1)])));

    expect(store.listMessages('gmail')).toEqual([]);
  });

  it('FC-06 重ね時間の中のメッセージは対象にする (1回分として)', async () => {
    const source = new FakeSource('gmail', FakeSource.ok([inboxMessage('late', CURSOR - 5 * MINUTE)]));

    await run(source);

    expect(source.windowStarts).toEqual([CURSOR - 10 * MINUTE]);
    expect(store.listMessages('gmail').map((m) => m.externalId)).toEqual(['late']);
  });

  describe('slices', () => {
    it('FC-19 区切りごとに保存する', async () => {
      const saved: string[][] = [];
      const spy = Object.assign(Object.create(store), {
        saveBatch: (src: string, messages: { externalId: string }[], options: { cursorAt: number; fetchedAt: number }) => {
          saved.push(messages.map((m) => m.externalId));
          return store.saveBatch(src, messages as never, options);
        },
      });
      const source = new FakeSource(
        'gmail',
        FakeSource.ok([inboxMessage('a', CURSOR + MINUTE)]),
        FakeSource.ok([inboxMessage('b', CURSOR + 2 * MINUTE)]),
        FakeSource.ok([inboxMessage('c', CURSOR + 3 * MINUTE)]),
      ).withSlices(3);

      const result = await runFetchCycle({ source, store: spy, log: { append: (e) => logged.push(e) }, now: () => S, onEvent: (e) => events.push(e) });

      expect(source.fetchedSlices).toEqual(['slice-1', 'slice-2', 'slice-3']);
      expect(saved).toEqual([['a'], ['b'], ['c']]);
      expect(result).toEqual({ ok: true, newCount: 3 });
      expect(store.getCursor('gmail')).toBe(S);
      expect(events).toEqual([{ type: 'fetch-started' }, { type: 'fetch-succeeded', newCount: 3 }]);
    });

    it('FC-20 途中の区切りで失敗する (GS-22)', async () => {
      const source = new FakeSource(
        'gmail',
        FakeSource.ok([inboxMessage('a', CURSOR + MINUTE)]),
        FakeSource.failed({ kind: 'cli-timeout' }),
        FakeSource.ok([inboxMessage('c', CURSOR + 3 * MINUTE)]),
      ).withSlices(3);

      const result = await run(source);

      expect(result).toEqual({ ok: false });
      expect(source.fetchedSlices).toEqual(['slice-1', 'slice-2']);
      expect(store.listMessages('gmail').map((m) => m.externalId)).toEqual(['a']);
      expect(store.getCursor('gmail')).toBe(source.slices[0]!.endsAt);
      expect(events).toEqual([{ type: 'fetch-started' }, { type: 'fetch-failed' }]);
    });

    it('FC-10 最初の区切りで失敗したらカーソルを進めない', async () => {
      const source = new FakeSource('gmail', FakeSource.failed({ kind: 'cli-exit' }), FakeSource.ok([])).withSlices(3);

      await run(source);

      expect(source.fetchedSlices).toEqual(['slice-1']);
      expect(store.getCursor('gmail')).toBe(CURSOR);
    });

    it('filters every slice by the same window start', async () => {
      const source = new FakeSource(
        'gmail',
        FakeSource.ok([inboxMessage('old', CURSOR - 11 * MINUTE)]),
        FakeSource.ok([inboxMessage('new', CURSOR + MINUTE)]),
      ).withSlices(2);

      await run(source);

      expect(store.listMessages('gmail').map((m) => m.externalId)).toEqual(['new']);
    });

    it('FC-21 区切りごとに記録する', async () => {
      await run(new FakeSource('gmail', FakeSource.ok([])).withSlices(3));

      expect(logged.map((e) => e.type === 'fetch' && e.slice)).toEqual(['slice-1', 'slice-2', 'slice-3']);
    });
  });

  it('reports started and succeeded events with the new message count', async () => {
    const result = await run(new FakeSource('gmail', FakeSource.ok([inboxMessage('m-1', CURSOR + MINUTE)])));

    expect(result).toEqual({ ok: true, newCount: 1 });
    expect(events).toEqual([{ type: 'fetch-started' }, { type: 'fetch-succeeded', newCount: 1 }]);
  });

  describe('failures', () => {
    async function expectFailedCycle(source: FakeSource, storeOverride?: Partial<SqliteInboxStore>) {
      const result = await runFetchCycle({
        source,
        store: storeOverride ? Object.assign(Object.create(store), storeOverride) : store,
        log: { append: (e) => logged.push(e) },
        now: () => S,
        onEvent: (e) => events.push(e),
      });

      expect(result).toEqual({ ok: false });
      expect(store.listMessages('gmail')).toEqual([]);
      expect(store.getCursor('gmail')).toBe(CURSOR);
      expect(events).toEqual([{ type: 'fetch-started' }, { type: 'fetch-failed' }]);
    }

    it('FC-10 失敗したらカーソルを進めない', async () => {
      await expectFailedCycle(new FakeSource('gmail', FakeSource.failed({ kind: 'procedure-incomplete', reason: 'thread-unread' })));
    });

    it('FC-11 検証に失敗した', async () => {
      await expectFailedCycle(
        new FakeSource('gmail', FakeSource.failed({ kind: 'tool-result-invalid', issues: [{ code: 'invalid_type', path: ['messages', 0, 'id'] }] })),
      );
    });

    it('FC-12 Claude CLI が失敗した', async () => {
      await expectFailedCycle(new FakeSource('gmail', FakeSource.failed({ kind: 'cli-exit' })));
    });

    it('FC-13 制限時間を超えた (1回分として)', async () => {
      await expectFailedCycle(new FakeSource('gmail', FakeSource.failed({ kind: 'cli-timeout' })));
    });

    it('fails without saving when the store fails', async () => {
      const source = new FakeSource('gmail', FakeSource.ok([inboxMessage('m-1', CURSOR + MINUTE)]));

      await expectFailedCycle(source, {
        saveBatch: () => {
          throw new Error('disk full');
        },
      });
    });

    it('fails when the source throws unexpectedly', async () => {
      await expectFailedCycle(
        new FakeSource('gmail', async () => {
          throw new Error('boom');
        }),
      );
    });
  });

  describe('call log', () => {
    it('FC-15 成功した呼び出しを記録する', async () => {
      await run(
        new FakeSource('gmail', FakeSource.ok([inboxMessage('m-1', CURSOR + MINUTE), inboxMessage('old', CURSOR - 60 * MINUTE)])),
      );

      expect(logged).toEqual([
        {
          type: 'fetch',
          source: 'gmail',
          startedAt: S,
          durationMs: FAKE_STATS.durationMs,
          numTurns: FAKE_STATS.numTurns,
          usage: FAKE_STATS.usage,
          slice: 'slice-1',
          outcome: 'success',
          fetchedCount: 2,
          savedCount: 1,
        },
      ]);
    });

    it('FC-16 失敗した呼び出しも記録する', async () => {
      const issues = [{ code: 'invalid_type', path: ['messages', 0, 'id'] }];
      await run(new FakeSource('gmail', FakeSource.failed({ kind: 'tool-result-invalid', issues })));

      expect(logged).toEqual([
        {
          type: 'fetch',
          source: 'gmail',
          startedAt: S,
          durationMs: FAKE_STATS.durationMs,
          numTurns: FAKE_STATS.numTurns,
          usage: FAKE_STATS.usage,
          slice: 'slice-1',
          outcome: 'failure',
          failureKind: 'tool-result-invalid',
          issues,
        },
      ]);
    });

    it('records a store failure with the source stats', async () => {
      const failing = Object.assign(Object.create(store), {
        saveBatch: () => {
          throw new Error('disk full');
        },
      });
      await runFetchCycle({
        source: new FakeSource('gmail', FakeSource.ok([])),
        store: failing,
        log: { append: (e) => logged.push(e) },
        now: () => S,
        onEvent: () => {},
      });

      expect(logged).toEqual([expect.objectContaining({ outcome: 'failure', failureKind: 'store-failed', durationMs: FAKE_STATS.durationMs })]);
    });

    it('records a thrown source with measured duration and no usage', async () => {
      let t = S;
      await runFetchCycle({
        source: new FakeSource('gmail', async () => {
          t += 2_000;
          throw new Error('boom');
        }),
        store,
        log: { append: (e) => logged.push(e) },
        now: () => t,
        onEvent: () => {},
      });

      expect(logged).toEqual([
        {
          type: 'fetch',
          source: 'gmail',
          startedAt: S,
          durationMs: 2_000,
          numTurns: null,
          usage: null,
          slice: 'slice-1',
          outcome: 'failure',
          failureKind: 'source-threw',
        },
      ]);
    });
  });
});
