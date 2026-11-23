import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSpawnSpec, findOnPath, resolveClaudeLauncher } from './claude-runner';

describe('resolveClaudeLauncher', () => {
  const lookup = (found: Record<string, string>) => (name: string) => found[name] ?? null;

  it('launches claude.exe directly on Windows', () => {
    const launcher = resolveClaudeLauncher(lookup({ 'claude.exe': 'C:\bin\claude.exe', 'claude.cmd': 'C:\npm\claude.cmd' }), 'win32');

    expect(launcher).toEqual({ kind: 'direct', path: 'C:\bin\claude.exe' });
  });

  it('falls back to claude.cmd through cmd.exe on Windows', () => {
    expect(resolveClaudeLauncher(lookup({ 'claude.cmd': 'C:\npm\claude.cmd' }), 'win32')).toEqual({
      kind: 'cmd',
      path: 'C:\npm\claude.cmd',
    });
  });

  it('launches claude directly on macOS and Linux', () => {
    expect(resolveClaudeLauncher(lookup({ claude: '/usr/local/bin/claude' }), 'darwin')).toEqual({
      kind: 'direct',
      path: '/usr/local/bin/claude',
    });
    expect(resolveClaudeLauncher(lookup({ claude: '/usr/bin/claude' }), 'linux')).toEqual({ kind: 'direct', path: '/usr/bin/claude' });
  });

  it('returns null when claude is not installed', () => {
    expect(resolveClaudeLauncher(lookup({}), 'win32')).toBeNull();
    expect(resolveClaudeLauncher(lookup({}), 'darwin')).toBeNull();
  });
});

describe('buildSpawnSpec', () => {
  it('passes args as-is for a direct launcher', () => {
    expect(buildSpawnSpec({ kind: 'direct', path: '/bin/claude' }, ['-p', '--model', 'haiku'])).toEqual({
      command: '/bin/claude',
      args: ['-p', '--model', 'haiku'],
      windowsVerbatimArguments: false,
    });
  });

  it('wraps a .cmd launcher in one quoted cmd.exe command line', () => {
    expect(buildSpawnSpec({ kind: 'cmd', path: 'C:\Program Files\npm\claude.cmd' }, ['-p', '--model', 'haiku'])).toEqual({
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', '""C:\Program Files\npm\claude.cmd" -p --model haiku"'],
      windowsVerbatimArguments: true,
    });
  });

  it('refuses args with shell metacharacters for a .cmd launcher', () => {
    expect(() => buildSpawnSpec({ kind: 'cmd', path: 'C:\npm\claude.cmd' }, ['-p', 'a&b'])).toThrow();
    expect(() => buildSpawnSpec({ kind: 'cmd', path: 'C:\npm\claude.cmd' }, ['has space'])).toThrow();
  });
});

describe('findOnPath', () => {
  it('returns the first existing candidate along PATH', () => {
    const dirs = [path.join('a'), path.join('b')];
    const existing = new Set([path.join('b', 'claude.exe')]);

    expect(findOnPath('claude.exe', dirs.join(path.delimiter), (p) => existing.has(p))).toBe(path.join('b', 'claude.exe'));
    expect(findOnPath('claude.cmd', dirs.join(path.delimiter), (p) => existing.has(p))).toBeNull();
  });
});
