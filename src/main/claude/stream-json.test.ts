import { describe, expect, it } from 'vitest';
import {
  hookResponseLine,
  initLine,
  rawToolResultLine,
  resultLine,
  toolResultLine,
  toolSearchResultLine,
  toolUseLine,
} from './__fixtures__/stream';
import { parseStreamJson, StreamJsonError } from './stream-json';

describe('parseStreamJson', () => {
  it('extracts tool calls, tool results and the run summary in order', () => {
    const lines = [
      initLine(),
      toolUseLine('tu-0', 'ToolSearch', { query: 'select:x' }),
      toolSearchResultLine('tu-0', ['mcp__x']),
      toolUseLine('tu-1', 'mcp__claude_ai_Gmail__search_threads', { query: 'in:inbox' }),
      toolResultLine('tu-1', { threads: [{ id: 't-1' }] }),
      resultLine({ result: 'finished' }),
      '',
    ];

    const parsed = parseStreamJson(lines);

    expect(parsed.toolCalls).toEqual([
      { id: 'tu-0', name: 'ToolSearch', input: { query: 'select:x' } },
      { id: 'tu-1', name: 'mcp__claude_ai_Gmail__search_threads', input: { query: 'in:inbox' } },
    ]);
    expect(parsed.toolResults.get('tu-1')).toEqual({ toolUseId: 'tu-1', text: JSON.stringify({ threads: [{ id: 't-1' }] }), isError: false });
    expect(parsed.finalText).toBe('finished');
    expect(parsed.summary).toEqual({
      isError: false,
      durationMs: 32_000,
      numTurns: 5,
      usage: { inputTokens: 10, outputTokens: 200, cacheCreationInputTokens: 3_000, cacheReadInputTokens: 40_000 },
    });
  });

  it('keeps a text-less ToolSearch result with null text instead of failing', () => {
    const parsed = parseStreamJson([toolUseLine('tu-0', 'ToolSearch', {}), toolSearchResultLine('tu-0', ['mcp__x'])]);

    expect(parsed.toolResults.get('tu-0')).toEqual({ toolUseId: 'tu-0', text: null, isError: false });
  });

  it('accepts tool result content given as a plain string', () => {
    const line = JSON.stringify({
      type: 'user',
      message: { content: [{ type: 'tool_result', tool_use_id: 'tu-9', content: '{}', is_error: true }] },
    });

    expect(parseStreamJson([line]).toolResults.get('tu-9')).toEqual({ toolUseId: 'tu-9', text: '{}', isError: true });
  });

  it('does not interpret tool result text', () => {
    const parsed = parseStreamJson([rawToolResultLine('tu-1', 'not json')]);

    expect(parsed.toolResults.get('tu-1')?.text).toBe('not json');
  });

  it('returns a null summary when no result line arrived', () => {
    expect(parseStreamJson([initLine()]).summary).toBeNull();
  });

  it('fails when a line is not JSON', () => {
    expect(() => parseStreamJson([initLine(), '{broken'])).toThrow(StreamJsonError);
  });

  it('extracts hook responses with their event, tool, outcome and output', () => {
    const output = JSON.stringify({ hookSpecificOutput: { updatedInput: { query: 'in:inbox', pageSize: 50 } } });
    const lines = [
      initLine(),
      hookResponseLine('SessionStart', 'startup', ''),
      toolUseLine('tu-1', 'mcp__claude_ai_Gmail__search_threads', { query: 'in:inbox', pageSize: 5 }),
      hookResponseLine('PreToolUse', 'mcp__claude_ai_Gmail__search_threads', output),
      hookResponseLine('PreToolUse', 'mcp__claude_ai_Gmail__get_thread', '', 'error'),
      JSON.stringify({ type: 'system', subtype: 'hook_started', hook_name: 'PreToolUse:x', hook_event: 'PreToolUse' }),
      resultLine(),
    ];

    expect(parseStreamJson(lines).hookResponses).toEqual([
      { hookEvent: 'SessionStart', toolName: 'startup', outcome: 'success', output: '' },
      { hookEvent: 'PreToolUse', toolName: 'mcp__claude_ai_Gmail__search_threads', outcome: 'success', output },
      { hookEvent: 'PreToolUse', toolName: 'mcp__claude_ai_Gmail__get_thread', outcome: 'error', output: '' },
    ]);
  });
});
