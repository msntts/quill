import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FakeClaudeRunner } from '../claude/__fixtures__/fake-claude-runner';
import { computeWindowStart } from '../fetch/fetch-window';
import { SqliteInboxStore } from '../inbox/sqlite-inbox-store';
import { gmailStream, message } from '../sources/gmail/__fixtures__/gmail-stream';
import { buildGmailQuery } from '../sources/gmail/gmail-query';
import { planGmailSlices } from '../sources/gmail/gmail-slices';
import type { QuillState } from '../status/quill-status';
import { createFetchApp, DEFAULT_CLAUDE_TIMEOUT_MS } from './create-fetch-app';

const NOW = Date.parse('2026-11-22T12:00:00Z');

describe('createFetchApp', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'quill-app-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function startWith(runner: FakeClaudeRunner) {
    const states: QuillState[] = [];
    let settled: () => void = () => {};
    const done = new Promise<void>((resolve) => (settled = resolve));
    const app = createFetchApp({
      userDataDir: dir,
      runner,
      now: () => NOW,
      forward: (state) => {
        states.push(state);
        if (state !== 'fetching') settled();
      },
    });
    return { app, states, done };
  }

  it('runs a first Gmail fetch at start and stores messages, cursor and a log line per day under userData', async () => {
    // The first window (24 hours back from 12:00 UTC) spans two UTC days.
    const [yesterday, today] = planGmailSlices(computeWindowStart(null, NOW), NOW).map((s) => buildGmailQuery(s));
    const streams = new Map([
      [yesterday!, gmailStream([{ search: { query: yesterday!, threads: [] } }])],
      [
        today!,
        gmailStream([
          { search: { query: today!, threads: ['t-1'] } },
          { getThread: { threadId: 't-1', messageFormat: 'PLAIN_TEXT', messages: [message('m-1', { internalDate: String(NOW - 60_000) })] } },
        ]),
      ],
    ]);
    const runner = new FakeClaudeRunner(async (request) => ({
      kind: 'exited',
      exitCode: 0,
      stdoutLines: [...streams].find(([query]) => request.stdin.includes(query))?.[1] ?? [],
      durationMs: 1_000,
    }));

    const { app, states, done } = startWith(runner);
    await done;
    app.stop();

    expect(states).toEqual(['fetching', 'idle']);
    expect(runner.requests[0]?.cwd).toBe(path.join(dir, 'claude-work'));
    expect(runner.requests[0]?.timeoutMs).toBe(DEFAULT_CLAUDE_TIMEOUT_MS);
    expect(DEFAULT_CLAUDE_TIMEOUT_MS).toBe(5 * 60_000);

    const store = SqliteInboxStore.open(path.join(dir, 'quill.db'));
    expect(store.listMessages('gmail').map((m) => m.externalId)).toEqual(['m-1']);
    expect(store.getCursor('gmail')).toBe(NOW);
    store.close();
    expect(runner.requests).toHaveLength(2);
    expect(readFileSync(path.join(dir, 'logs', 'calls.jsonl'), 'utf8').trim().split('\n')).toHaveLength(2);
  });

  it('GS-29 writes the hook settings that claude loads from its working folder', async () => {
    const { app, done } = startWith(FakeClaudeRunner.exited([], 1));
    await done;
    app.stop();

    const settings = JSON.parse(readFileSync(path.join(dir, 'claude-work', 'gmail-settings.json'), 'utf8'));
    const command: string = settings.hooks.PreToolUse[0].hooks[0].command;
    const script = path.join(__dirname, '..', 'sources', 'gmail', 'gmail-hook-main.js').replaceAll('\\', '/');
    expect(command).toBe(`node "${script}"`);
  });

  it('forwards error when the fetch fails', async () => {
    const { app, states, done } = startWith(FakeClaudeRunner.exited([], 1));
    await done;
    app.stop();

    expect(states).toEqual(['fetching', 'error']);
    expect(existsSync(path.join(dir, 'quill.db'))).toBe(true);
  });
});
