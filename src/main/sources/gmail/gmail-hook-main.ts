// Entry point claude runs as the PreToolUse hook: stdin → runGmailHook → stdout.
// Glue only (design.md D12); runGmailHook is covered by tests, this file by task 9.2.
import { runGmailHook } from './gmail-hook';

let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string) => (stdin += chunk));
process.stdin.on('end', () => process.stdout.write(runGmailHook(stdin)));
