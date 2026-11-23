/** A message as handed over by a source. Times are UNIX milliseconds. */
export interface InboxMessage {
  externalId: string;
  threadId: string;
  sender: string;
  subject: string;
  receivedAt: number;
  body: string;
}

export interface StoredMessage extends InboxMessage {
  source: string;
  fetchedAt: number;
}

export interface SaveBatchOptions {
  /** New cursor for the source, stored together with the messages. */
  cursorAt: number;
  fetchedAt: number;
}

export interface InboxStore {
  /** Returns the source's cursor (UNIX ms), or null before the first successful fetch. */
  getCursor(source: string): number | null;
  /**
   * Saves one fetch's messages and advances the source's cursor atomically.
   * Returns how many messages were newly inserted.
   */
  saveBatch(source: string, messages: readonly InboxMessage[], options: SaveBatchOptions): number;
  close(): void;
}
