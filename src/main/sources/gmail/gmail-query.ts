const DAY_MS = 24 * 60 * 60 * 1000;

export const SEARCH_PAGE_SIZE = 50;

/** YYYY/MM/DD of an instant in the given time zone. */
function localDate(epochMs: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(
    new Date(epochMs),
  );
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}/${get('month')}/${get('day')}`;
}

/**
 * Gmail's `after:` only has day resolution and its time zone is unclear, so
 * search from the day before the window start; code filters by receive time.
 */
export function buildGmailQuery(windowStart: number, timeZone: string): string {
  return `in:inbox category:primary after:${localDate(windowStart - DAY_MS, timeZone)}`;
}

export function buildGmailPrompt(query: string): string {
  return [
    'Read my Gmail threads with exactly these steps.',
    `1. Call search_threads with query "${query}", view THREAD_VIEW_IDS_ONLY, pageSize ${SEARCH_PAGE_SIZE}. Use this query exactly as written.`,
    '2. If the result has a next page token, call search_threads again with the same query and that pageToken. Repeat until there are no more pages.',
    '3. Call get_thread with messageFormat PLAIN_TEXT for every thread id found in steps 1 and 2.',
    // Loading the tools first (ToolSearch) is fine; other Gmail tools are not.
    'Do not call any other Gmail tool. When finished, reply only with the number of threads you read.',
  ].join('\n');
}
