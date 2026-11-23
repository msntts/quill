import type { TokenUsage } from '../claude/stream-json';
import type { InboxMessage } from '../inbox/inbox-store';

export type FetchFailureKind =
  | 'cli-spawn-error'
  | 'cli-timeout'
  | 'cli-exit'
  | 'cli-no-result'
  | 'cli-error'
  | 'stream-invalid'
  | 'tool-result-invalid'
  | 'procedure-incomplete';

/** Why a fetch failed. Holds only enumerated kinds and schema paths, never message content. */
export interface FetchFailure {
  kind: FetchFailureKind;
  /** For procedure-incomplete: which check failed. */
  reason?: string;
  issues?: { code: string; path: (string | number)[] }[];
}

export interface FetchStats {
  durationMs: number;
  numTurns: number | null;
  usage: TokenUsage | null;
}

export type SourceFetchResult =
  | { ok: true; messages: InboxMessage[]; stats: FetchStats }
  | { ok: false; failure: FetchFailure; stats: FetchStats };

/** One oldest-first piece of a fetch (Gmail: one UTC day). Times are UNIX ms. */
export interface FetchSlice {
  /** Short id for logs, e.g. `2026-11-20`. Never message content. */
  label: string;
  startsAt: number;
  endsAt: number;
}

/** A place messages come from (Gmail now, Slack later). */
export interface MessageSource {
  readonly name: string;
  /** Splits [windowStart, now] into oldest-first slices; each slice is one Claude CLI call. */
  planSlices(windowStart: number, now: number): FetchSlice[];
  /** Fetches the messages of one slice. */
  fetchSlice(slice: FetchSlice): Promise<SourceFetchResult>;
}
