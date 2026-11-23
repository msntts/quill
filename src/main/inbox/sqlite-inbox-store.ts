import Database from 'better-sqlite3';
import type { InboxMessage, InboxStore, SaveBatchOptions, StoredMessage } from './inbox-store';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS messages (
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  subject TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  body TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  PRIMARY KEY (source, external_id)
);
CREATE TABLE IF NOT EXISTS cursors (
  source TEXT PRIMARY KEY,
  cursor_at INTEGER NOT NULL
);
`;

interface MessageRow {
  source: string;
  external_id: string;
  thread_id: string;
  sender: string;
  subject: string;
  received_at: number;
  body: string;
  fetched_at: number;
}

export class SqliteInboxStore implements InboxStore {
  private readonly insertMessage: Database.Statement;
  private readonly upsertCursor: Database.Statement;
  private readonly selectCursor: Database.Statement;
  private readonly saveTx: (source: string, messages: readonly InboxMessage[], options: SaveBatchOptions) => number;

  private constructor(private readonly db: Database.Database) {
    this.insertMessage = db.prepare(
      `INSERT OR IGNORE INTO messages (source, external_id, thread_id, sender, subject, received_at, body, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    this.upsertCursor = db.prepare(
      `INSERT INTO cursors (source, cursor_at) VALUES (?, ?)
       ON CONFLICT (source) DO UPDATE SET cursor_at = excluded.cursor_at`,
    );
    this.selectCursor = db.prepare('SELECT cursor_at FROM cursors WHERE source = ?');
    // Messages and cursor commit together or not at all.
    this.saveTx = db.transaction((source: string, messages: readonly InboxMessage[], options: SaveBatchOptions) => {
      let inserted = 0;
      for (const m of messages) {
        inserted += this.insertMessage.run(
          source, m.externalId, m.threadId, m.sender, m.subject, m.receivedAt, m.body, options.fetchedAt,
        ).changes;
      }
      this.upsertCursor.run(source, options.cursorAt);
      return inserted;
    });
  }

  static open(file: string): SqliteInboxStore {
    const db = new Database(file);
    db.pragma('journal_mode = WAL');
    db.exec(SCHEMA);
    return new SqliteInboxStore(db);
  }

  getCursor(source: string): number | null {
    const row = this.selectCursor.get(source) as { cursor_at: number } | undefined;
    return row ? row.cursor_at : null;
  }

  saveBatch(source: string, messages: readonly InboxMessage[], options: SaveBatchOptions): number {
    return this.saveTx(source, messages, options);
  }

  /** Reads stored messages of a source, oldest first. */
  listMessages(source: string): StoredMessage[] {
    const rows = this.db
      .prepare('SELECT * FROM messages WHERE source = ? ORDER BY received_at, external_id')
      .all(source) as MessageRow[];
    return rows.map((r) => ({
      source: r.source,
      externalId: r.external_id,
      threadId: r.thread_id,
      sender: r.sender,
      subject: r.subject,
      receivedAt: r.received_at,
      body: r.body,
      fetchedAt: r.fetched_at,
    }));
  }

  close(): void {
    this.db.close();
  }
}
