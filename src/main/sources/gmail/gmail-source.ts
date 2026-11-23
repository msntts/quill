import type { ClaudeRunner } from '../../claude/claude-runner';
import { parseStreamJson, StreamJsonError, type ParsedStream } from '../../claude/stream-json';
import type { InboxMessage } from '../../inbox/inbox-store';
import type { FetchSlice, FetchStats, MessageSource, SourceFetchResult } from '../message-source';
import { buildGmailArgs, GMAIL_GET_THREAD } from './gmail-args';
import { resolveGmailCalls } from './gmail-calls';
import { isBodyFormat, verifyGmailProcedure } from './gmail-procedure';
import { buildGmailPrompt, buildGmailQuery } from './gmail-query';
import { planGmailSlices } from './gmail-slices';
import { getThreadResultSchema, parseToolJson, type GmailMessage } from './gmail-schemas';

export interface GmailSourceOptions {
  /** Working directory for claude (a fixed folder under userData). */
  cwd: string;
  timeoutMs: number;
}

type Extracted = { ok: true; messages: GmailMessage[] } | { ok: false; result: SourceFetchResult };

/** Collects messages from get_thread results that were body-bearing as Gmail got them. */
function extractMessages(parsed: ParsedStream, stats: FetchStats): Extracted {
  const byId = new Map<string, GmailMessage>();
  for (const call of resolveGmailCalls(parsed)) {
    if (call.name !== GMAIL_GET_THREAD || !isBodyFormat(call.input['messageFormat'])) continue;
    const json = parseToolJson(parsed.toolResults.get(call.id)?.text ?? null, getThreadResultSchema);
    if (!json.ok) {
      return { ok: false, result: { ok: false, failure: { kind: 'tool-result-invalid', issues: json.error.issues }, stats } };
    }
    for (const m of json.data.messages) byId.set(m.id, m);
  }
  return { ok: true, messages: [...byId.values()] };
}

/** Received mail in the inbox, whatever its tab. */
export function isInboxReceived(labelIds: readonly string[]): boolean {
  return labelIds.includes('INBOX') && !labelIds.includes('SENT');
}

function toInboxMessage(m: GmailMessage): InboxMessage {
  return {
    externalId: m.id,
    threadId: m.threadId,
    sender: m.sender ?? '',
    subject: m.subject ?? '',
    receivedAt: Number(m.internalDate),
    body: m.plaintextBody ?? '',
  };
}

export class GmailSource implements MessageSource {
  readonly name = 'gmail';

  constructor(
    private readonly runner: ClaudeRunner,
    private readonly options: GmailSourceOptions,
  ) {}

  planSlices(windowStart: number, now: number): FetchSlice[] {
    return planGmailSlices(windowStart, now);
  }

  async fetchSlice(slice: FetchSlice): Promise<SourceFetchResult> {
    const query = buildGmailQuery(slice);
    const outcome = await this.runner.run({
      args: buildGmailArgs(),
      stdin: buildGmailPrompt(query),
      cwd: this.options.cwd,
      timeoutMs: this.options.timeoutMs,
    });

    const bare: FetchStats = { durationMs: outcome.durationMs, numTurns: null, usage: null };
    if (outcome.kind === 'spawn-error') return { ok: false, failure: { kind: 'cli-spawn-error' }, stats: bare };
    if (outcome.kind === 'timeout') return { ok: false, failure: { kind: 'cli-timeout' }, stats: bare };

    let parsed: ParsedStream;
    try {
      parsed = parseStreamJson(outcome.stdoutLines);
    } catch (e) {
      if (e instanceof StreamJsonError) return { ok: false, failure: { kind: 'stream-invalid' }, stats: bare };
      throw e;
    }

    const stats: FetchStats = parsed.summary
      ? { durationMs: outcome.durationMs, numTurns: parsed.summary.numTurns, usage: parsed.summary.usage }
      : bare;
    if (outcome.exitCode !== 0) return { ok: false, failure: { kind: 'cli-exit' }, stats };
    if (!parsed.summary) return { ok: false, failure: { kind: 'cli-no-result' }, stats };
    if (parsed.summary.isError) return { ok: false, failure: { kind: 'cli-error' }, stats };

    const extracted = extractMessages(parsed, stats);
    if (!extracted.ok) return extracted.result;
    const procedure = verifyGmailProcedure(parsed, query);
    if (!procedure.ok) return { ok: false, failure: procedure.failure, stats };
    const kept = extracted.messages.filter((m) => isInboxReceived(m.labelIds));
    return { ok: true, messages: kept.map(toInboxMessage), stats };
  }
}
