import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import Database from 'better-sqlite3';

// Local storage for profiles and app settings, in the user data folder. Profiles are stored whole
// as JSON so every field the app adds (shortcut, rule, EQ bands …) survives a restart. Built-in
// profiles are only stored when the user has changed them.
export class AppDatabase {
  private db: Database.Database;

  constructor() {
    const dir = app.getPath('userData');
    fs.mkdirSync(dir, { recursive: true });
    this.db = new Database(path.join(dir, 'aurel.db'));
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS prefs (
        key TEXT PRIMARY KEY,
        json TEXT NOT NULL
      );
    `);
  }

  listProfiles(): unknown[] {
    const rows = this.db.prepare('SELECT json FROM profiles ORDER BY updated_at').all() as { json: string }[];
    const out: unknown[] = [];
    for (const r of rows) {
      try {
        out.push(JSON.parse(r.json));
      } catch {
        /* skip a corrupt row */
      }
    }
    return out;
  }

  saveProfile(profile: unknown): boolean {
    if (!profile || typeof profile !== 'object' || typeof (profile as { id?: unknown }).id !== 'string') return false;
    const json = JSON.stringify(profile);
    if (json.length > 256 * 1024) return false;
    this.db
      .prepare('INSERT INTO profiles (id, json, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at')
      .run((profile as { id: string }).id, json, Date.now());
    return true;
  }

  deleteProfile(id: string): boolean {
    return this.db.prepare('DELETE FROM profiles WHERE id = ?').run(String(id)).changes > 0;
  }

  getPrefs(): unknown | null {
    const row = this.db.prepare("SELECT json FROM prefs WHERE key = 'app'").get() as { json: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.json);
    } catch {
      return null;
    }
  }

  savePrefs(prefs: unknown): boolean {
    const json = JSON.stringify(prefs ?? null);
    if (json.length > 1024 * 1024) return false;
    this.db.prepare("INSERT INTO prefs (key, json) VALUES ('app', ?) ON CONFLICT(key) DO UPDATE SET json = excluded.json").run(json);
    return true;
  }

  close(): void {
    this.db.close();
  }
}
