// Must match QUILL_STATES in src/renderer/quill-assets.ts (checked by a test).
export const QUILL_STATES = ['idle', 'fetching', 'triaging', 'todo', 'unsure', 'error'] as const;

export type QuillState = (typeof QUILL_STATES)[number];

export type FetchEvent =
  | { type: 'fetch-started' }
  | { type: 'fetch-succeeded'; newCount: number }
  | { type: 'fetch-failed' };

/**
 * Decides Quill's state after a fetch event. The current state is taken so
 * later events (triage, todos) can depend on it; fetch events do not yet.
 */
export function nextQuillState(_current: QuillState, event: FetchEvent): QuillState {
  switch (event.type) {
    case 'fetch-started':
      return 'fetching';
    case 'fetch-failed':
      return 'error';
    case 'fetch-succeeded':
      // No triage yet, so new messages do not change what Quill shows.
      return 'idle';
  }
}
