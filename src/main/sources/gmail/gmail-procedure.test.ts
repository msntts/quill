import { describe, expect, it } from 'vitest';
import { parseStreamJson } from '../../claude/stream-json';
import { gmailStream, message, type FakeHook, type StreamStep } from './__fixtures__/gmail-stream';
import { verifyGmailProcedure } from './gmail-procedure';

const QUERY = 'in:inbox after:2026/11/21 before:2026/11/22';

function verify(steps: StreamStep[]) {
  return verifyGmailProcedure(parseStreamJson(gmailStream(steps)), QUERY);
}

const read = (threadId: string, messageFormat = 'PLAIN_TEXT', hook?: FakeHook): StreamStep => ({
  getThread: { threadId, messageFormat, messages: [message(`${threadId}-m`, { threadId })], ...(hook ? { hook } : {}) },
});

describe('verifyGmailProcedure', () => {
  it('passes when every thread of the prescribed search was read with bodies', () => {
    expect(verify([{ search: { query: QUERY, threads: ['t-1', 't-2'] } }, read('t-1'), read('t-2')])).toEqual({ ok: true });
  });

  it('GS-11 指定した検索が行われていない', () => {
    expect(verify([{ search: { query: 'in:inbox newer_than:2d', threads: ['t-1'] } }, read('t-1')])).toEqual({
      ok: false,
      failure: { kind: 'procedure-incomplete', reason: 'search-missing' },
    });
  });

  it('GS-12 読み取っていないスレッドがある', () => {
    expect(verify([{ search: { query: QUERY, threads: ['t-1', 't-2'] } }, read('t-1')])).toEqual({
      ok: false,
      failure: { kind: 'procedure-incomplete', reason: 'thread-unread' },
    });
  });

  it('GS-13 本文なしで読み取ったスレッドがある', () => {
    expect(verify([{ search: { query: QUERY, threads: ['t-1'] } }, read('t-1', 'METADATA_ONLY', { messageFormat: 'METADATA_ONLY' })])).toEqual({
      ok: false,
      failure: { kind: 'procedure-incomplete', reason: 'thread-read-without-body' },
    });
  });

  it('GS-28 judges the read format after the hook rewrote it', () => {
    expect(verify([{ search: { query: QUERY, threads: ['t-1'] } }, read('t-1', 'METADATA_ONLY')])).toEqual({ ok: true });
  });

  it('GS-30 書き換えの記録がない (検索)', () => {
    expect(verify([{ search: { query: QUERY, threads: ['t-1'], hook: 'missing' } }, read('t-1')])).toEqual({
      ok: false,
      failure: { kind: 'procedure-incomplete', reason: 'hook-missing' },
    });
  });

  it('GS-30 書き換えの記録がない (スレッドの読み取り)', () => {
    expect(verify([{ search: { query: QUERY, threads: ['t-1'] } }, read('t-1', 'PLAIN_TEXT', 'missing')])).toEqual({
      ok: false,
      failure: { kind: 'procedure-incomplete', reason: 'hook-missing' },
    });
  });

  it('GS-30 a failed hook counts as no record', () => {
    const lines = gmailStream([{ search: { query: QUERY, threads: [] } }]).map((l) => l.replace('"outcome":"success"', '"outcome":"error"'));

    expect(verifyGmailProcedure(parseStreamJson(lines), QUERY)).toEqual({
      ok: false,
      failure: { kind: 'procedure-incomplete', reason: 'hook-missing' },
    });
  });

  it('GS-31 50件以外の件数で検索された', () => {
    expect(verify([{ search: { query: QUERY, threads: ['t-1'], hook: { pageSize: 20 } } }, read('t-1')])).toEqual({
      ok: false,
      failure: { kind: 'procedure-incomplete', reason: 'page-size-mismatch' },
    });
  });

  it('GS-27 judges the page size after the hook rewrote it', () => {
    expect(verify([{ search: { query: QUERY, threads: ['t-1'], pageSize: 5 } }, read('t-1')])).toEqual({ ok: true });
  });

  const fifty = Array.from({ length: 50 }, (_, i) => `t-${i}`);
  const truncated = { ok: false, failure: { kind: 'procedure-incomplete', reason: 'result-truncated' } };

  it('GS-23 推定件数が返ってきた数より多い', () => {
    expect(verify([{ search: { query: QUERY, threads: fifty, estimate: '715' } }, ...fifty.map((t) => read(t))])).toEqual(truncated);
  });

  it('GS-24 推定件数がなく50件ちょうど返ってきた', () => {
    expect(verify([{ search: { query: QUERY, threads: fifty, estimate: null } }, ...fifty.map((t) => read(t))])).toEqual(truncated);
  });

  it('GS-25 50件ちょうどで推定件数も50件', () => {
    expect(verify([{ search: { query: QUERY, threads: fifty, estimate: '50' } }, ...fifty.map((t) => read(t))])).toEqual({ ok: true });
  });

  it('GS-26 50件より少なく推定件数がそれより多い', () => {
    const twelve = fifty.slice(0, 12);

    expect(verify([{ search: { query: QUERY, threads: twelve, estimate: '14' } }, ...twelve.map((t) => read(t))])).toEqual({ ok: true });
  });

  it('GS-15 指定外の検索が追加で行われた', () => {
    expect(
      verify([
        { search: { query: QUERY, threads: ['t-1'] } },
        { search: { query: 'in:inbox newer_than:3d', threads: ['t-1', 't-old'], estimate: '900' } },
        read('t-1'),
        read('t-old', 'METADATA_ONLY'),
      ]),
    ).toEqual({ ok: true });
  });

  it('GS-16 検索結果が0件', () => {
    expect(verify([{ search: { query: QUERY, threads: [] } }])).toEqual({ ok: true });
  });

  it('fails when the prescribed search result is not valid', () => {
    expect(verify([{ search: { query: QUERY, threads: [], raw: 'oops' } }])).toMatchObject({
      ok: false,
      failure: { kind: 'tool-result-invalid' },
    });
  });
});
