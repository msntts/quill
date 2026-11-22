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

/** A place messages come from (Gmail now, Slack later). */
export interface MessageSource {
  readonly name: string;
  /** Fetches messages that may have arrived at or after windowStart (UNIX ms). */
  fetch(windowStart: number): Promise<SourceFetchResult>;
}
