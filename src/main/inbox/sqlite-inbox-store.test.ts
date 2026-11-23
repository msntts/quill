import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { InboxMessage } from './inbox-store';
import { SqliteInboxStore } from './sqlite-inbox-store';

function message(overrides: Partial<InboxMessage> = {}): InboxMessage {
  return {
    externalId: 'm-1',
    threadId: 't-1',
    sender: 'alice@example.com',
    subject: 'Subject 1',
    receivedAt: 1_700_000_000_000,
    body: 'Body 1',
    ...overrides,
  };
}

describe('SqliteInboxStore', () => {
  let store: SqliteInboxStore;

  beforeEach(() => {
    store = SqliteInboxStore.open(':memory:');
  });

  afterEach(() => {
    store.close();
  });

  it('MI-01 新しいメッセージを保存する', () => {
    const msg = message();

    const inserted = store.saveBatch('gmail', [msg], { cursorAt: 1_700_000_100_000, fetchedAt: 1_700_000_200_000 });

    expect(inserted).toBe(1);
    expect(store.listMessages('gmail')).toEqual([
      { source: 'gmail', ...msg, fetchedAt: 1_700_000_200_000 },
    ]);
  });

  it('MI-02 同じメッセージを2回受け取る', () => {
    const msg = message();
    const opts = { cursorAt: 1_700_000_100_000, fetchedAt: 1_700_000_200_000 };

    const first = store.saveBatch('gmail', [msg], opts);
    const second = store.saveBatch('gmail', [msg], opts);

    expect(first).toBe(1);
    expect(second).toBe(0);
    expect(store.listMessages('gmail')).toHaveLength(1);
  });

  it('MI-03 重ね取りで同じメッセージが再び届く', () => {
    const overlapped = message({ externalId: 'm-1' });
    store.saveBatch('gmail', [overlapped], { cursorAt: 1_000, fetchedAt: 1_000 });

    const inserted = store.saveBatch('gmail', [overlapped, message({ externalId: 'm-2', body: 'Edited' })], {
      cursorAt: 2_000,
      fetchedAt: 2_000,
    });

    expect(inserted).toBe(1);
    const stored = store.listMessages('gmail');
    expect(stored.map((m) => m.externalId)).toEqual(['m-1', 'm-2']);
    // The already-stored row keeps its original content.
    expect(stored[0]?.fetchedAt).toBe(1_000);
  });

  it('MI-04 取得元が違えば別のメッセージとして扱う', () => {
    const msg = message({ externalId: 'same-id' });
    const opts = { cursorAt: 1_000, fetchedAt: 1_000 };

    store.saveBatch('gmail', [msg], opts);
    store.saveBatch('slack', [msg], opts);

    expect(store.listMessages('gmail')).toHaveLength(1);
    expect(store.listMessages('slack')).toHaveLength(1);
  });

  it('FC-07 前提: カーソルがないときは null を返す', () => {
    expect(store.getCursor('gmail')).toBeNull();
  });

  it('saveBatch で保存したカーソルを読み出せる', () => {
    store.saveBatch('gmail', [], { cursorAt: 1_234, fetchedAt: 1_234 });

    expect(store.getCursor('gmail')).toBe(1_234);
    expect(store.getCursor('slack')).toBeNull();
  });

  it('MI-05 保存の途中で失敗する', () => {
    store.saveBatch('gmail', [], { cursorAt: 1_000, fetchedAt: 1_000 });
    // An object cannot be bound by SQLite, so the second row throws after the first was written.
    const broken = { ...message({ externalId: 'm-2' }), body: {} as unknown as string };

    expect(() =>
      store.saveBatch('gmail', [message({ externalId: 'm-1' }), broken], { cursorAt: 2_000, fetchedAt: 2_000 }),
    ).toThrow();

    expect(store.listMessages('gmail')).toEqual([]);
    expect(store.getCursor('gmail')).toBe(1_000);
  });
});
