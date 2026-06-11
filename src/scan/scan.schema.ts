// Photo to Earn (P2E) — SQLite スキーマ。spec: catcheez-scan-api-spec.md §6 のSQLite版。
// PostgreSQL 移行時は prisma/schema.prisma を正本に置換。
export const P2E_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS p2e_card_master (
  card_id     TEXT PRIMARY KEY,
  game        TEXT NOT NULL,
  name_ja     TEXT,
  set_code    TEXT,
  set_name    TEXT,
  card_number TEXT,
  rarity      TEXT,
  price_jpy   INTEGER,
  source      TEXT NOT NULL DEFAULT 'mock',
  created_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS p2e_scan (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  card_id       TEXT,
  status        TEXT NOT NULL,
  phash         TEXT,
  is_slab       INTEGER NOT NULL DEFAULT 0,
  grading_co    TEXT,
  grade         TEXT,
  cert_number   TEXT,
  cert_verified INTEGER,
  price_jpy     INTEGER,
  price_source  TEXT,
  rank          TEXT,
  czp_awarded   INTEGER NOT NULL DEFAULT 0,
  flags         TEXT NOT NULL DEFAULT '[]',
  raw_response  TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS p2e_scan_user ON p2e_scan (user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS p2e_user_card (
  user_id    TEXT NOT NULL,
  card_id    TEXT NOT NULL,
  count      INTEGER NOT NULL DEFAULT 1,
  first_scan TEXT NOT NULL,
  PRIMARY KEY (user_id, card_id)
);
CREATE TABLE IF NOT EXISTS p2e_ledger (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT NOT NULL,
  scan_id       TEXT,
  kind          TEXT NOT NULL,
  amount        INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS p2e_ledger_user ON p2e_ledger (user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS p2e_state (
  user_id       TEXT PRIMARY KEY,
  streak_days   INTEGER NOT NULL DEFAULT 0,
  last_scan_day TEXT
);
CREATE TABLE IF NOT EXISTS p2e_config (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
`;

// 付与ランク等の既定値（p2e_config 未設定時のフォールバック）
export const P2E_DEFAULTS: Record<string, any> = {
  energy_max: 10,
  dup_rate: 0.2,
  rank_g: { pct: 0.05, min: 300 },
  rank_p: { pct: 0.02, threshold: 10000 },
  rank_r_czp: 50,
  rank_n_czp: 5,
  streak_unit: 2,
  streak_cap: 7,
  scan_min_interval_sec: 3, // デモ向け短縮値（spec既定は15。p2e_configで上書き可）
  grade_chance: 0.06,
  rarity_weights: { C: 42, R: 26, RR: 16, SR: 9, SAR: 5, UR: 2 },
  czp_per_usdc: 100, // 交換レート: 100 CZP = $1（IPOチケット交換用）
  phash_hamming_max: 8,  // これ以下のハミング距離は同一画像とみなす
  phash_window_days: 30, // 重複判定の対象期間
};

// モックのカードマスタ（フロント v41 の P2E_DB と同一）
export const P2E_MOCK_CARDS = [
  { card_id: 'pkm-sv2a-001', game: 'pokemon',  name_ja: 'ピカチュウ',          set_code: 'SV2a', set_name: 'ポケモンカード151', card_number: '025/165', rarity: 'C',   price_jpy: 50 },
  { card_id: 'pkm-sv2a-002', game: 'pokemon',  name_ja: 'イーブイ',            set_code: 'SV2a', set_name: 'ポケモンカード151', card_number: '133/165', rarity: 'C',   price_jpy: 80 },
  { card_id: 'pkm-sv2a-003', game: 'pokemon',  name_ja: 'ゲンガー',            set_code: 'SV2a', set_name: 'ポケモンカード151', card_number: '094/165', rarity: 'R',   price_jpy: 300 },
  { card_id: 'pkm-sv2a-004', game: 'pokemon',  name_ja: 'ミュウツー ex',        set_code: 'SV2a', set_name: 'ポケモンカード151', card_number: '150/165', rarity: 'RR',  price_jpy: 800 },
  { card_id: 'pkm-sv3-005',  game: 'pokemon',  name_ja: 'リザードン ex',        set_code: 'SV3',  set_name: '黒炎の支配者',     card_number: '125/108', rarity: 'SR',  price_jpy: 4500 },
  { card_id: 'pkm-sv2d-006', game: 'pokemon',  name_ja: 'ナンジャモ',          set_code: 'SV2D', set_name: 'クレイバースト',   card_number: '091/071', rarity: 'SAR', price_jpy: 28000 },
  { card_id: 'pkm-sv2a-007', game: 'pokemon',  name_ja: 'ミュウ ex',            set_code: 'SV2a', set_name: 'ポケモンカード151', card_number: '205/165', rarity: 'UR',  price_jpy: 9000 },
  { card_id: 'op-op01-001',  game: 'onepiece', name_ja: 'ロロノア・ゾロ',       set_code: 'OP01', set_name: 'ROMANCE DAWN',    card_number: 'OP01-025', rarity: 'C',   price_jpy: 30 },
  { card_id: 'op-op01-002',  game: 'onepiece', name_ja: 'ナミ',                set_code: 'OP01', set_name: 'ROMANCE DAWN',    card_number: 'OP01-016', rarity: 'R',   price_jpy: 250 },
  { card_id: 'op-op02-003',  game: 'onepiece', name_ja: 'トラファルガー・ロー', set_code: 'OP02', set_name: '頂上決戦',         card_number: 'OP02-035', rarity: 'RR',  price_jpy: 600 },
  { card_id: 'op-op05-004',  game: 'onepiece', name_ja: 'モンキー・D・ルフィ',  set_code: 'OP05', set_name: '新時代の主役',     card_number: 'OP05-119', rarity: 'SR',  price_jpy: 3800 },
  { card_id: 'op-op02-005',  game: 'onepiece', name_ja: 'ボア・ハンコック',     set_code: 'OP02', set_name: '頂上決戦',         card_number: 'OP02-118', rarity: 'SAR', price_jpy: 15000 },
  { card_id: 'op-op01-006',  game: 'onepiece', name_ja: 'シャンクス',          set_code: 'OP01', set_name: 'ROMANCE DAWN',    card_number: 'OP01-120', rarity: 'UR',  price_jpy: 12000 },
];
