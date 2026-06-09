import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import initSqlJs, { Database } from 'sql.js';
import { SCHEMA_SQL } from './schema';
import { seedDatabase } from './seed';

/**
 * SQLite(WASM) 永続化レイヤ。DBサーバ不要。データは1ファイルに保存。
 * 書き込み後は save() でファイルへフラッシュ（プロセス再起動後も保持）。
 * PostgreSQL へ移行する際は prisma/schema.prisma を正本に置換。
 */
@Injectable()
export class DbService implements OnModuleInit {
  private db!: Database;
  private file = process.env.DATABASE_FILE || path.join(process.cwd(), 'data', 'catcheez.db');
  private ready = false;

  async onModuleInit() {
    const SQL = await initSqlJs();
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    this.db = fs.existsSync(this.file) ? new SQL.Database(fs.readFileSync(this.file)) : new SQL.Database();
    this.db.run(SCHEMA_SQL);
    this.migrate();
    const seeded = this.get(`SELECT v FROM meta WHERE k='seeded'`);
    if (!seeded) {
      seedDatabase(this);
      this.run(`INSERT INTO meta(k,v) VALUES('seeded', ?)`, [new Date().toISOString()]);
      Logger.log('Seeded fresh database', 'DbService');
    }
    this.save();
    this.ready = true;
    Logger.log(`SQLite ready at ${this.file}`, 'DbService');
  }

  /** 軽量マイグレーション（既存DBへ列追加など） */
  private migrate() {
    const cols = this.all(`PRAGMA table_info(fund)`).map((c: any) => c.name);
    if (!cols.includes('draw_at')) this.db.run(`ALTER TABLE fund ADD COLUMN draw_at TEXT`);
    if (!cols.includes('onchain_addr')) this.db.run(`ALTER TABLE fund ADD COLUMN onchain_addr TEXT`);
  }

  run(sql: string, params: any[] = []) {
    this.db.run(sql, params as any);
  }
  all(sql: string, params: any[] = []): any[] {
    const stmt = this.db.prepare(sql);
    stmt.bind(params as any);
    const rows: any[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }
  get(sql: string, params: any[] = []): any {
    const rows = this.all(sql, params);
    return rows.length ? rows[0] : null;
  }
  save() {
    try {
      fs.writeFileSync(this.file, Buffer.from(this.db.export()));
    } catch (e) {
      Logger.error('DB save failed: ' + (e as Error).message, 'DbService');
    }
  }
}
