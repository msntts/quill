export const QUILL_STATES = ['idle', 'fetching', 'triaging', 'todo', 'unsure', 'error'] as const;

export type QuillState = (typeof QUILL_STATES)[number];

export function assetFileFor(state: QuillState): string {
  return `quill-${state}.svg`;
}
