// SQLite storage for one gym (DATA_DIR/gym.db), using Node's built-in node:sqlite: nothing to
// install or administer. The server keeps working on an in-memory copy of the store; save()
// writes only the rows that changed, inside one transaction, so a crash mid-save leaves the
// previous state intact.
import { DatabaseSync } from "node:sqlite";

export interface GymStore {
  members: any[];
  users: any[];
  settings: any;
  lastUpdated: number;
}

export interface SessionRow {
  userId: string;
  expiresAt: number;
}

type Snapshot = Map<string, { position: number; json: string }>;

export class GymDatabase {
  private db: DatabaseSync;
  private saved: { members: Snapshot; users: Snapshot; settings: string; lastUpdated: number } = {
    members: new Map(),
    users: new Map(),
    settings: "",
    lastUpdated: 0,
  };

  constructor(filePath: string) {
    this.db = new DatabaseSync(filePath);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS members (id TEXT PRIMARY KEY, position INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, position INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);
    `);
  }

  isEmpty(): boolean {
    const row = this.db.prepare("SELECT (SELECT COUNT(*) FROM users) + (SELECT COUNT(*) FROM members) AS n").get() as any;
    return Number(row.n) === 0;
  }

  load(): GymStore {
    const read = (table: string, snapshot: Snapshot) => {
      snapshot.clear();
      const rows = this.db.prepare(`SELECT id, position, data FROM ${table} ORDER BY position`).all() as any[];
      return rows.map((r) => {
        snapshot.set(r.id, { position: Number(r.position), json: r.data });
        return JSON.parse(r.data);
      });
    };
    const members = read("members", this.saved.members);
    const users = read("users", this.saved.users);
    const settingsRow = this.db.prepare("SELECT value FROM kv WHERE key = 'settings'").get() as any;
    const updatedRow = this.db.prepare("SELECT value FROM kv WHERE key = 'lastUpdated'").get() as any;
    this.saved.settings = settingsRow?.value || "";
    this.saved.lastUpdated = Number(updatedRow?.value) || 0;
    return {
      members,
      users,
      settings: settingsRow ? JSON.parse(settingsRow.value) : {},
      lastUpdated: this.saved.lastUpdated || Date.now(),
    };
  }

  save(store: GymStore): void {
    const sync = (table: string, items: any[], snapshot: Snapshot) => {
      const upsert = this.db.prepare(
        `INSERT INTO ${table} (id, position, data) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET position = excluded.position, data = excluded.data`
      );
      const remove = this.db.prepare(`DELETE FROM ${table} WHERE id = ?`);
      const next: Snapshot = new Map();
      items.forEach((item, position) => {
        const id = String(item?.id ?? "");
        if (!id || next.has(id)) return; // rows need a unique id
        const json = JSON.stringify(item);
        next.set(id, { position, json });
        const prev = snapshot.get(id);
        if (!prev || prev.json !== json || prev.position !== position) upsert.run(id, position, json);
      });
      for (const id of snapshot.keys()) if (!next.has(id)) remove.run(id);
      return next;
    };

    const setKv = this.db.prepare(
      "INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    );
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const members = sync("members", store.members, this.saved.members);
      const users = sync("users", store.users, this.saved.users);
      const settings = JSON.stringify(store.settings ?? {});
      if (settings !== this.saved.settings) setKv.run("settings", settings);
      if (store.lastUpdated !== this.saved.lastUpdated) setKv.run("lastUpdated", String(store.lastUpdated));
      this.db.exec("COMMIT");
      this.saved = { members, users, settings, lastUpdated: store.lastUpdated };
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  // Sessions
  loadSessions(): Record<string, SessionRow> {
    this.db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
    const result: Record<string, SessionRow> = {};
    for (const r of this.db.prepare("SELECT token, user_id, expires_at FROM sessions").all() as any[]) {
      result[r.token] = { userId: r.user_id, expiresAt: Number(r.expires_at) };
    }
    return result;
  }

  putSession(token: string, session: SessionRow): void {
    this.db.prepare("INSERT OR REPLACE INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
      token,
      session.userId,
      session.expiresAt
    );
  }

  deleteSession(token: string): void {
    this.db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }

  deleteUserSessions(userId: string): void {
    this.db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  }

  // Consistent snapshot of the whole database into a new file (safe while the server runs).
  backupTo(filePath: string): void {
    this.db.exec(`VACUUM INTO '${filePath.replace(/'/g, "''")}'`);
  }
}
