import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import Database from 'better-sqlite3';

export interface DBPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  isBuiltIn: boolean;
  params: any;
}

export class AppDatabase {
  private db: Database.Database;

  constructor() {
    const userDataPath = app ? app.getPath('userData') : process.cwd();
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    const dbFilePath = path.join(userDataPath, 'broadcast_mic.db');
    console.log(`[SQLite] Initializing database at: ${dbFilePath}`);

    this.db = new Database(dbFilePath);
    this.initTables();
  }

  private initTables() {
    // 1. Presets Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS presets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        badge TEXT,
        description TEXT,
        is_builtin INTEGER NOT NULL DEFAULT 0,
        params_json TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Settings Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    const countRow = this.db.prepare('SELECT COUNT(*) as cnt FROM presets').get() as { cnt: number };
    if (!countRow || countRow.cnt === 0) {
      this.seedDefaults();
    }
  }

  private seedDefaults() {
    const defaultList = [
      {
        id: 'broadcast',
        name: 'Broadcast',
        badge: 'Warm & Tight',
        description: 'Deep, close and controlled. The late-night radio voice.',
        isBuiltIn: true,
        params: {
          preGainDb: 20,
          noiseGate: { enabled: true, thresholdDb: -46, reductionDb: -24, attackMs: 10, releaseMs: 180 },
          eq: { enabled: true, hpfFreq: 75, warmthFreq: 150, warmthGainDb: 5.5, mudFreq: 340, mudGainDb: -4.0, mudQ: 1.6, presenceFreq: 4200, presenceGainDb: 4.5, presenceQ: 1.3, airFreq: 11000, airGainDb: 3.0 },
          compressor: { enabled: true, thresholdDb: -22, ratio: 4.8, attackMs: 10, releaseMs: 160, kneeDb: 14 },
          deEsser: { enabled: true, freq: 6500, reductionDb: -3.5 },
          limiter: { enabled: true, ceilingDb: -1.0 },
          outputGainDb: 0,
        },
      },
      {
        id: 'podcast',
        name: 'Podcast',
        badge: 'Full Body',
        description: 'Rich and even for long-form talk, interviews and narration.',
        isBuiltIn: true,
        params: {
          preGainDb: 18,
          noiseGate: { enabled: true, thresholdDb: -48, reductionDb: -24, attackMs: 12, releaseMs: 180 },
          eq: { enabled: true, hpfFreq: 80, warmthFreq: 160, warmthGainDb: 4.0, mudFreq: 360, mudGainDb: -3.5, mudQ: 1.5, presenceFreq: 3800, presenceGainDb: 5.0, presenceQ: 1.2, airFreq: 10500, airGainDb: 2.5 },
          compressor: { enabled: true, thresholdDb: -24, ratio: 4.0, attackMs: 12, releaseMs: 180, kneeDb: 16 },
          deEsser: { enabled: true, freq: 6500, reductionDb: -3.5 },
          limiter: { enabled: true, ceilingDb: -1.0 },
          outputGainDb: 0,
        },
      },
      {
        id: 'clear',
        name: 'Clear Speech',
        badge: 'Presence',
        description: 'Crisp and intelligible. Tuned for meetings and calls.',
        isBuiltIn: true,
        params: {
          preGainDb: 17,
          noiseGate: { enabled: true, thresholdDb: -44, reductionDb: -24, attackMs: 8, releaseMs: 140 },
          eq: { enabled: true, hpfFreq: 95, warmthFreq: 170, warmthGainDb: 2.0, mudFreq: 390, mudGainDb: -4.5, mudQ: 1.6, presenceFreq: 4400, presenceGainDb: 6.5, presenceQ: 1.4, airFreq: 12000, airGainDb: 3.0 },
          compressor: { enabled: true, thresholdDb: -22, ratio: 3.5, attackMs: 8, releaseMs: 140, kneeDb: 12 },
          deEsser: { enabled: true, freq: 6800, reductionDb: -3.5 },
          limiter: { enabled: true, ceilingDb: -1.0 },
          outputGainDb: 0,
        },
      },
      {
        id: 'condenser',
        name: 'Studio Condenser',
        badge: 'Air & Detail',
        description: 'Open, airy detail with a polished top end.',
        isBuiltIn: true,
        params: {
          preGainDb: 16,
          noiseGate: { enabled: true, thresholdDb: -46, reductionDb: -24, attackMs: 12, releaseMs: 170 },
          eq: { enabled: true, hpfFreq: 70, warmthFreq: 150, warmthGainDb: 2.5, mudFreq: 320, mudGainDb: -3.0, mudQ: 1.5, presenceFreq: 4600, presenceGainDb: 5.0, presenceQ: 1.2, airFreq: 12500, airGainDb: 5.5 },
          compressor: { enabled: true, thresholdDb: -23, ratio: 3.8, attackMs: 14, releaseMs: 170, kneeDb: 14 },
          deEsser: { enabled: true, freq: 6500, reductionDb: -3.5 },
          limiter: { enabled: true, ceilingDb: -1.0 },
          outputGainDb: 0,
        },
      },
      {
        id: 'natural',
        name: 'Natural',
        badge: 'Transparent',
        description: 'Light cleanup only. Still you, just clearer and louder.',
        isBuiltIn: true,
        params: {
          preGainDb: 15,
          noiseGate: { enabled: true, thresholdDb: -50, reductionDb: -16, attackMs: 15, releaseMs: 200 },
          eq: { enabled: true, hpfFreq: 70, warmthFreq: 160, warmthGainDb: 1.0, mudFreq: 350, mudGainDb: -1.5, mudQ: 1.2, presenceFreq: 4000, presenceGainDb: 2.0, presenceQ: 1.0, airFreq: 11000, airGainDb: 1.5 },
          compressor: { enabled: true, thresholdDb: -26, ratio: 2.5, attackMs: 15, releaseMs: 200, kneeDb: 18 },
          deEsser: { enabled: true, freq: 6500, reductionDb: -2.0 },
          limiter: { enabled: true, ceilingDb: -1.0 },
          outputGainDb: 0,
        },
      },
    ];
    for (const p of defaultList) {
      this.savePreset(p);
    }
  }

  public getPresets(): DBPreset[] {
    const rows = this.db.prepare('SELECT id, name, badge, description, is_builtin, params_json FROM presets ORDER BY is_builtin DESC, name ASC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      badge: r.badge || '',
      description: r.description || '',
      isBuiltIn: Boolean(r.is_builtin),
      params: JSON.parse(r.params_json),
    }));
  }

  public savePreset(preset: DBPreset): void {
    const stmt = this.db.prepare(`
      INSERT INTO presets (id, name, badge, description, is_builtin, params_json, updated_at)
      VALUES (@id, @name, @badge, @description, @is_builtin, @params_json, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        badge = excluded.badge,
        description = excluded.description,
        params_json = excluded.params_json,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run({
      id: preset.id,
      name: preset.name,
      badge: preset.badge,
      description: preset.description,
      is_builtin: preset.isBuiltIn ? 1 : 0,
      params_json: JSON.stringify(preset.params),
    });
  }

  public deletePreset(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM presets WHERE id = ? AND is_builtin = 0');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  public getSetting(key: string, defaultValue: string = ''): string {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? row.value : defaultValue;
  }

  public setSetting(key: string, value: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    stmt.run(key, value);
  }

  public getAllSettings(): Record<string, string> {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const res: Record<string, string> = {};
    for (const row of rows) {
      res[row.key] = row.value;
    }
    return res;
  }

  public close() {
    this.db.close();
  }
}
