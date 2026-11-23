import type { QuillState } from './quill-status';

/** IPC channel carrying Quill's state to the renderer. Mirrored in src/preload/index.ts. */
export const STATUS_CHANNEL = 'quill:status';

/** The subset of Electron's WebContents the forwarder needs. */
export interface WebContentsLike {
  send(channel: string, ...args: unknown[]): void;
  isLoading(): boolean;
  on(event: 'did-finish-load', listener: () => void): unknown;
}

export interface StatusForwarder {
  send(state: QuillState): void;
}

/**
 * Sends Quill's state to the renderer. States set while the page is loading are
 * not lost: the latest one is (re)sent whenever loading finishes.
 */
export function createStatusForwarder(webContents: WebContentsLike): StatusForwarder {
  let latest: QuillState | null = null;

  webContents.on('did-finish-load', () => {
    if (latest !== null) webContents.send(STATUS_CHANNEL, latest);
  });

  return {
    send(state) {
      latest = state;
      if (!webContents.isLoading()) webContents.send(STATUS_CHANNEL, state);
    },
  };
}
