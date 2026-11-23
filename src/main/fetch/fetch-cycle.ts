import type { InboxStore } from '../inbox/inbox-store';
import type { CallLog, CycleFailureKind, FetchLogEntry } from '../log/call-log';
import type { FetchFailure, FetchSlice, FetchStats, MessageSource, SourceFetchResult } from '../sources/message-source';
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

type SliceResult = { ok: true; newCount: number } | { ok: false };

/**
 * Runs one fetch of one source: window → slices, oldest first. Each slice is
 * fetched, filtered, saved with its cursor and logged; the first failure stops the run.
 */
export async function runFetchCycle(deps: FetchCycleDeps): Promise<CycleResult> {
  const { source, store, now, onEvent } = deps;
  const startedAt = now();
  onEvent({ type: 'fetch-started' });

  const windowStart = computeWindowStart(store.getCursor(source.name), startedAt);
  const slices = source.planSlices(windowStart, startedAt);
  let newCount = 0;
  for (const [i, slice] of slices.entries()) {
    // A finished earlier slice is complete up to its end; the last one only up to the start of this run.
    const cursorAt = i === slices.length - 1 ? startedAt : slice.endsAt;
    const result = await runSlice(deps, slice, windowStart, cursorAt);
    if (!result.ok) {
      onEvent({ type: 'fetch-failed' });
      return { ok: false };
    }
    newCount += result.newCount;
  }

  onEvent({ type: 'fetch-succeeded', newCount });
  return { ok: true, newCount };
}

async function runSlice(deps: FetchCycleDeps, slice: FetchSlice, windowStart: number, cursorAt: number): Promise<SliceResult> {
  const { source, store, log, now } = deps;
  const startedAt = now();

  const base = (stats: FetchStats) => ({
    type: 'fetch' as const,
    source: source.name,
    startedAt,
    durationMs: stats.durationMs,
    numTurns: stats.numTurns,
    usage: stats.usage,
    slice: slice.label,
  });
  const fail = (stats: FetchStats, failure: FetchFailure | { kind: CycleFailureKind }): SliceResult => {
    const entry: FetchLogEntry = { ...base(stats), outcome: 'failure', failureKind: failure.kind };
    if ('reason' in failure && failure.reason !== undefined) entry.reason = failure.reason;
    if ('issues' in failure && failure.issues !== undefined) entry.issues = failure.issues;
    log.append(entry);
    return { ok: false };
  };

  let result: SourceFetchResult;
  try {
    result = await source.fetchSlice(slice);
  } catch {
    return fail({ durationMs: now() - startedAt, numTurns: null, usage: null }, { kind: 'source-threw' });
  }
  if (!result.ok) return fail(result.stats, result.failure);

  const inWindow = filterByWindow(result.messages, windowStart);
  let newCount: number;
  try {
    newCount = store.saveBatch(source.name, inWindow, { cursorAt, fetchedAt: now() });
  } catch {
    return fail(result.stats, { kind: 'store-failed' });
  }

  log.append({ ...base(result.stats), outcome: 'success', fetchedCount: result.messages.length, savedCount: newCount });
  return { ok: true, newCount };
}
