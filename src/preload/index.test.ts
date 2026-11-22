import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STATUS_CHANNEL as MAIN_STATUS_CHANNEL } from '../main/status/status-forwarder';

type Listener = (event: unknown, ...args: unknown[]) => void;

const exposed: Record<string, unknown> = {};
const listeners = new Map<string, Listener[]>();

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: (key: string, api: unknown) => (exposed[key] = api) },
  ipcRenderer: {
    on: (channel: string, listener: Listener) => listeners.set(channel, [...(listeners.get(channel) ?? []), listener]),
  },
}));

describe('preload', () => {
  beforeEach(async () => {
    vi.resetModules();
    for (const key of Object.keys(exposed)) delete exposed[key];
    listeners.clear();
    await import('./index');
  });

  it('exposes only quill.onStatus to the renderer', () => {
    expect(Object.keys(exposed)).toEqual(['quill']);
    expect(Object.keys(exposed['quill'] as object)).toEqual(['onStatus']);
  });

  it('passes status notifications to the callback without the IPC event', () => {
    const received: unknown[] = [];
    (exposed['quill'] as { onStatus: (cb: (s: unknown) => void) => void }).onStatus((s) => received.push(s));

    for (const listener of listeners.get(MAIN_STATUS_CHANNEL) ?? []) listener({ sender: 'ipc-event' }, 'fetching');

    expect(received).toEqual(['fetching']);
  });
});
