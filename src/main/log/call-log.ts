import type { TokenUsage } from '../claude/stream-json';

export type CycleFailureKind =
  | 'cli-spawn-error'
  | 'cli-timeout'
  | 'cli-exit'
  | 'cli-no-result'
  | 'cli-error'
  | 'stream-invalid'
  | 'tool-result-invalid'
  | 'procedure-incomplete'
  | 'source-threw'
  | 'store-failed';

/** One slice of a fetch (one Claude CLI call). Only counts, ids, times and enumerated kinds. */
export interface FetchLogEntry {
  type: 'fetch';
  source: string;
  startedAt: number;
  durationMs: number;
  numTurns: number | null;
  usage: TokenUsage | null;
  /** The slice's label (Gmail: `YYYY-MM-DD`). */
  slice: string;
  outcome: 'success' | 'failure';
  fetchedCount?: number;
  savedCount?: number;
  failureKind?: CycleFailureKind;
  reason?: string;
  issues?: { code: string; path: (string | number)[] }[];
}

/** A scheduled run that was skipped because the previous one was still running. */
export interface SkipLogEntry {
  type: 'skipped';
  at: number;
}

export type CallLogEntry = FetchLogEntry | SkipLogEntry;

export interface CallLog {
  append(entry: CallLogEntry): void;
}
