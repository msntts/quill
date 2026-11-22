// Builders for fake `claude -p --output-format stream-json` output, shaped like
// the real stream observed in the Gmail spike. All values are made up.

export function initLine(): string {
  return JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-haiku-5-5', tools: [] });
}

export function toolUseLine(id: string, name: string, input: unknown): string {
  return JSON.stringify({
    type: 'assistant',
    message: { role: 'assistant', content: [{ type: 'tool_use', id, name, input }] },
  });
}

/** A tool result whose content is a JSON payload serialized as text. */
export function toolResultLine(toolUseId: string, payload: unknown): string {
  return JSON.stringify({
    type: 'user',
    message: {
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: toolUseId, content: [{ type: 'text', text: JSON.stringify(payload) }] }],
    },
  });
}

/** A tool result carrying raw text (e.g. something that is not JSON). */
export function rawToolResultLine(toolUseId: string, text: string): string {
  return JSON.stringify({
    type: 'user',
    message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUseId, content: [{ type: 'text', text }] }] },
  });
}

/** The ToolSearch result: tool references only, no text. */
export function toolSearchResultLine(toolUseId: string, toolNames: string[]): string {
  return JSON.stringify({
    type: 'user',
    message: {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUseId,
          content: toolNames.map((tool_name) => ({ type: 'tool_reference', tool_name })),
        },
      ],
    },
  });
}

export function assistantTextLine(text: string): string {
  return JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text }] } });
}

export function resultLine(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    type: 'result',
    subtype: 'success',
    is_error: false,
    duration_ms: 32_000,
    num_turns: 5,
    result: 'done',
    usage: {
      input_tokens: 10,
      output_tokens: 200,
      cache_creation_input_tokens: 3_000,
      cache_read_input_tokens: 40_000,
    },
    ...overrides,
  });
}
