import type { InboxMessage } from '../../inbox/inbox-store';
import type { FetchFailure, FetchStats, MessageSource, SourceFetchResult } from '../message-source';

export const FAKE_STATS: FetchStats = {
  durationMs: 1_500,
  numTurns: 4,
  usage: { inputTokens: 10, outputTokens: 100, cacheCreationInputTokens: 2_000, cacheReadInputTokens: 30_000 },
};

/** A source returning canned results, one per fetch (the last one repeats). */
export class FakeSource implements MessageSource {
  readonly windowStarts: number[] = [];
  private readonly results: (SourceFetchResult | (() => Promise<SourceFetchResult>))[];

  constructor(
    readonly name: string,
    ...results: (SourceFetchResult | (() => Promise<SourceFetchResult>))[]
  ) {
    this.results = results;
  }

  static ok(messages: InboxMessage[]): SourceFetchResult {
    return { ok: true, messages, stats: FAKE_STATS };
  }

  static failed(failure: FetchFailure): SourceFetchResult {
    return { ok: false, failure, stats: FAKE_STATS };
  }

  async fetch(windowStart: number): Promise<SourceFetchResult> {
    this.windowStarts.push(windowStart);
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
