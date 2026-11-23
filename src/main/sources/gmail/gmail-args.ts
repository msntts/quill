const GMAIL = 'mcp__claude_ai_Gmail__';

export const GMAIL_SEARCH_THREADS = `${GMAIL}search_threads`;
export const GMAIL_GET_THREAD = `${GMAIL}get_thread`;

const READ_TOOLS = [GMAIL_SEARCH_THREADS, GMAIL_GET_THREAD];

// Every write tool the Gmail connector exposes (docs/spike/1a-gmail.md).
// Listed explicitly so the model never even sees them.
const WRITE_TOOLS = [
  'apply_sensitive_message_label', 'apply_sensitive_thread_label', 'create_draft', 'create_label', 'delete_draft',
  'delete_label', 'forward', 'label_message', 'label_thread', 'mark_message_spam', 'mark_thread_spam', 'reply',
  'send_message', 'trash_message', 'trash_thread', 'unlabel_message', 'unlabel_thread', 'unmark_message_spam',
  'unmark_thread_spam', 'untrash_message', 'untrash_thread', 'update_draft', 'update_label', 'update_message_labels',
].map((tool) => GMAIL + tool);

export const MAX_TURNS = 60;

/** Hook settings file, written into claude's working folder (design.md D12). Relative, so it is cmd.exe-safe. */
export const GMAIL_SETTINGS_FILE = 'gmail-settings.json';

export interface GmailHookSettings {
  hooks: { PreToolUse: { matcher: string; hooks: { type: 'command'; command: string }[] }[] };
}

/** Settings that run the Gmail PreToolUse hook script with node. */
export function buildGmailHookSettings(hookScriptPath: string): GmailHookSettings {
  // claude runs hook commands through a shell, where forward slashes work on every OS.
  const script = hookScriptPath.replaceAll('\\', '/');
  return {
    hooks: {
      PreToolUse: [{ matcher: READ_TOOLS.join('|'), hooks: [{ type: 'command', command: `node "${script}"` }] }],
    },
  };
}

/** Arguments for the Gmail fetch run. The prompt goes on stdin. */
export function buildGmailArgs(): string[] {
  return [
    '-p',
    '--model', 'haiku',
    '--output-format', 'stream-json',
    '--verbose',
    '--no-session-persistence',
    '--max-turns', String(MAX_TURNS),
    '--settings', GMAIL_SETTINGS_FILE,
    '--include-hook-events',
    '--allowedTools', ...READ_TOOLS,
    '--disallowedTools', ...WRITE_TOOLS,
  ];
}
