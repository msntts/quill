import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { CallLogEntry } from './call-log';
import { JsonlCallLog } from './jsonl-call-log';

describe('JsonlCallLog', () => {
  const dirs: string[] = [];
  afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

  function tempLogFile(): string {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'quill-log-'));
    dirs.push(dir);
    return path.join(dir, 'logs', 'calls.jsonl');
  }

  const success: CallLogEntry = {
    type: 'fetch',
    source: 'gmail',
    startedAt: 1,
    durationMs: 2,
    numTurns: 3,
    usage: { inputTokens: 4, outputTokens: 5, cacheCreationInputTokens: 6, cacheReadInputTokens: 7 },
    outcome: 'success',
    fetchedCount: 8,
    savedCount: 9,
  };

  it('appends one JSON line per entry, creating the folder', () => {
    const file = tempLogFile();
    const log = new JsonlCallLog(file);

    log.append(success);
    log.append({ type: 'skipped', at: 10 });

    const lines = readFileSync(file, 'utf8').trimEnd().split('\n');
    expect(lines.map((l) => JSON.parse(l))).toEqual([success, { type: 'skipped', at: 10 }]);
  });

  it('writes only the known fields of an entry', () => {
    const file = tempLogFile();
    const smuggled = { ...success, body: 'SECRET', subject: 'SECRET', usage: { ...success.usage!, extra: 'SECRET' } } as CallLogEntry;

    new JsonlCallLog(file).append(smuggled);

    expect(readFileSync(file, 'utf8')).not.toContain('SECRET');
  });
});
