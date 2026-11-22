import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { ClaudeRunner } from '../claude/claude-runner';
import { runFetchCycle } from '../fetch/fetch-cycle';
import { DEFAULT_INTERVAL_MS, startScheduler } from '../fetch/scheduler';
import { SqliteInboxStore } from '../inbox/sqlite-inbox-store';
import { JsonlCallLog } from '../log/jsonl-call-log';
import { GmailSource } from '../sources/gmail/gmail-source';
import { nextQuillState, type QuillState } from '../status/quill-status';

export const DEFAULT_CLAUDE_TIMEOUT_MS = 5 * 60_000;

export interface FetchAppOptions {
  /** app.getPath('userData'); the DB, logs and claude's working folder live here. */
  userDataDir: string;
  runner: ClaudeRunner;
  forward: (state: QuillState) => void;
  now?: () => number;
  timeZone?: string;
  intervalMs?: number;
}

export interface FetchApp {
  stop(): void;
}

/** Wires the Gmail fetch pipeline together and starts its schedule. */
export function createFetchApp(options: FetchAppOptions): FetchApp {
  const now = options.now ?? Date.now;
  const claudeWorkDir = path.join(options.userDataDir, 'claude-work');
  mkdirSync(claudeWorkDir, { recursive: true });

  const store = SqliteInboxStore.open(path.join(options.userDataDir, 'quill.db'));
  const log = new JsonlCallLog(path.join(options.userDataDir, 'logs', 'calls.jsonl'));
  const source = new GmailSource(options.runner, {
    cwd: claudeWorkDir,
    timeZone: options.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    timeoutMs: DEFAULT_CLAUDE_TIMEOUT_MS,
  });

  let state: QuillState = 'idle';
  const scheduler = startScheduler({
    runCycle: () =>
      runFetchCycle({
        source,
        store,
        log,
        now,
        onEvent: (event) => {
          state = nextQuillState(state, event);
          options.forward(state);
        },
      }),
    intervalMs: options.intervalMs ?? DEFAULT_INTERVAL_MS,
    log,
    now,
  });

  return {
    stop() {
      scheduler.stop();
      store.close();
    },
  };
}
