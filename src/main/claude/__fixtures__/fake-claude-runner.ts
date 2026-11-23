import type { ClaudeRunner, ClaudeRunOutcome, ClaudeRunRequest } from '../claude-runner';

/** Returns canned outcomes and records each request. */
export class FakeClaudeRunner implements ClaudeRunner {
  readonly requests: ClaudeRunRequest[] = [];

  constructor(private readonly outcome: ClaudeRunOutcome | ((request: ClaudeRunRequest) => Promise<ClaudeRunOutcome>)) {}

  static exited(stdoutLines: string[], exitCode = 0): FakeClaudeRunner {
    return new FakeClaudeRunner({ kind: 'exited', exitCode, stdoutLines, durationMs: 1_000 });
  }

  async run(request: ClaudeRunRequest): Promise<ClaudeRunOutcome> {
    this.requests.push(request);
    return typeof this.outcome === 'function' ? this.outcome(request) : this.outcome;
  }
}
