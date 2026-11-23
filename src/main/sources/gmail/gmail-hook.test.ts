import { describe, expect, it } from 'vitest';
import { GMAIL_GET_THREAD, GMAIL_SEARCH_THREADS } from './gmail-args';
import { rewriteGmailToolInput, runGmailHook } from './gmail-hook';

describe('rewriteGmailToolInput', () => {
  it('GS-27 検索の件数を書き換える', () => {
    expect(rewriteGmailToolInput(GMAIL_SEARCH_THREADS, { query: 'in:inbox', view: 'THREAD_VIEW_IDS_ONLY', pageSize: 5 })).toEqual({
      query: 'in:inbox',
      view: 'THREAD_VIEW_IDS_ONLY',
      pageSize: 50,
    });
  });

  it('GS-27 件数の指定がない検索にも50を付ける', () => {
    expect(rewriteGmailToolInput(GMAIL_SEARCH_THREADS, { query: 'in:inbox' })).toEqual({ query: 'in:inbox', pageSize: 50 });
  });

  it('GS-28 読み方を書き換える', () => {
    expect(rewriteGmailToolInput(GMAIL_GET_THREAD, { threadId: 't-1', messageFormat: 'METADATA_ONLY' })).toEqual({
      threadId: 't-1',
      messageFormat: 'PLAIN_TEXT',
    });
  });

  it('leaves other tools alone', () => {
    expect(rewriteGmailToolInput('ToolSearch', { query: 'select:gmail' })).toBeNull();
  });
});

describe('runGmailHook', () => {
  it('answers a PreToolUse event with the rewritten input', () => {
    const stdin = JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: GMAIL_SEARCH_THREADS, tool_input: { query: 'in:inbox', pageSize: 5 } });

    expect(JSON.parse(runGmailHook(stdin))).toEqual({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', updatedInput: { query: 'in:inbox', pageSize: 50 } },
    });
  });

  it('prints nothing for other tools so claude decides as usual', () => {
    expect(runGmailHook(JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'ToolSearch', tool_input: {} }))).toBe('');
  });

  it('prints nothing for input it cannot read', () => {
    expect(runGmailHook('not json')).toBe('');
  });
});
