import { describe, expect, it } from 'vitest';
import { parseStreamJson } from '../../claude/stream-json';
import { gmailStream, message, type StreamStep } from './__fixtures__/gmail-stream';
import { verifyGmailProcedure } from './gmail-procedure';

const QUERY = 'in:inbox category:primary after:2026/11/21';

function verify(steps: StreamStep[]) {
  return verifyGmailProcedure(parseStreamJson(gmailStream(steps)), QUERY);
}

const read = (threadId: string, messageFormat = 'PLAIN_TEXT'): StreamStep => ({
  getThread: { threadId, messageFormat, messages: [message(`${threadId}-m`, { threadId })] },
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
    expect(verify([{ search: { query: QUERY, threads: ['t-1'] } }, read('t-1', 'METADATA_ONLY')])).toEqual({
      ok: false,
      failure: { kind: 'procedure-incomplete', reason: 'thread-read-without-body' },
    });
  });

  it('GS-14 続きのページを読んでいない', () => {
    expect(verify([{ search: { query: QUERY, threads: ['t-1'], nextPageToken: 'p2' } }, read('t-1')])).toEqual({
      ok: false,
      failure: { kind: 'procedure-incomplete', reason: 'next-page-missing' },
    });
  });

  it('GS-14 続きのページを読んでいる場合は通る', () => {
    expect(
      verify([
        { search: { query: QUERY, threads: ['t-1'], nextPageToken: 'p2' } },
        { search: { query: QUERY, threads: ['t-2'], pageToken: 'p2' } },
        read('t-1'),
        read('t-2'),
      ]),
    ).toEqual({ ok: true });
  });

  it('GS-14 50件ちょうどで次のページの印がないときは失敗にする', () => {
    const threads = Array.from({ length: 50 }, (_, i) => `t-${i}`);

    expect(verify([{ search: { query: QUERY, threads } }, ...threads.map((t) => read(t))])).toEqual({
      ok: false,
      failure: { kind: 'procedure-incomplete', reason: 'page-full-without-token' },
    });
  });

  it('GS-15 指定外の検索が追加で行われた', () => {
    expect(
      verify([
        { search: { query: QUERY, threads: ['t-1'] } },
        { search: { query: 'in:inbox newer_than:3d', threads: ['t-1', 't-old'] } },
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
