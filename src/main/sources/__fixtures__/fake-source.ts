import type { InboxMessage } from '../../inbox/inbox-store';
import type { FetchFailure, FetchSlice, FetchStats, MessageSource, SourceFetchResult } from '../message-source';

export const FAKE_STATS: FetchStats = {
  durationMs: 1_500,
  numTurns: 4,
  usage: { inputTokens: 10, outputTokens: 100, cacheCreationInputTokens: 2_000, cacheReadInputTokens: 30_000 },
};

export const SLICE_MS = 60 * 60 * 1000;

/**
 * A source returning canned results, one per slice fetch (the last one repeats).
 * It plans `sliceCount` slices; slice i ends at windowStart + (i + 1) hours.
 */
export class FakeSource implements MessageSource {
  readonly windowStarts: number[] = [];
  readonly fetchedSlices: string[] = [];
  /** Slices of the latest plan. */
  slices: FetchSlice[] = [];
  sliceCount = 1;
  private readonly results: (SourceFetchResult | (() => Promise<SourceFetchResult>))[];

  constructor(
    readonly name: string,
    ...results: (SourceFetchResult | (() => Promise<SourceFetchResult>))[]
  ) {
    this.results = results;
  }

  withSlices(count: number): this {
    this.sliceCount = count;
    return this;
  }

  static ok(messages: InboxMessage[]): SourceFetchResult {
    return { ok: true, messages, stats: FAKE_STATS };
  }

  static failed(failure: FetchFailure): SourceFetchResult {
    return { ok: false, failure, stats: FAKE_STATS };
  }

  planSlices(windowStart: number, _now: number): FetchSlice[] {
    this.windowStarts.push(windowStart);
    this.slices = Array.from({ length: this.sliceCount }, (_, i) => ({
      label: `slice-${i + 1}`,
      startsAt: windowStart + i * SLICE_MS,
      endsAt: windowStart + (i + 1) * SLICE_MS,
    }));
    return this.slices;
  }

  async fetchSlice(slice: FetchSlice): Promise<SourceFetchResult> {
    this.fetchedSlices.push(slice.label);
    const next = this.results.length > 1 ? this.results.shift()! : this.results[0]!;
    return typeof next === 'function' ? next() : next;
  }
}

export function inboxMessage(externalId: string, receivedAt: number, overrides: Partial<InboxMessage> = {}): InboxMessage {
  return {
    externalId,
    threadId: 't-1',
    sender: `${externalId}@example.com`,
    subject: `Subject ${externalId}`,
    receivedAt,
    body: `Body ${externalId}`,
    ...overrides,
  };
}
