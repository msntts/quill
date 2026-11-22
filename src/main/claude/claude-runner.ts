import path from 'node:path';

export interface ClaudeRunRequest {
  args: readonly string[];
  /** The prompt. Passed on stdin so args stay short, fixed tokens. */
  stdin: string;
  cwd: string;
  timeoutMs: number;
}

export type ClaudeRunOutcome =
  | { kind: 'exited'; exitCode: number | null; stdoutLines: string[]; durationMs: number }
  | { kind: 'timeout'; stdoutLines: string[]; durationMs: number }
  | { kind: 'spawn-error'; durationMs: number };

/** Boundary around the Claude CLI so tests never run the real thing. */
export interface ClaudeRunner {
  run(request: ClaudeRunRequest): Promise<ClaudeRunOutcome>;
}

export type ClaudeLauncher = { kind: 'direct'; path: string } | { kind: 'cmd'; path: string };

export interface SpawnSpec {
  command: string;
  args: string[];
  windowsVerbatimArguments: boolean;
}

/** Finds the claude executable. On Windows a native .exe wins over an npm .cmd shim. */
export function resolveClaudeLauncher(
  lookup: (fileName: string) => string | null,
  platform: NodeJS.Platform,
): ClaudeLauncher | null {
  if (platform === 'win32') {
    const exe = lookup('claude.exe');
    if (exe) return { kind: 'direct', path: exe };
    const cmd = lookup('claude.cmd');
    return cmd ? { kind: 'cmd', path: cmd } : null;
  }
  const bin = lookup('claude');
  return bin ? { kind: 'direct', path: bin } : null;
}

// Tokens that are safe inside a cmd.exe command line without escaping.
const SAFE_CMD_ARG = /^[A-Za-z0-9_.:/=-]+$/;

export function buildSpawnSpec(launcher: ClaudeLauncher, args: readonly string[]): SpawnSpec {
  if (launcher.kind === 'direct') {
    return { command: launcher.path, args: [...args], windowsVerbatimArguments: false };
  }
  // Node cannot spawn .cmd files directly, so go through cmd.exe. Only fixed,
  // metacharacter-free args are allowed; the prompt itself travels on stdin.
  for (const arg of args) {
    if (!SAFE_CMD_ARG.test(arg)) throw new Error(`unsafe argument for cmd.exe: ${JSON.stringify(arg)}`);
  }
  const commandLine = [`"${launcher.path}"`, ...args].join(' ');
  return { command: 'cmd.exe', args: ['/d', '/s', '/c', `"${commandLine}"`], windowsVerbatimArguments: true };
}

/** Looks for fileName in each PATH directory, in order. */
export function findOnPath(fileName: string, pathEnv: string, exists: (file: string) => boolean): string | null {
  for (const dir of pathEnv.split(path.delimiter)) {
    if (dir === '') continue;
    const candidate = path.join(dir, fileName);
    if (exists(candidate)) return candidate;
  }
  return null;
}
