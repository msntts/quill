import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import type { CallLog, CallLogEntry } from './call-log';

/**
 * Rebuilds the entry from known fields only, so nothing else (such as message
 * content smuggled in through a widened object) can reach the log file.
 */
function toRecord(entry: CallLogEntry): Record<string, unknown> {
  if (entry.type === 'skipped') return { type: 'skipped', at: entry.at };
  const record: Record<string, unknown> = {
    type: 'fetch',
    source: entry.source,
    startedAt: entry.startedAt,
    durationMs: entry.durationMs,
    numTurns: entry.numTurns,
    usage: entry.usage && {
      inputTokens: entry.usage.inputTokens,
      outputTokens: entry.usage.outputTokens,
      cacheCreationInputTokens: entry.usage.cacheCreationInputTokens,
      cacheReadInputTokens: entry.usage.cacheReadInputTokens,
    },
    slice: entry.slice,
    outcome: entry.outcome,
  };
  if (entry.fetchedCount !== undefined) record['fetchedCount'] = entry.fetchedCount;
  if (entry.savedCount !== undefined) record['savedCount'] = entry.savedCount;
  if (entry.failureKind !== undefined) record['failureKind'] = entry.failureKind;
  if (entry.reason !== undefined) record['reason'] = entry.reason;
  if (entry.issues !== undefined) record['issues'] = entry.issues.map((i) => ({ code: i.code, path: [...i.path] }));
  return record;
}

/** Appends call records as JSON Lines under userData. */
export class JsonlCallLog implements CallLog {
  constructor(private readonly file: string) {
    mkdirSync(path.dirname(file), { recursive: true });
  }

  append(entry: CallLogEntry): void {
    appendFileSync(this.file, `${JSON.stringify(toRecord(entry))}\n`, 'utf8');
  }
}
