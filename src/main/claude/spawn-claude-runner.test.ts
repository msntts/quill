import os from 'node:os';
import { describe, expect, it } from 'vitest';
import { SpawnClaudeRunner } from './spawn-claude-runner';

// Stand-in for the claude executable: plain Node running an inline script.
const node = new SpawnClaudeRunner({ kind: 'direct', path: process.execPath });

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

describe('SpawnClaudeRunner', () => {
  it('sends the prompt on stdin and returns stdout lines with the exit code', async () => {
    const script = "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.stringify({got:s}));console.log('second');process.exit(3)})";

    const outcome = await node.run({ args: ['-e', script], stdin: 'hello prompt', cwd: os.tmpdir(), timeoutMs: 10_000 });

    expect(outcome.kind).toBe('exited');
    if (outcome.kind !== 'exited') return;
    expect(outcome.exitCode).toBe(3);
    expect(outcome.stdoutLines).toEqual([JSON.stringify({ got: 'hello prompt' }), 'second']);
    expect(outcome.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('FC-13 制限時間を超えた', async () => {
    const script = 'console.log(process.pid);setInterval(()=>{},1000)';

    const outcome = await node.run({ args: ['-e', script], stdin: '', cwd: os.tmpdir(), timeoutMs: 1_000 });

    expect(outcome.kind).toBe('timeout');
    const pid = Number(outcome.kind === 'timeout' ? outcome.stdoutLines[0] : NaN);
    expect(Number.isInteger(pid)).toBe(true);
    expect(isAlive(pid)).toBe(false);
  });

  it('reports a spawn error when the executable does not exist', async () => {
    const missing = new SpawnClaudeRunner({ kind: 'direct', path: 'C:/definitely/not/here/claude.exe' });

    const outcome = await missing.run({ args: [], stdin: '', cwd: os.tmpdir(), timeoutMs: 5_000 });

    expect(outcome.kind).toBe('spawn-error');
  });
});
