import { z } from 'zod';

const messageSchema = z.object({
  id: z.string().min(1),
  threadId: z.string().min(1),
  internalDate: z.string().regex(/^\d+$/),
  labelIds: z.array(z.string()),
  sender: z.string().optional(),
  subject: z.string().optional(),
  plaintextBody: z.string().optional(),
});

export const getThreadResultSchema = z.object({
  id: z.string().min(1),
  messages: z.array(messageSchema),
});

// An empty object {} means zero matches. There is no next-page field (design.md OQ1).
export const searchThreadsResultSchema = z.object({
  threads: z.array(z.object({ id: z.string().min(1) })).default([]),
  resultCountEstimate: z.string().regex(/^\d+$/).optional(),
});

export type GmailMessage = z.infer<typeof messageSchema>;
export type GetThreadResult = z.infer<typeof getThreadResultSchema>;
export type SearchThreadsResult = z.infer<typeof searchThreadsResultSchema>;

/** Only the issue code and path are kept; zod messages can echo received values. */
export interface SchemaIssue {
  code: string;
  path: (string | number)[];
}

export type ToolJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { kind: 'not-json' | 'schema'; issues: SchemaIssue[] } };

export function parseToolJson<T>(text: string | null, schema: z.ZodType<T>): ToolJsonResult<T> {
  if (text === null) return { ok: false, error: { kind: 'not-json', issues: [] } };
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, error: { kind: 'not-json', issues: [] } };
  }
  const parsed = schema.safeParse(value);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    error: {
      kind: 'schema',
      issues: parsed.error.issues.map((i) => ({
        code: i.code,
        path: i.path.filter((p): p is string | number => typeof p !== 'symbol'),
      })),
    },
  };
}
