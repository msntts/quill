import type { FetchSlice } from '../message-source';
import { utcDate } from './gmail-slices';

export const SEARCH_PAGE_SIZE = 50;

const searchDate = (epochMs: number) => utcDate(epochMs).replaceAll('-', '/');

/** Searches the whole inbox (every tab) for one UTC day; code filters by receive time. */
export function buildGmailQuery(slice: FetchSlice): string {
  return `in:inbox after:${searchDate(slice.startsAt)} before:${searchDate(slice.endsAt)}`;
}

export function buildGmailPrompt(query: string): string {
  return [
    'Read my Gmail threads with exactly these steps.',
    `1. Call search_threads with query "${query}", view THREAD_VIEW_IDS_ONLY, pageSize ${SEARCH_PAGE_SIZE}. Use this query exactly as written.`,
    '2. Call get_thread with messageFormat PLAIN_TEXT for every thread id found in step 1.',
    // Loading the tools first (ToolSearch) is fine; other Gmail tools are not.
    'Do not call any other Gmail tool. When finished, reply only with the number of threads you read.',
  ].join('\n');
}
