// PreToolUse hook for the Gmail fetch run (design.md D12). The model may call the
// Gmail tools with other arguments than the prompt asks for; this pins the ones the
// fetch depends on before the call reaches Gmail.
import { GMAIL_GET_THREAD, GMAIL_SEARCH_THREADS } from './gmail-args';
import { SEARCH_PAGE_SIZE } from './gmail-query';

type ToolInput = Record<string, unknown>;

/** The input Gmail should get instead, or null for tools this hook leaves alone. */
export function rewriteGmailToolInput(toolName: string, input: ToolInput): ToolInput | null {
  if (toolName === GMAIL_SEARCH_THREADS) return { ...input, pageSize: SEARCH_PAGE_SIZE };
  if (toolName === GMAIL_GET_THREAD) return { ...input, messageFormat: 'PLAIN_TEXT' };
  return null;
}

const isObject = (v: unknown): v is ToolInput => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Turns the hook's stdin into its stdout. Prints nothing when it has nothing to say;
 * the fetch then fails as hook-missing instead of trusting unpinned arguments.
 */
export function runGmailHook(stdinText: string): string {
  let event: unknown;
  try {
    event = JSON.parse(stdinText);
  } catch {
    return '';
  }
  if (!isObject(event) || typeof event['tool_name'] !== 'string' || !isObject(event['tool_input'])) return '';
  const updatedInput = rewriteGmailToolInput(event['tool_name'], event['tool_input']);
  if (updatedInput === null) return '';
  return JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', updatedInput } });
}
