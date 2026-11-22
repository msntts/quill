import { describe, expect, it } from 'vitest';
import { resultLine } from '../../claude/__fixtures__/stream';
import { FakeClaudeRunner } from '../../claude/__fixtures__/fake-claude-runner';
import { gmailStream, message } from './__fixtures__/gmail-stream';
import { buildGmailQuery } from './gmail-query';
import { GmailSource } from './gmail-source';

const TZ = 'UTC';
const WINDOW_START = Date.parse('2026-11-22T00:00:00Z');
const QUERY = buildGmailQuery(WINDOW_START, TZ);

function source(lines: string[]) {
  const runner = FakeClaudeRunner.exited(lines);
  return { runner, gmail: new GmailSource(runner, { cwd: 'work', timeZone: TZ, timeoutMs: 60_000 }) };
}

describe('GmailSource', () => {
  it('GS-09 モデルの出力とツールの返り値が違う', async () => {
    const m = message('m-1', { threadId: 't-1', sender: 'alice@example.com', plaintextBody: 'Original body 😀' });
    const lines = gmailStream(
      [{ search: { query: QUERY, threads: ['t-1'] } }, { getThread: { threadId: 't-1', messageFormat: 'PLAIN_TEXT', messages: [m] } }],
      JSON.stringify([{ id: 'm-1', from: 'Alice <alice@example.com>', body: 'Original body' }]),
    );

    const result = await source(lines).gmail.fetch(WINDOW_START);

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.messages).toEqual([
      {
        externalId: 'm-1',
        threadId: 't-1',
        sender: 'alice@example.com',
        subject: 'Subject of m-1',
        receivedAt: 1_700_000_000_000,
        body: 'Original body 😀',
      },
    ]);
  });

  it('GS-10 受信時刻はツールの返り値から決める', async () => {
    const lines = gmailStream([
      { search: { query: QUERY, threads: ['t-1'] } },
      { getThread: { threadId: 't-1', messageFormat: 'PLAIN_TEXT', messages: [message('m-1', { internalDate: '1795255773123' })] } },
    ]);

    const result = await source(lines).gmail.fetch(WINDOW_START);

    expect(result.ok && result.messages[0]?.receivedAt).toBe(1_795_255_773_123);
  });

  it('takes values from the body-bearing read when a thread is also read as metadata', async () => {
    const full = message('m-1');
    const { plaintextBody: _b, subject: _s, ...metadataOnly } = full;
    const lines = gmailStream([
      { search: { query: QUERY, threads: ['t-1'] } },
      { getThread: { threadId: 't-1', messageFormat: 'PLAIN_TEXT', messages: [full] } },
      { getThread: { threadId: 't-1', messageFormat: 'METADATA_ONLY', messages: [metadataOnly] } },
    ]);

    const result = await source(lines).gmail.fetch(WINDOW_START);

    expect(result.ok && result.messages).toEqual([expect.objectContaining({ externalId: 'm-1', body: 'Body of m-1', subject: 'Subject of m-1' })]);
  });

  it('stores missing sender, subject and body as empty strings', async () => {
    const lines = gmailStream([
      { search: { query: QUERY, threads: ['t-1'] } },
      { getThread: { threadId: 't-1', messages: [{ id: 'm-1', internalDate: '1700000000000', labelIds: ['INBOX'] }] } },
    ]);

    const result = await source(lines).gmail.fetch(WINDOW_START);

    expect(result.ok && result.messages[0]).toMatchObject({ sender: '', subject: '', body: '' });
  });

  it('runs claude with the Gmail args, the prompt on stdin, and the given cwd and timeout', async () => {
    const { runner, gmail } = source(gmailStream([{ search: { query: QUERY, threads: [] } }]));

    await gmail.fetch(WINDOW_START);

    expect(runner.requests).toHaveLength(1);
    const request = runner.requests[0]!;
    expect(request.args).toContain('--no-session-persistence');
    expect(request.stdin).toContain(QUERY);
    expect(request.cwd).toBe('work');
    expect(request.timeoutMs).toBe(60_000);
  });

  it('reports run stats from the result line', async () => {
    const result = await source(gmailStream([{ search: { query: QUERY, threads: [] } }])).gmail.fetch(WINDOW_START);

    expect(result.stats).toEqual({
      durationMs: 1_000,
      numTurns: 5,
      usage: { inputTokens: 10, outputTokens: 200, cacheCreationInputTokens: 3_000, cacheReadInputTokens: 40_000 },
    });
  });

  describe('Claude CLI failures', () => {
    async function fetchWith(runner: FakeClaudeRunner) {
      return new GmailSource(runner, { cwd: 'work', timeZone: TZ, timeoutMs: 60_000 }).fetch(WINDOW_START);
    }

    it('fails with cli-exit on a non-zero exit code', async () => {
      const result = await fetchWith(FakeClaudeRunner.exited(gmailStream([{ search: { query: QUERY, threads: [] } }]), 1));
      expect(result).toMatchObject({ ok: false, failure: { kind: 'cli-exit' } });
    });

    it('fails with cli-timeout when the run timed out', async () => {
      const result = await fetchWith(new FakeClaudeRunner({ kind: 'timeout', stdoutLines: [], durationMs: 300_000 }));
      expect(result).toMatchObject({ ok: false, failure: { kind: 'cli-timeout' }, stats: { durationMs: 300_000 } });
    });

    it('fails with cli-spawn-error when claude could not start', async () => {
      const result = await fetchWith(new FakeClaudeRunner({ kind: 'spawn-error', durationMs: 5 }));
      expect(result).toMatchObject({ ok: false, failure: { kind: 'cli-spawn-error' } });
    });

    it('fails with cli-no-result when no result line arrived', async () => {
      const lines = gmailStream([{ search: { query: QUERY, threads: [] } }]).filter((l) => !l.includes('"type":"result"'));
      const result = await fetchWith(FakeClaudeRunner.exited(lines));
      expect(result).toMatchObject({ ok: false, failure: { kind: 'cli-no-result' } });
    });

    it('fails with cli-error when the result reports an error', async () => {
      const lines = [...gmailStream([{ search: { query: QUERY, threads: [] } }]).slice(0, -1), resultLine({ is_error: true })];
      const result = await fetchWith(FakeClaudeRunner.exited(lines));
      expect(result).toMatchObject({ ok: false, failure: { kind: 'cli-error' } });
    });

    it('fails with stream-invalid when a line is not JSON', async () => {
      const result = await fetchWith(FakeClaudeRunner.exited(['{broken']));
      expect(result).toMatchObject({ ok: false, failure: { kind: 'stream-invalid' } });
    });
  });

  describe('label filtering', () => {
    async function fetchIds(...messages: ReturnType<typeof message>[]) {
      const lines = gmailStream([
        { search: { query: QUERY, threads: ['t-1'] } },
        { getThread: { threadId: 't-1', messageFormat: 'PLAIN_TEXT', messages } },
      ]);
      const result = await source(lines).gmail.fetch(WINDOW_START);
      return result.ok ? result.messages.map((m) => m.externalId) : result;
    }

    it('GS-01 メインタブのメッセージ', async () => {
      expect(await fetchIds(message('primary', { labelIds: ['INBOX', 'CATEGORY_PERSONAL', 'UNREAD'] }), message('no-tabs', { labelIds: ['INBOX'] }))).toEqual([
        'primary',
        'no-tabs',
      ]);
    });

    it('GS-02 メインタブ以外のタブのメッセージ', async () => {
      expect(
        await fetchIds(
          message('promo', { labelIds: ['INBOX', 'CATEGORY_PROMOTIONS'] }),
          message('social', { labelIds: ['INBOX', 'CATEGORY_SOCIAL'] }),
          message('updates', { labelIds: ['INBOX', 'CATEGORY_UPDATES'] }),
          message('forums', { labelIds: ['INBOX', 'CATEGORY_FORUMS'] }),
          message('keep', { labelIds: ['INBOX', 'CATEGORY_PERSONAL'] }),
        ),
      ).toEqual(['keep']);
    });

    it('GS-03 受信トレイにないメッセージ', async () => {
      expect(await fetchIds(message('archived', { labelIds: ['CATEGORY_PERSONAL'] }), message('keep'))).toEqual(['keep']);
    });

    it('GS-04 スレッドに自分の返信が含まれる', async () => {
      expect(
        await fetchIds(message('received'), message('my-reply', { labelIds: ['SENT', 'INBOX', 'CATEGORY_PERSONAL'] })),
      ).toEqual(['received']);
    });
  });

  it('fails the fetch when the procedure is incomplete', async () => {
    const lines = gmailStream([{ search: { query: QUERY, threads: ['t-1', 't-2'] } }, { getThread: { threadId: 't-1', messages: [message('m-1')] } }]);

    const result = await source(lines).gmail.fetch(WINDOW_START);

    expect(result).toMatchObject({ ok: false, failure: { kind: 'procedure-incomplete', reason: 'thread-unread' } });
  });

  it('GS-18 返り値が JSON として読めない (via GmailSource)', async () => {
    const lines = gmailStream([{ search: { query: QUERY, threads: ['t-1'] } }, { getThread: { threadId: 't-1', messages: [], raw: '<html>' } }]);

    const result = await source(lines).gmail.fetch(WINDOW_START);

    expect(result).toMatchObject({ ok: false, failure: { kind: 'tool-result-invalid' } });
  });
});
