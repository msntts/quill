import { describe, expect, it } from 'vitest';
import { getThreadResultSchema, parseToolJson, searchThreadsResultSchema } from './gmail-schemas';

const validMessage = {
  id: 'm-1',
  threadId: 't-1',
  internalDate: '1700000000000',
  labelIds: ['INBOX'],
  sender: 'alice@example.com',
  subject: 'Hello',
  plaintextBody: 'Body',
};

describe('gmail tool result schemas', () => {
  it('accepts a get_thread result with the required fields', () => {
    const result = parseToolJson(JSON.stringify({ id: 't-1', messages: [validMessage] }), getThreadResultSchema);

    expect(result.ok).toBe(true);
  });

  it('accepts messages without sender, subject or body', () => {
    const { sender: _s, subject: _j, plaintextBody: _b, ...bare } = validMessage;

    expect(parseToolJson(JSON.stringify({ id: 't-1', messages: [bare] }), getThreadResultSchema).ok).toBe(true);
  });

  it.each(['id', 'threadId', 'internalDate', 'labelIds'] as const)('GS-17 必須の項目が欠けている (%s)', (field) => {
    const { [field]: _dropped, ...broken } = validMessage;

    const result = parseToolJson(JSON.stringify({ id: 't-1', messages: [broken] }), getThreadResultSchema);

    expect(result).toMatchObject({ ok: false, error: { kind: 'schema' } });
    if (!result.ok) expect(result.error.issues.map((i) => i.path)).toContainEqual(['messages', 0, field]);
  });

  it('GS-17 必須の項目が欠けている (internalDate is not a number string)', () => {
    const result = parseToolJson(
      JSON.stringify({ id: 't-1', messages: [{ ...validMessage, internalDate: 'yesterday' }] }),
      getThreadResultSchema,
    );

    expect(result.ok).toBe(false);
  });

  it('GS-18 返り値が JSON として読めない', () => {
    expect(parseToolJson('not json', getThreadResultSchema)).toEqual({ ok: false, error: { kind: 'not-json', issues: [] } });
    expect(parseToolJson(null, getThreadResultSchema)).toEqual({ ok: false, error: { kind: 'not-json', issues: [] } });
  });

  it('treats an empty search result {} as zero threads', () => {
    const result = parseToolJson('{}', searchThreadsResultSchema);

    expect(result).toEqual({ ok: true, data: { threads: [] } });
  });

  it('reads thread ids and the count estimate from a search result', () => {
    const result = parseToolJson(
      JSON.stringify({ resultCountEstimate: '3', threads: [{ id: 't-1' }, { id: 't-2' }] }),
      searchThreadsResultSchema,
    );

    expect(result).toEqual({ ok: true, data: { threads: [{ id: 't-1' }, { id: 't-2' }], resultCountEstimate: '3' } });
  });

  it('rejects a non-numeric count estimate', () => {
    expect(parseToolJson(JSON.stringify({ resultCountEstimate: 'many', threads: [] }), searchThreadsResultSchema)).toMatchObject({ ok: false });
  });

  it('never copies received values into error issues', () => {
    const secret = 'SECRET-BODY-MARKER';
    const result = parseToolJson(JSON.stringify({ id: 't-1', messages: [{ ...validMessage, labelIds: secret }] }), getThreadResultSchema);

    expect(JSON.stringify(result)).not.toContain(secret);
  });
});
