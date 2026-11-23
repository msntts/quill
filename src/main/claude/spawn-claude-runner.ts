import { spawn, type ChildProcess } from 'node:child_process';
import {
  buildSpawnSpec,
  type ClaudeLauncher,
  type ClaudeRunner,
  type ClaudeRunOutcome,
  type ClaudeRunRequest,
} from './claude-runner';

/** The only place that starts the Claude CLI process. */
export class SpawnClaudeRunner implements ClaudeRunner {
  constructor(
    private readonly launcher: ClaudeLauncher,
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  run(request: ClaudeRunRequest): Promise<ClaudeRunOutcome> {
    const started = Date.now();
    const elapsed = () => Date.now() - started;
    const spec = buildSpawnSpec(this.launcher, request.args);

    return new Promise((resolve) => {
      let settled = false;
      const settle = (outcome: ClaudeRunOutcome) => {
        if (settled) return;
        settled = true;
        resolve(outcome);
      };

      let child: ChildProcess;
      try {
        child = spawn(spec.command, spec.args, {
          cwd: request.cwd,
          env: this.env,
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
          windowsVerbatimArguments: spec.windowsVerbatimArguments,
        });
      } catch {
        settle({ kind: 'spawn-error', durationMs: elapsed() });
        return;
      }

      const chunks: Buffer[] = [];
      child.stdout?.on('data', (chunk: Buffer) => chunks.push(chunk));
      // stderr is drained but never kept: it may echo message content.
      child.stderr?.resume();
      const lines = () =>
        Buffer.concat(chunks)
          .toString('utf8')
          .split(/\r?\n/)
          .filter((l) => l !== '');

      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        this.kill(child);
      }, request.timeoutMs);

      child.on('error', () => {
        clearTimeout(timer);
        settle({ kind: 'spawn-error', durationMs: elapsed() });
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        settle(
          timedOut
            ? { kind: 'timeout', stdoutLines: lines(), durationMs: elapsed() }
            : { kind: 'exited', exitCode: code, stdoutLines: lines(), durationMs: elapsed() },
        );
      });

      child.stdin?.on('error', () => {});
      child.stdin?.end(request.stdin);
    });
  }

  private kill(child: ChildProcess): void {
    if (this.launcher.kind === 'cmd' && process.platform === 'win32' && child.pid !== undefined) {
      // cmd.exe would leave claude running; take down the whole tree.
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      return;
    }
    child.kill();
  }
}
