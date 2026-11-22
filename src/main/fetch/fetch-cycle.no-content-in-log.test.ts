import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FakeClaudeRunner } from '../claude/__fixtures__/fake-claude-runner';
import { SqliteInboxStore } from '../inbox/sqlite-inbox-store';
import { JsonlCallLog } from '../log/jsonl-call-log';
import { gmailStream, message } from '../sources/gmail/__fixtures__/gmail-stream';
import { buildGmailQuery } from '../sources/gmail/gmail-query';
import { GmailSource } from '../sources/gmail/gmail-source';
import { runFetchCycle } from './fetch-cycle';
import { computeWindowStart } from './fetch-window';

const NOW = Date.parse('2026-11-22T12:00:00Z');
const MARKERS = ['MARKER-BODY-7f3a', 'MARKER-SUBJECT-91c2', 'marker-sender-55d0@example.com'];

describe('logs never contain message content', () => {
  let dir: string;
  let logFile: string;
  let store: SqliteInboxStore;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'quill-nolog-'));
    logFile = path.join(dir, 'logs', 'calls.jsonl');
    store = SqliteInboxStore.open(':memory:');
  });

  afterEach(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  async function cycleWith(lines: string[]) {
    const gmail = new GmailSource(FakeClaudeRunner.exited(lines), { cwd: dir, timeZone: 'UTC', timeoutMs: 60_000 });
    return runFetchCycle({ source: gmail, store, log: new JsonlCallLog(logFile), now: () => NOW, onEvent: () => {} });
  }

  const query = buildGmailQuery(computeWindowStart(null, NOW), 'UTC');
  const marked = message('m-1', {
    internalDate: String(NOW - 60_000),
    plaintextBody: MARKERS[0],
    subject: MARKERS[1],
    sender: MARKERS[2],
  });

  it('FC-17 記録に本文が含まれない', async () => {
    const result = await cycleWith(
      gmailStream(
        [{ search: { query, threads: ['t-1'] } }, { getThread: { threadId: 't-1', messageFormat: 'PLAIN_TEXT', messages: [marked] } }],
        `Read ${MARKERS.join(' ')}`,
      ),
    );

    expect(result).toEqual({ ok: true, newCount: 1 });
    const content = readFileSync(logFile, 'utf8');
    for (const marker of MARKERS) expect(content).not.toContain(marker);
  });

  it('FC-18 エラーの記録に本文が含まれない', async () => {
    const { id: _id, ...withoutId } = marked;
    const result = await cycleWith(
      gmailStream([
        { search: { query, threads: ['t-1'] } },
        { getThread: { threadId: 't-1', messageFormat: 'PLAIN_TEXT', messages: [withoutId as typeof marked] } },
      ]),
    );

    expect(result).toEqual({ ok: false });
    const content = readFileSync(logFile, 'utf8');
    expect(content).toContain('tool-result-invalid');
    for (const marker of MARKERS) expect(content).not.toContain(marker);
  });
});
