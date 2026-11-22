import { describe, expect, it } from 'vitest';
import { createStatusForwarder, STATUS_CHANNEL } from './status-forwarder';

class FakeWebContents {
  readonly sent: unknown[][] = [];
  loading = true;
  private finishListeners: (() => void)[] = [];

  send(channel: string, ...args: unknown[]) {
    this.sent.push([channel, ...args]);
  }

  isLoading() {
    return this.loading;
  }

  on(event: 'did-finish-load', listener: () => void) {
    if (event === 'did-finish-load') this.finishListeners.push(listener);
  }

  finishLoad() {
    this.loading = false;
    this.finishListeners.forEach((l) => l());
  }
}

describe('createStatusForwarder', () => {
  it('sends the state on the quill:status channel once loaded', () => {
    const wc = new FakeWebContents();
    wc.loading = false;
    const forwarder = createStatusForwarder(wc);

    forwarder.send('fetching');

    expect(wc.sent).toEqual([[STATUS_CHANNEL, 'fetching']]);
    expect(STATUS_CHANNEL).toBe('quill:status');
  });

  it('holds states sent before load and delivers only the latest when loading finishes', () => {
    const wc = new FakeWebContents();
    const forwarder = createStatusForwarder(wc);

    forwarder.send('fetching');
    forwarder.send('error');
    expect(wc.sent).toEqual([]);

    wc.finishLoad();

    expect(wc.sent).toEqual([[STATUS_CHANNEL, 'error']]);
  });

  it('re-sends the latest state after a reload', () => {
    const wc = new FakeWebContents();
    wc.loading = false;
    const forwarder = createStatusForwarder(wc);
    forwarder.send('idle');

    wc.finishLoad();

    expect(wc.sent).toEqual([
      [STATUS_CHANNEL, 'idle'],
      [STATUS_CHANNEL, 'idle'],
    ]);
  });

  it('sends nothing on load when no state was set yet', () => {
    const wc = new FakeWebContents();
    createStatusForwarder(wc);

    wc.finishLoad();

    expect(wc.sent).toEqual([]);
  });
});
