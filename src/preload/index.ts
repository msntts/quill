// Sandboxed preloads can only require 'electron' (not local files), so the
// whole bridge lives in this one file.
import { contextBridge, ipcRenderer } from 'electron';

/** Mirrors STATUS_CHANNEL in src/main/status/status-forwarder.ts (checked by a test). */
const STATUS_CHANNEL = 'quill:status';

interface BridgeLike {
  exposeInMainWorld(key: string, api: unknown): void;
}

interface IpcLike {
  on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): unknown;
}

export interface QuillApi {
  onStatus(callback: (state: unknown) => void): void;
}

export function exposeQuillApi(bridge: BridgeLike, ipc: IpcLike): void {
  const api: QuillApi = {
    // The IPC event object is not passed on; the renderer only sees the state value.
    onStatus: (callback) => {
      ipc.on(STATUS_CHANNEL, (_event, state) => callback(state));
    },
  };
  bridge.exposeInMainWorld('quill', api);
}

exposeQuillApi(contextBridge, ipcRenderer);
