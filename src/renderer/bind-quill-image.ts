import { INITIAL_DISPLAY_STATE, resolveDisplayState } from './display-state.js';
import { assetFileFor, type QuillState } from './quill-assets.js';

interface ImageLike {
  src: string;
  alt: string;
}

/** Shows Quill's image for each status notification, starting from idle. */
export function bindQuillImage(onStatus: (callback: (state: unknown) => void) => void, img: ImageLike): void {
  let current: QuillState = INITIAL_DISPLAY_STATE;
  const show = (state: QuillState) => {
    img.src = `states/${assetFileFor(state)}`;
    img.alt = state;
  };

  show(current);
  onStatus((incoming) => {
    const next = resolveDisplayState(current, incoming);
    if (next === current) return;
    current = next;
    show(current);
  });
}
