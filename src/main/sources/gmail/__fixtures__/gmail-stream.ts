// Builds fake stream-json output of a Gmail fetch run. All values are made up.
import {
  assistantTextLine,
  initLine,
  rawToolResultLine,
  resultLine,
  toolResultLine,
  toolSearchResultLine,
  toolUseLine,
} from '../../../claude/__fixtures__/stream';
import { GMAIL_GET_THREAD, GMAIL_SEARCH_THREADS } from '../gmail-args';

export interface FakeMessage {
  id: string;
  threadId?: string;
  internalDate?: string;
  labelIds?: string[];
  sender?: string;
  subject?: string;
  plaintextBody?: string;
}

export type StreamStep =
  | { search: { query: string; threads: string[]; pageToken?: string; nextPageToken?: string; raw?: string } }
  | { getThread: { threadId: string; messageFormat?: string; messages: FakeMessage[]; raw?: string } };

export function message(id: string, overrides: Partial<FakeMessage> = {}): FakeMessage {
  return {
    id,
    threadId: 't-1',
    internalDate: '1700000000000',
    labelIds: ['INBOX', 'CATEGORY_PERSONAL'],
    sender: `${id}@example.com`,
    subject: `Subject of ${id}`,
    plaintextBody: `Body of ${id}`,
    ...overrides,
  };
}

/** A run as the spike observed it: ToolSearch first, then the Gmail calls, then the result. */
export function gmailStream(steps: StreamStep[], finalText = 'Read the threads.'): string[] {
  const lines = [initLine(), toolUseLine('tu-ts', 'ToolSearch', { query: 'select:gmail' }), toolSearchResultLine('tu-ts', [GMAIL_SEARCH_THREADS, GMAIL_GET_THREAD])];
  steps.forEach((step, i) => {
    const id = `tu-${i}`;
    if ('search' in step) {
      const { query, threads, pageToken, nextPageToken, raw } = step.search;
      lines.push(toolUseLine(id, GMAIL_SEARCH_THREADS, { query, view: 'THREAD_VIEW_IDS_ONLY', pageSize: 50, ...(pageToken ? { pageToken } : {}) }));
      const payload = threads.length === 0 && !nextPageToken ? {} : { threads: threads.map((t) => ({ id: t })), ...(nextPageToken ? { nextPageToken } : {}) };
      lines.push(raw === undefined ? toolResultLine(id, payload) : rawToolResultLine(id, raw));
    } else {
      const { threadId, messageFormat, messages, raw } = step.getThread;
      lines.push(toolUseLine(id, GMAIL_GET_THREAD, { threadId, ...(messageFormat ? { messageFormat } : {}) }));
      lines.push(raw === undefined ? toolResultLine(id, { id: threadId, messages: messages.map((m) => ({ threadId, ...m })) }) : rawToolResultLine(id, raw));
    }
  });
  lines.push(assistantTextLine(finalText), resultLine({ result: finalText }));
  return lines;
}
