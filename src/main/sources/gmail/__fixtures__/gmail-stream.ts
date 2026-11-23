// Builds fake stream-json output of a Gmail fetch run. All values are made up.
import {
  assistantTextLine,
  hookResponseLine,
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

/**
 * What the PreToolUse hook did with a call: by default it pins the arguments as the
 * real hook does; 'missing' leaves no hook record; an object overrides the pinned values.
 */
export type FakeHook = 'missing' | Record<string, unknown>;

export type StreamStep =
  // estimate: resultCountEstimate; defaults to the thread count, null leaves it out.
  // pageSize is what the model asked for (the hook pins it to 50).
  | { search: { query: string; threads: string[]; estimate?: string | null; pageSize?: number; hook?: FakeHook; raw?: string } }
  | { getThread: { threadId: string; messageFormat?: string; messages: FakeMessage[]; hook?: FakeHook; raw?: string } };

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

function hookLines(toolName: string, input: Record<string, unknown>, pinned: Record<string, unknown>, hook: FakeHook | undefined): string[] {
  if (hook === 'missing') return [];
  const updatedInput = { ...input, ...pinned, ...hook };
  return [hookResponseLine('PreToolUse', toolName, JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', updatedInput } }))];
}

/** A run as the spike observed it: ToolSearch first, then the Gmail calls, then the result. */
export function gmailStream(steps: StreamStep[], finalText = 'Read the threads.'): string[] {
  const lines = [initLine(), toolUseLine('tu-ts', 'ToolSearch', { query: 'select:gmail' }), toolSearchResultLine('tu-ts', [GMAIL_SEARCH_THREADS, GMAIL_GET_THREAD])];
  steps.forEach((step, i) => {
    const id = `tu-${i}`;
    if ('search' in step) {
      const { query, threads, estimate = String(threads.length), pageSize = 50, hook, raw } = step.search;
      const input = { query, view: 'THREAD_VIEW_IDS_ONLY', pageSize };
      lines.push(toolUseLine(id, GMAIL_SEARCH_THREADS, input), ...hookLines(GMAIL_SEARCH_THREADS, input, { pageSize: 50 }, hook));
      // An empty search comes back as {} (observed).
      const payload =
        threads.length === 0 ? {} : { ...(estimate === null ? {} : { resultCountEstimate: estimate }), threads: threads.map((t) => ({ id: t })) };
      lines.push(raw === undefined ? toolResultLine(id, payload) : rawToolResultLine(id, raw));
    } else {
      const { threadId, messageFormat, messages, hook, raw } = step.getThread;
      const input = { threadId, ...(messageFormat ? { messageFormat } : {}) };
      lines.push(toolUseLine(id, GMAIL_GET_THREAD, input), ...hookLines(GMAIL_GET_THREAD, input, { messageFormat: 'PLAIN_TEXT' }, hook));
      lines.push(raw === undefined ? toolResultLine(id, { id: threadId, messages: messages.map((m) => ({ threadId, ...m })) }) : rawToolResultLine(id, raw));
    }
  });
  lines.push(assistantTextLine(finalText), resultLine({ result: finalText }));
  return lines;
}
