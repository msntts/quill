// Parses `claude -p --output-format stream-json` output (one JSON event per line).

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface ToolResult {
  toolUseId: string;
  /** Concatenated text blocks, or null when the result carried no text (e.g. ToolSearch). */
  text: string | null;
  isError: boolean;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}

export interface RunSummary {
  isError: boolean;
  durationMs: number;
  numTurns: number;
  usage: TokenUsage;
}

export interface ParsedStream {
  toolCalls: ToolCall[];
  toolResults: Map<string, ToolResult>;
  finalText: string | null;
  summary: RunSummary | null;
}

export class StreamJsonError extends Error {
  constructor(readonly lineNumber: number) {
    super(`stream-json line ${lineNumber} is not valid JSON`);
    this.name = 'StreamJsonError';
  }
}

type Json = Record<string, unknown>;

function isObject(v: unknown): v is Json {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function contentBlocks(event: Json): Json[] {
  const message = event['message'];
  if (!isObject(message) || !Array.isArray(message['content'])) return [];
  return message['content'].filter(isObject);
}

function resultText(content: unknown): string | null {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return null;
  const texts = content.filter((b) => isObject(b) && b['type'] === 'text' && typeof b['text'] === 'string');
  return texts.length === 0 ? null : texts.map((b) => (b as Json)['text'] as string).join('');
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function toSummary(event: Json): RunSummary {
  const usage = isObject(event['usage']) ? event['usage'] : {};
  return {
    isError: event['is_error'] === true,
    durationMs: num(event['duration_ms']),
    numTurns: num(event['num_turns']),
    usage: {
      inputTokens: num(usage['input_tokens']),
      outputTokens: num(usage['output_tokens']),
      cacheCreationInputTokens: num(usage['cache_creation_input_tokens']),
      cacheReadInputTokens: num(usage['cache_read_input_tokens']),
    },
  };
}

export function parseStreamJson(lines: readonly string[]): ParsedStream {
  const parsed: ParsedStream = { toolCalls: [], toolResults: new Map(), finalText: null, summary: null };

  lines.forEach((line, index) => {
    if (line.trim() === '') return;
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      throw new StreamJsonError(index + 1);
    }
    if (!isObject(event)) return;

    if (event['type'] === 'assistant') {
      for (const block of contentBlocks(event)) {
        if (block['type'] === 'tool_use' && typeof block['id'] === 'string' && typeof block['name'] === 'string') {
          parsed.toolCalls.push({ id: block['id'], name: block['name'], input: block['input'] });
        }
      }
    } else if (event['type'] === 'user') {
      for (const block of contentBlocks(event)) {
        if (block['type'] === 'tool_result' && typeof block['tool_use_id'] === 'string') {
          parsed.toolResults.set(block['tool_use_id'], {
            toolUseId: block['tool_use_id'],
            text: resultText(block['content']),
            isError: block['is_error'] === true,
          });
        }
      }
    } else if (event['type'] === 'result') {
      parsed.summary = toSummary(event);
      parsed.finalText = typeof event['result'] === 'string' ? event['result'] : null;
    }
  });

  return parsed;
}
