import type { ParsedStream } from '../../claude/stream-json';
import type { FetchFailure } from '../message-source';
import { GMAIL_GET_THREAD, GMAIL_SEARCH_THREADS } from './gmail-args';
import { resolveGmailCalls } from './gmail-calls';
import { SEARCH_PAGE_SIZE } from './gmail-query';
import { parseToolJson, searchThreadsResultSchema } from './gmail-schemas';

export type ProcedureReason =
  | 'search-missing'
  | 'hook-missing'
  | 'page-size-mismatch'
  | 'result-truncated'
  | 'thread-unread'
  | 'thread-read-without-body';

export type ProcedureCheck = { ok: true } | { ok: false; failure: FetchFailure };

/** get_thread formats whose results include the message body. */
export function isBodyFormat(messageFormat: unknown): boolean {
  return messageFormat === undefined || messageFormat === 'PLAIN_TEXT';
}

const incomplete = (reason: ProcedureReason): ProcedureCheck => ({ ok: false, failure: { kind: 'procedure-incomplete', reason } });

/**
 * A full page may hide more threads, and the connector cannot page. Below the page
 * size the estimate is ignored: it can run high, and failing on it would stall the cursor.
 */
function isTruncated(threadCount: number, estimate: string | undefined): boolean {
  return threadCount >= SEARCH_PAGE_SIZE && (estimate === undefined || Number(estimate) > threadCount);
}

/**
 * Checks that the model followed the prescribed steps for `query`: searched with it,
 * every Gmail call went through the hook, the search ran with full pages and was not
 * cut off, and every found thread was read with bodies. Judged on the arguments Gmail
 * got after the hook. Extra searches and reads are allowed.
 */
export function verifyGmailProcedure(parsed: ParsedStream, query: string): ProcedureCheck {
  const calls = resolveGmailCalls(parsed);
  const searches = calls.filter((c) => c.name === GMAIL_SEARCH_THREADS && c.input['query'] === query);
  if (searches.length === 0) return incomplete('search-missing');
  if (calls.some((c) => !c.pinned)) return incomplete('hook-missing');
  // Fewer threads than a page means "all of them" only when the page held 50.
  if (searches.some((c) => c.input['pageSize'] !== SEARCH_PAGE_SIZE)) return incomplete('page-size-mismatch');

  const threadIds = new Set<string>();
  for (const call of searches) {
    const result = parseToolJson(parsed.toolResults.get(call.id)?.text ?? null, searchThreadsResultSchema);
    if (!result.ok) return { ok: false, failure: { kind: 'tool-result-invalid', issues: result.error.issues } };
    if (isTruncated(result.data.threads.length, result.data.resultCountEstimate)) return incomplete('result-truncated');
    for (const t of result.data.threads) threadIds.add(t.id);
  }

  const readWithBody = new Set<unknown>();
  const readAtAll = new Set<unknown>();
  for (const call of calls) {
    if (call.name !== GMAIL_GET_THREAD) continue;
    readAtAll.add(call.input['threadId']);
    if (isBodyFormat(call.input['messageFormat'])) readWithBody.add(call.input['threadId']);
  }
  for (const id of threadIds) {
    if (!readAtAll.has(id)) return incomplete('thread-unread');
    if (!readWithBody.has(id)) return incomplete('thread-read-without-body');
  }
  return { ok: true };
}
