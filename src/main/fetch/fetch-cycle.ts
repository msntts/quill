import type { InboxStore } from '../inbox/inbox-store';
import type { CallLog, CycleFailureKind, FetchLogEntry } from '../log/call-log';
import type { FetchFailure, FetchStats, MessageSource, SourceFetchResult } from '../sources/message-source';
import type { FetchEvent } from '../status/quill-status';
import { computeWindowStart, filterByWindow } from './fetch-window';

export interface FetchCycleDeps {
  source: MessageSource;
  store: InboxStore;
  log: CallLog;
  now: () => number;
  onEvent: (event: FetchEvent) => void;
}

export type CycleResult = { ok: true; newCount: number } | { ok: false };

/** Runs one fetch of one source: window → fetch → filter → save with cursor → log. */
export async function runFetchCycle(deps: FetchCycleDeps): Promise<CycleResult> {
  const { source, store, log, now, onEvent } = deps;
  const startedAt = now();
  onEvent({ type: 'fetch-started' });

  const base = (stats: FetchStats) => ({
    type: 'fetch' as const,
    source: source.name,
    startedAt,
    durationMs: stats.durationMs,
    numTurns: stats.numTurns,
    usage: stats.usage,
  });
  const fail = (stats: FetchStats, failure: FetchFailure | { kind: CycleFailureKind }): CycleResult => {
    const entry: FetchLogEntry = { ...base(stats), outcome: 'failure', failureKind: failure.kind };
    if ('reason' in failure && failure.reason !== undefined) entry.reason = failure.reason;
    if ('issues' in failure && failure.issues !== undefined) entry.issues = failure.issues;
    log.append(entry);
    onEvent({ type: 'fetch-failed' });
    return { ok: false };
  };

  const windowStart = computeWindowStart(store.getCursor(source.name), startedAt);
  let result: SourceFetchResult;
  try {
    result = await source.fetch(windowStart);
  } catch {
    return fail({ durationMs: now() - startedAt, numTurns: null, usage: null }, { kind: 'source-threw' });
  }
  if (!result.ok) return fail(result.stats, result.failure);

  const inWindow = filterByWindow(result.messages, windowStart);
  let newCount: number;
  try {
    newCount = store.saveBatch(source.name, inWindow, { cursorAt: startedAt, fetchedAt: now() });
  } catch {
    return fail(result.stats, { kind: 'store-failed' });
  }

  log.append({ ...base(result.stats), outcome: 'success', fetchedCount: result.messages.length, savedCount: newCount });
  onEvent({ type: 'fetch-succeeded', newCount });
  return { ok: true, newCount };
}
