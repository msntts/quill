import { describe, expect, it } from 'vitest';
import { buildGmailArgs, buildGmailHookSettings, GMAIL_SETTINGS_FILE } from './gmail-args';

const G = 'mcp__claude_ai_Gmail__';

// Write tools observed in the spike (docs/spike/1a-gmail.md).
const WRITE_TOOLS = [
  'apply_sensitive_message_label', 'apply_sensitive_thread_label', 'create_draft', 'create_label', 'delete_draft',
  'delete_label', 'forward', 'label_message', 'label_thread', 'mark_message_spam', 'mark_thread_spam', 'reply',
  'send_message', 'trash_message', 'trash_thread', 'unlabel_message', 'unlabel_thread', 'unmark_message_spam',
  'unmark_thread_spam', 'untrash_message', 'untrash_thread', 'update_draft', 'update_label', 'update_message_labels',
].map((t) => G + t);

/** Values following a flag, up to the next flag. */
function valuesOf(args: string[], flag: string): string[] {
  const i = args.indexOf(flag);
  if (i < 0) return [];
  const rest = args.slice(i + 1);
  const end = rest.findIndex((a) => a.startsWith('--'));
  return end < 0 ? rest : rest.slice(0, end);
}

describe('buildGmailArgs', () => {
  const args = buildGmailArgs();

  it('GS-05 許可するツールは読み取り系だけ', () => {
    expect(valuesOf(args, '--allowedTools').sort()).toEqual([`${G}get_thread`, `${G}search_threads`]);
  });

  it('GS-06 書き込み系ツールは禁止する', () => {
    const disallowed = valuesOf(args, '--disallowedTools');
    for (const tool of WRITE_TOOLS) expect(disallowed).toContain(tool);
  });

  it('GS-07 権限確認を飛ばさない', () => {
    expect(args).not.toContain('--dangerously-skip-permissions');
    expect(args.join(' ')).not.toMatch(/bypassPermissions/);
  });

  it('GS-08 記録を保存しない指定を付ける', () => {
    expect(args).toContain('--no-session-persistence');
  });

  it('runs headless Haiku with stream-json output and a turn cap', () => {
    expect(args[0]).toBe('-p');
    expect(valuesOf(args, '--model')).toEqual(['haiku']);
    expect(valuesOf(args, '--output-format')).toEqual(['stream-json']);
    expect(args).toContain('--verbose');
    expect(valuesOf(args, '--max-turns')).toEqual(['60']);
  });

  it('GS-29 書き換えの仕組みを付けて起動する', () => {
    expect(valuesOf(args, '--settings')).toEqual([GMAIL_SETTINGS_FILE]);
    expect(GMAIL_SETTINGS_FILE).toBe('gmail-settings.json');
    expect(args).toContain('--include-hook-events');
  });
});

describe('buildGmailHookSettings', () => {
  it('GS-29 runs the hook script with node before the two Gmail read tools', () => {
    expect(buildGmailHookSettings('C:/app/dist/main/sources/gmail/gmail-hook-main.js')).toEqual({
      hooks: {
        PreToolUse: [
          {
            matcher: `${G}search_threads|${G}get_thread`,
            hooks: [{ type: 'command', command: 'node "C:/app/dist/main/sources/gmail/gmail-hook-main.js"' }],
          },
        ],
      },
    });
  });

  it('uses forward slashes in the command, since claude runs hooks through a shell', () => {
    const settings = buildGmailHookSettings('C:\\Users\\me\\quill\\gmail-hook-main.js');

    expect(settings.hooks.PreToolUse[0]?.hooks[0]?.command).toBe('node "C:/Users/me/quill/gmail-hook-main.js"');
  });
});
