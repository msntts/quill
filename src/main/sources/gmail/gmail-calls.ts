import type { HookResponse, ParsedStream } from '../../claude/stream-json';
import { GMAIL_GET_THREAD, GMAIL_SEARCH_THREADS } from './gmail-args';

export type ToolInput = Record<string, unknown>;

/** A Gmail tool call with the arguments Gmail actually got. */
export interface GmailCall {
  id: string;
  name: string;
  /** The hook's rewritten input when pinned, otherwise what the model asked for. */
  input: ToolInput;
  /** Whether a successful PreToolUse hook record was found for this call. */
  pinned: boolean;
}

export function inputOf(input: unknown): ToolInput {
  return typeof input === 'object' && input !== null && !Array.isArray(input) ? (input as ToolInput) : {};
}

// Hook records carry no tool_use id, so a call is matched by the argument the hook keeps as is.
const MATCH_KEY: Record<string, string> = { [GMAIL_SEARCH_THREADS]: 'query', [GMAIL_GET_THREAD]: 'threadId' };

function updatedInputOf(hook: HookResponse): ToolInput | null {
  if (hook.hookEvent !== 'PreToolUse' || hook.outcome !== 'success') return null;
  try {
    const output = inputOf(JSON.parse(hook.output));
    const updated = inputOf(output['hookSpecificOutput'])['updatedInput'];
    return typeof updated === 'object' && updated !== null ? inputOf(updated) : null;
  } catch {
    return null;
  }
}

/** Pairs each Gmail search / thread read with its hook record (design.md D12). */
export function resolveGmailCalls(parsed: ParsedStream): GmailCall[] {
  const unused = parsed.hookResponses
    .map((hook) => ({ toolName: hook.toolName, input: updatedInputOf(hook) }))
    .filter((h): h is { toolName: string; input: ToolInput } => h.input !== null);

  const calls: GmailCall[] = [];
  for (const call of parsed.toolCalls) {
    const key = MATCH_KEY[call.name];
    if (key === undefined) continue;
    const asked = inputOf(call.input);
    const i = unused.findIndex((h) => h.toolName === call.name && h.input[key] === asked[key]);
    if (i < 0) {
      calls.push({ id: call.id, name: call.name, input: asked, pinned: false });
    } else {
      calls.push({ id: call.id, name: call.name, input: unused[i]!.input, pinned: true });
      unused.splice(i, 1);
    }
  }
  return calls;
}
