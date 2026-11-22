import type { ParsedStream } from '../../claude/stream-json';
import type { FetchFailure } from '../message-source';
import { GMAIL_GET_THREAD, GMAIL_SEARCH_THREADS } from './gmail-args';
import { SEARCH_PAGE_SIZE } from './gmail-query';
import { parseToolJson, searchThreadsResultSchema } from './gmail-schemas';

export type ProcedureReason =
  | 'search-missing'
  | 'next-page-missing'
  | 'page-full-without-token'
  | 'thread-unread'
  | 'thread-read-without-body';

export type ProcedureCheck = { ok: true } | { ok: false; failure: FetchFailure };

export function inputOf(input: unknown): Record<string, unknown> {
  return typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
}

/** get_thread formats whose results include the message body. */
export function isBodyFormat(messageFormat: unknown): boolean {
  return messageFormat === undefined || messageFormat === 'PLAIN_TEXT';
}

const incomplete = (reason: ProcedureReason): ProcedureCheck => ({ ok: false, failure: { kind: 'procedure-incomplete', reason } });

/**
 * Checks that the model followed the prescribed steps for `query`: searched with it,
 * followed every page, and read every found thread with bodies. Extra searches and
 * reads are allowed.
 */
export function verifyGmailProcedure(parsed: ParsedStream, query: string): ProcedureCheck {
  const searches = parsed.toolCalls.filter((c) => c.name === GMAIL_SEARCH_THREADS && inputOf(c.input)['query'] === query);
  if (searches.length === 0) return incomplete('search-missing');

  const threadIds = new Set<string>();
  const nextTokens: string[] = [];
  const usedTokens = new Set<unknown>(searches.map((c) => inputOf(c.input)['pageToken']));
  for (const call of searches) {
    const result = parseToolJson(parsed.toolResults.get(call.id)?.text ?? null, searchThreadsResultSchema);
    if (!result.ok) return { ok: false, failure: { kind: 'tool-result-invalid', issues: result.error.issues } };
    for (const t of result.data.threads) threadIds.add(t.id);
    if (result.data.nextPageToken !== undefined) nextTokens.push(result.data.nextPageToken);
    // The next-page field name is unconfirmed (design OQ1): treat a full page without it as incomplete.
    else if (result.data.threads.length >= SEARCH_PAGE_SIZE) return incomplete('page-full-without-token');
  }
  if (nextTokens.some((t) => !usedTokens.has(t))) return incomplete('next-page-missing');

  const readWithBody = new Set<unknown>();
  const readAtAll = new Set<unknown>();
  for (const call of parsed.toolCalls) {
    if (call.name !== GMAIL_GET_THREAD) continue;
    const input = inputOf(call.input);
    readAtAll.add(input['threadId']);
    if (isBodyFormat(input['messageFormat'])) readWithBody.add(input['threadId']);
  }
  for (const id of threadIds) {
    if (!readAtAll.has(id)) return incomplete('thread-unread');
    if (!readWithBody.has(id)) return incomplete('thread-read-without-body');
  }
  return { ok: true };
}
