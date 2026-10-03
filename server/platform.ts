// Platform registry (DATA_DIR/platform.db): which gyms exist, their status, and the
// sessions of the platform administrator (the GymBro operator, not a gym owner).
import { DatabaseSync } from "node:sqlite";

export type TenantStatus = "active" | "suspended";

export interface TenantInfo {
  slug: string;
  name: string;
  status: TenantStatus;
  createdAt: number;
}

export class PlatformDatabase {
  private db: DatabaseSync;
  private tenants = new Map<string, TenantInfo>();

  constructor(filePath: string) {
    this.db = new DatabaseSync(filePath);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS tenants (
        slug TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS admin_sessions (token TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
    `);
    for (const r of this.db.prepare("SELECT slug, name, status, created_at FROM tenants").all() as any[]) {
      this.tenants.set(r.slug, { slug: r.slug, name: r.name, status: r.status, createdAt: Number(r.created_at) });
    }
  }

  listTenants(): TenantInfo[] {
    return [...this.tenants.values()].sort((a, b) => a.createdAt - b.createdAt);
  }

  getTenant(slug: string): TenantInfo | undefined {
    return this.tenants.get(slug);
  }

  addTenant(info: TenantInfo): void {
    this.db
      .prepare("INSERT INTO tenants (slug, name, status, created_at) VALUES (?, ?, ?, ?)")
      .run(info.slug, info.name, info.status, info.createdAt);
    this.tenants.set(info.slug, { ...info });
  }

  updateTenant(slug: string, changes: Partial<Pick<TenantInfo, "name" | "status">>): TenantInfo | undefined {
    const current = this.tenants.get(slug);
    if (!current) return undefined;
    const next = { ...current, ...changes };
    this.db.prepare("UPDATE tenants SET name = ?, status = ? WHERE slug = ?").run(next.name, next.status, slug);
    this.tenants.set(slug, next);
    return next;
  }

  putAdminSession(token: string, expiresAt: number): void {
    this.db.prepare("DELETE FROM admin_sessions WHERE expires_at < ?").run(Date.now());
    this.db.prepare("INSERT INTO admin_sessions (token, expires_at) VALUES (?, ?)").run(token, expiresAt);
  }

  isAdminSession(token: string): boolean {
    const row = this.db.prepare("SELECT expires_at FROM admin_sessions WHERE token = ?").get(token) as any;
    return !!row && Number(row.expires_at) > Date.now();
  }

  deleteAdminSession(token: string): void {
    this.db.prepare("DELETE FROM admin_sessions WHERE token = ?").run(token);
  }
}
