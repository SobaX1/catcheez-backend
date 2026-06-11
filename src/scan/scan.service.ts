import { HttpException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { P2E_SCHEMA_SQL, P2E_DEFAULTS, P2E_MOCK_CARDS } from './scan.schema';
import { TIERS } from '../seed/seed.data';
import { randomUUID } from 'crypto';

/**
 * Photo to Earn (P2E) — Step1: DDL適用 + GET /api/points / /api/collection（モックデータ）
 * spec: catcheez-scan-api-spec.md
 */
@Injectable()
export class ScanService implements OnModuleInit {
  constructor(private readonly db: DbService) {}

  private schemaReady = false;

  onModuleInit() {
    // 起動を絶対にブロックしない（失敗しても初回リクエスト時に ensureSchema で再試行）
    try { this.ensureSchema(); } catch (e: any) {
      Logger.warn('P2E schema init deferred: ' + (e?.message || e), 'ScanService');
    }
  }

  /** DDL適用＋マスタ投入（冪等・遅延初期化）。各エンドポイント先頭から呼ばれる。 */
  private ensureSchema() {
    if (this.schemaReady) return;
    // DbService.run は params 付きで sql.js の prepare 経路に入るため
    // 複数文を一括実行できない。文単位に分割して適用する。
    for (const stmt of P2E_SCHEMA_SQL.split(';')) {
      if (stmt.trim()) this.db.run(stmt);
    }
    this.seedMockMaster();
    this.db.save?.();
    this.schemaReady = true;
    Logger.log('P2E schema ready', 'ScanService');
  }

  /** モックのカードマスタを冪等投入 */
  private seedMockMaster() {
    const now = new Date().toISOString();
    for (const c of P2E_MOCK_CARDS) {
      this.db.run(
        `INSERT OR IGNORE INTO p2e_card_master
         (card_id, game, name_ja, set_code, set_name, card_number, rarity, price_jpy, source, created_at)
         VALUES (?,?,?,?,?,?,?,?,'mock',?)`,
        [c.card_id, c.game, c.name_ja, c.set_code, c.set_name, c.card_number, c.rarity, c.price_jpy, now],
      );
    }
  }

  /** p2e_config → 既定値の順で設定値を取得 */
  cfg<T = any>(key: string): T {
    const row = this.db.get(`SELECT v FROM p2e_config WHERE k=?`, [key]);
    if (row?.v != null) { try { return JSON.parse(row.v); } catch { return row.v as T; } }
    return P2E_DEFAULTS[key] as T;
  }

  /** JST基準の日付文字列 YYYY-MM-DD */
  private jstDay(d = new Date()): string {
    return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  }

  /** 次のJST 0:00 (UTC 15:00) */
  private nextJstMidnight(): string {
    const now = new Date();
    const r = new Date(now);
    r.setUTCHours(15, 0, 0, 0);
    if (r <= now) r.setUTCDate(r.getUTCDate() + 1);
    return r.toISOString();
  }

  private balance(userId: string): number {
    const row = this.db.get(
      `SELECT balance_after AS b FROM p2e_ledger WHERE user_id=? ORDER BY id DESC LIMIT 1`, [userId]);
    return row?.b ?? 0;
  }

  /** GET /api/points */
  points(userId: string) {
    this.ensureSchema();
    const energyMax = this.cfg<number>('energy_max');
    const today = this.jstDay();
    const used = this.db.get(
      `SELECT COUNT(*) AS n FROM p2e_scan
       WHERE user_id=? AND status='completed' AND substr(datetime(created_at, '+9 hours'),1,10)=?`,
      [userId, today],
    )?.n ?? 0;
    const st = this.db.get(`SELECT streak_days, last_scan_day FROM p2e_state WHERE user_id=?`, [userId]);
    const dexOwned = this.db.get(`SELECT COUNT(*) AS n FROM p2e_user_card WHERE user_id=?`, [userId])?.n ?? 0;
    const dexTotal = this.db.get(`SELECT COUNT(*) AS n FROM p2e_card_master`)?.n ?? 0;
    return {
      czp_balance: this.balance(userId),
      energy: { remaining: Math.max(0, energyMax - used), max: energyMax, resets_at: this.nextJstMidnight() },
      streak_days: st?.streak_days ?? 0,
      dex: { owned: dexOwned, total: dexTotal },
      rate_czp_per_usdc: this.cfg<number>('czp_per_usdc'),
    };
  }

  /** GET /api/points/ledger */
  ledger(userId: string, limit = 30) {
    this.ensureSchema();
    const rows = this.db.all(
      `SELECT l.id, l.scan_id, l.kind, l.amount, l.balance_after, l.created_at,
              s.card_id, s.rank, m.name_ja, m.rarity
         FROM p2e_ledger l
         LEFT JOIN p2e_scan s ON s.id = l.scan_id
         LEFT JOIN p2e_card_master m ON m.card_id = s.card_id
        WHERE l.user_id=? ORDER BY l.id DESC LIMIT ?`,
      [userId, Math.min(Math.max(1, limit), 100)],
    );
    return { entries: rows };
  }

  /** GET /api/collection — マスタ全件＋所持状況（未所持は locked 表示用） */
  collection(userId: string) {
    this.ensureSchema();
    const rows = this.db.all(
      `SELECT m.card_id, m.game, m.name_ja, m.set_code, m.set_name, m.card_number, m.rarity, m.price_jpy,
              COALESCE(u.count, 0) AS owned_count, u.first_scan
         FROM p2e_card_master m
         LEFT JOIN p2e_user_card u ON u.card_id = m.card_id AND u.user_id = ?
        ORDER BY m.game, m.card_id`,
      [userId],
    );
    const games: Record<string, { total: number; owned: number }> = {};
    for (const r of rows) {
      games[r.game] = games[r.game] || { total: 0, owned: 0 };
      games[r.game].total += 1;
      if (r.owned_count > 0) games[r.game].owned += 1;
    }
    return { cards: rows, sets: games };
  }

  /** デモ用シード（任意・冪等）: demo-user に2枚所持＋台帳を作る */
  seedDemo(userId: string) {
    this.ensureSchema();
    if (this.db.get(`SELECT 1 AS x FROM p2e_ledger WHERE user_id=? LIMIT 1`, [userId])) return { seeded: false };
    const now = new Date().toISOString();
    const grant = (scanId: string, cardId: string, rank: string, czp: number, bal: number) => {
      this.db.run(
        `INSERT INTO p2e_scan (id, user_id, card_id, status, rank, czp_awarded, created_at)
         VALUES (?,?,?,?,?,?,?)`, [scanId, userId, cardId, 'completed', rank, czp, now]);
      this.db.run(
        `INSERT OR REPLACE INTO p2e_user_card (user_id, card_id, count, first_scan)
         VALUES (?,?,COALESCE((SELECT count FROM p2e_user_card WHERE user_id=? AND card_id=?),0)+1,?)`,
        [userId, cardId, userId, cardId, now]);
      this.db.run(
        `INSERT INTO p2e_ledger (user_id, scan_id, kind, amount, balance_after, created_at)
         VALUES (?,?,?,?,?,?)`, [userId, scanId, 'scan', czp, bal, now]);
    };
    grant('scn_demo_1', 'pkm-sv2a-001', 'N', 5, 5);
    grant('scn_demo_2', 'op-op01-006', 'P', 240, 245);
    this.db.save?.();
    return { seeded: true };
  }

  private err(status: number, code: string, message: string): never {
    throw new HttpException({ error: { code, message } }, status);
  }

  /** 本日(JST)の completed スキャン数 */
  private usedToday(userId: string): number {
    return this.db.get(
      `SELECT COUNT(*) AS n FROM p2e_scan
       WHERE user_id=? AND status='completed' AND substr(datetime(created_at, '+9 hours'),1,10)=?`,
      [userId, this.jstDay()],
    )?.n ?? 0;
  }

  /** dHash(64bit): 9x8グレースケールの隣接画素比較。16進16文字を返す */
  private async dhash(imageB64: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Jimp = require('jimp');
    const buf = Buffer.from(imageB64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const img = await Jimp.read(buf);
    img.resize(9, 8).grayscale();
    let bits = '';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const a = Jimp.intToRGBA(img.getPixelColor(x, y)).r;
      const b = Jimp.intToRGBA(img.getPixelColor(x + 1, y)).r;
      bits += a < b ? '1' : '0';
    }
    return BigInt('0b' + bits).toString(16).padStart(16, '0');
  }

  private hamming(aHex: string, bHex: string): number {
    let x = BigInt('0x' + aHex) ^ BigInt('0x' + bHex);
    let n = 0;
    while (x) { n += Number(x & 1n); x >>= 1n; }
    return n;
  }

  /** POST /api/scan — SCAN_MODE=mock: 画像は使わずモック判定（spec §3〜§5） */
  async scan(userId: string, _demo: boolean, imageB64?: string) {
    this.ensureSchema();
    const mode = process.env.SCAN_MODE || 'mock';
    if (mode !== 'mock') this.err(503, 'RECOGNITION_UNAVAILABLE', 'live モードは未実装です（Step3で対応）');

    const energyMax = this.cfg<number>('energy_max');
    const used = this.usedToday(userId);
    if (used >= energyMax) this.err(402, 'ENERGY_EXHAUSTED', 'エナジーが切れました。毎日0時(JST)に全回復します');

    const minInt = this.cfg<number>('scan_min_interval_sec');
    const last = this.db.get(
      `SELECT created_at FROM p2e_scan WHERE user_id=? AND status='completed' ORDER BY created_at DESC LIMIT 1`,
      [userId]);
    if (last && Date.now() - Date.parse(last.created_at) < minInt * 1000)
      this.err(429, 'RATE_LIMITED', 'スキャン間隔が短すぎます');

    // --- pHash重複検知（実カメラ撮影時のみ。デモスキャンは画像なし） ---
    let phash: string | null = null;
    if (imageB64) {
      try { phash = await this.dhash(imageB64); }
      catch { this.err(422, 'CARD_NOT_DETECTED', '画像を読み取れませんでした。撮り直してください'); }
      const maxDist = this.cfg<number>('phash_hamming_max');
      const days = this.cfg<number>('phash_window_days');
      const since = new Date(Date.now() - days * 864e5).toISOString();
      const rows = this.db.all(
        `SELECT phash FROM p2e_scan WHERE user_id=? AND phash IS NOT NULL AND created_at>=? ORDER BY created_at DESC LIMIT 400`,
        [userId, since]);
      for (const r of rows) {
        if (this.hamming(phash!, r.phash) <= maxDist)
          this.err(409, 'DUPLICATE_IMAGE', '同じ写真は使用できません。カードを撮り直してください');
      }
    }

    // --- モック判定: レアリティ重み付き抽選 → カード選択 ---
    const weights = this.cfg<Record<string, number>>('rarity_weights');
    let total = 0; for (const k of Object.keys(weights)) total += weights[k];
    let x = Math.random() * total; let rarity = 'C';
    for (const k of Object.keys(weights)) { x -= weights[k]; if (x <= 0) { rarity = k; break; } }
    const card = this.db.get(
      `SELECT * FROM p2e_card_master WHERE rarity=? ORDER BY RANDOM() LIMIT 1`, [rarity]);
    if (!card) this.err(422, 'CARD_NOT_IDENTIFIED', 'カードを特定できませんでした');

    const isHighRarity = ['SR', 'SAR', 'UR'].includes(card.rarity);
    const graded = isHighRarity && Math.random() < this.cfg<number>('grade_chance');
    const certNumber = graded ? String(80000000 + Math.floor(Math.random() * 9999999)) : null;

    // --- ランク判定（G > P > R > N）---
    const rankG = this.cfg<any>('rank_g'), rankP = this.cfg<any>('rank_p');
    let rank = 'N'; let base = this.cfg<number>('rank_n_czp');
    if (graded) { rank = 'G'; base = Math.max(rankG.min, Math.round(card.price_jpy * rankG.pct)); }
    else if (card.price_jpy >= rankP.threshold) { rank = 'P'; base = Math.round(card.price_jpy * rankP.pct); }
    else if (isHighRarity) { rank = 'R'; base = this.cfg<number>('rank_r_czp'); }
    const rankName = ({ G: '鑑定ランク', P: '販売価格ランク', R: 'レアランク', N: 'ノーマルランク' } as any)[rank];

    // --- 重複補正 ---
    const ownedRow = this.db.get(
      `SELECT count FROM p2e_user_card WHERE user_id=? AND card_id=?`, [userId, card.card_id]);
    const dup = !!ownedRow;
    const pts = dup ? Math.max(1, Math.round(base * this.cfg<number>('dup_rate'))) : base;

    // --- 連続ボーナス（その日の初回のみ）---
    const today = this.jstDay();
    const st = this.db.get(`SELECT streak_days, last_scan_day FROM p2e_state WHERE user_id=?`, [userId]);
    let streak = st?.streak_days ?? 0; let streakBonus = 0;
    if (st?.last_scan_day !== today) {
      const yest = this.jstDay(new Date(Date.now() - 864e5));
      streak = st?.last_scan_day === yest ? streak + 1 : 1;
      streakBonus = Math.min(streak, this.cfg<number>('streak_cap')) * this.cfg<number>('streak_unit');
    }
    const totalCzp = pts + streakBonus;

    // --- 記録（scans / user_cards / ledger / state）---
    const now = new Date().toISOString();
    const scanId = 'scn_' + now.replace(/\D/g, '').slice(0, 14) + '_' + Math.random().toString(36).slice(2, 8);
    this.db.run(
      `INSERT INTO p2e_scan (id, user_id, card_id, status, phash, is_slab, grading_co, grade, cert_number, cert_verified,
        price_jpy, price_source, rank, czp_awarded, flags, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [scanId, userId, card.card_id, 'completed', phash, graded ? 1 : 0, graded ? 'PSA' : null, graded ? '10' : null,
       certNumber, graded ? 1 : null, card.price_jpy, 'mock', rank, totalCzp, '[]', now]);
    this.db.run(
      `INSERT INTO p2e_user_card (user_id, card_id, count, first_scan) VALUES (?,?,1,?)
       ON CONFLICT(user_id, card_id) DO UPDATE SET count = count + 1`,
      [userId, card.card_id, now]);
    let bal = this.balance(userId) + pts;
    this.db.run(
      `INSERT INTO p2e_ledger (user_id, scan_id, kind, amount, balance_after, created_at) VALUES (?,?,?,?,?,?)`,
      [userId, scanId, 'scan', pts, bal, now]);
    if (streakBonus > 0) {
      bal += streakBonus;
      this.db.run(
        `INSERT INTO p2e_ledger (user_id, scan_id, kind, amount, balance_after, created_at) VALUES (?,?,?,?,?,?)`,
        [userId, scanId, 'streak_bonus', streakBonus, bal, now]);
    }
    this.db.run(
      `INSERT INTO p2e_state (user_id, streak_days, last_scan_day) VALUES (?,?,?)
       ON CONFLICT(user_id) DO UPDATE SET streak_days=?, last_scan_day=?`,
      [userId, streak, today, streak, today]);
    this.db.save?.();

    const ownedCount = (ownedRow?.count ?? 0) + 1;
    return {
      scan_id: scanId,
      status: 'completed',
      card: {
        card_id: card.card_id, game: card.game, name_ja: card.name_ja,
        set_name: card.set_name, set_code: card.set_code, card_number: card.card_number,
        rarity: card.rarity, language: 'ja',
        is_new_to_dex: !dup, owned_count: ownedCount,
      },
      grading: graded
        ? { is_slab: true, company: 'PSA', grade: '10', cert_number: certNumber, cert_verified: true }
        : { is_slab: false },
      market: { price_jpy: card.price_jpy, source: 'mock', as_of: now },
      reward: {
        rank, rank_name: rankName, base_czp: pts,
        duplicate_applied: dup, streak_bonus: streakBonus,
        total_czp: totalCzp, balance_after: bal,
      },
      energy: { remaining: Math.max(0, energyMax - used - 1), max: energyMax, resets_at: this.nextJstMidnight() },
    };
  }

  /** POST /api/points/redeem — CZPでIPOチケットを交換（現金・USDCは動かさない） */
  redeem(userId: string, ticker: string, tierId: string, qty: number) {
    this.ensureSchema();
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) this.err(422, 'INVALID_QTY', 'qty は1〜99の整数');
    const f = this.db.get(`SELECT * FROM fund WHERE ticker=?`, [String(ticker || '').toUpperCase()]);
    if (!f) this.err(422, 'FUND_NOT_FOUND', '指定のファンドが見つかりません');
    if (f.status !== 'open') this.err(422, 'FUND_CLOSED', `ファンドは募集中ではありません（status=${f.status}）`);
    const tier = TIERS.find((t) => t.id === tierId);
    if (!tier) this.err(422, 'INVALID_TIER', `不明なティア: ${tierId}`);

    const rate = this.cfg<number>('czp_per_usdc');
    const costCzp = qty * tier.price * rate;
    const bal = this.balance(userId);
    if (bal < costCzp) this.err(402, 'INSUFFICIENT_CZP', `CZP残高不足（必要 ${costCzp} / 残高 ${bal}）`);

    const entries = qty * tier.mult;
    const prefix = f.ticker[0];
    const ticketNumbers = Array.from({ length: qty }, () => `${prefix}-${Math.floor(1000 + Math.random() * 8999)}`);
    const now = new Date().toISOString();
    const newBal = bal - costCzp;

    // チケット発行（既存と同形式。paid_usdc にはUSDC換算額を記録、資金調達額には加算しない）
    this.db.run(
      `INSERT INTO ticket(id,user_id,fund_ticker,tier,qty,entries,paid_usdc,ticket_numbers,is_nft,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`,
      [randomUUID(), userId, f.ticker, tierId, qty, entries, qty * tier.price, JSON.stringify(ticketNumbers), 1, now]);
    // CZP台帳（消費はマイナス）
    this.db.run(
      `INSERT INTO p2e_ledger (user_id, scan_id, kind, amount, balance_after, created_at) VALUES (?,?,?,?,?,?)`,
      [userId, null, 'redeem', -costCzp, newBal, now]);
    // 取引履歴（アカウント画面用。USDCは動いていないので amount=0）
    this.db.run(
      `INSERT INTO txn(id,user_id,type,detail,icon,amount,up,created_at) VALUES(?,?,?,?,?,?,?,?)`,
      [randomUUID(), userId, 'チケット交換', `${f.name} · ${qty}枚（-${costCzp.toLocaleString()} CZP）`, 'buy', 0, 0, now]);
    this.db.save?.();

    return {
      redeemed: { fund_ticker: f.ticker, fund_name: f.name, tier: tierId, tier_name: tier.name, qty, entries, ticket_numbers: ticketNumbers },
      cost_czp: costCzp,
      rate_czp_per_usdc: rate,
      czp_balance: newBal,
    };
  }
}

