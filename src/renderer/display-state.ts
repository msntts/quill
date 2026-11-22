import { QUILL_STATES, type QuillState } from './quill-assets.js';

export const INITIAL_DISPLAY_STATE: QuillState = 'idle';

/** Applies a status notification; anything that is not a known state is ignored. */
export function resolveDisplayState(current: QuillState, incoming: unknown): QuillState {
  return (QUILL_STATES as readonly unknown[]).includes(incoming) ? (incoming as QuillState) : current;
}
