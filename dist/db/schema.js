"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHEMA_SQL = void 0;
// Catcheez M2 — SQLite スキーマ（sql.js / WASM）。
// チェーン移行時は prisma/schema.prisma(PostgreSQL) が正本。ここは M2 ランタイム用。
exports.SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS app_user (
  id         TEXT PRIMARY KEY,
  wallet     TEXT UNIQUE NOT NULL,
  handle     TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS wallet (
  user_id TEXT PRIMARY KEY,
  usdc    REAL NOT NULL DEFAULT 0,
  cheez   REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS fund (
  ticker        TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  color         TEXT,
  goal_usdc     REAL NOT NULL,
  raised_usdc   REAL NOT NULL DEFAULT 0,
  pct           REAL NOT NULL DEFAULT 0,
  min_ticket    REAL NOT NULL DEFAULT 0,
  deadline      TEXT,
  deadline_text TEXT,
  duration_days INTEGER,
  holders       INTEGER DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'open',
  card_count    INTEGER DEFAULT 0,
  mystery_count INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS fund_card (
  fund_ticker TEXT NOT NULL,
  idx         INTEGER NOT NULL,
  name        TEXT,
  grade       TEXT,
  ref_value   TEXT,
  art         TEXT,
  is_mystery  INTEGER DEFAULT 0,
  reveal_at   TEXT,
  PRIMARY KEY (fund_ticker, idx)
);
CREATE TABLE IF NOT EXISTS token (
  ticker      TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  creator     TEXT,
  listed_text TEXT,
  color       TEXT,
  mcap        REAL DEFAULT 0,
  change24h   REAL DEFAULT 0,
  holders     INTEGER DEFAULT 0,
  bonding_pct REAL DEFAULT 0,
  price       REAL DEFAULT 0,
  graduated   INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS ticket (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL,
  fund_ticker    TEXT NOT NULL,
  tier           TEXT NOT NULL,
  qty            INTEGER NOT NULL,
  entries        INTEGER NOT NULL,
  paid_usdc      REAL NOT NULL,
  ticket_numbers TEXT,
  is_nft         INTEGER DEFAULT 1,
  created_at     TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS holding (
  user_id      TEXT NOT NULL,
  token_ticker TEXT NOT NULL,
  name         TEXT,
  color        TEXT,
  amount       REAL NOT NULL DEFAULT 0,
  change24h    REAL DEFAULT 0,
  PRIMARY KEY (user_id, token_ticker)
);
CREATE TABLE IF NOT EXISTS trade (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  token_ticker TEXT NOT NULL,
  side         TEXT NOT NULL,
  amount       REAL NOT NULL,
  price        REAL NOT NULL,
  fee          REAL NOT NULL,
  tx_sig       TEXT,
  created_at   TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS txn (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  type       TEXT,
  detail     TEXT,
  icon       TEXT,
  amount     REAL,
  up         INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lottery (
  fund_ticker TEXT PRIMARY KEY,
  proof_json  TEXT,
  result_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS gov_option (
  id          TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  label       TEXT NOT NULL,
  votes       INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS gov_vote (
  proposal_id TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  option_id   TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (proposal_id, user_id)
);
CREATE TABLE IF NOT EXISTS point (
  season  TEXT NOT NULL,
  user_id TEXT NOT NULL,
  handle  TEXT,
  points  INTEGER DEFAULT 0,
  is_me   INTEGER DEFAULT 0,
  PRIMARY KEY (season, user_id)
);
CREATE TABLE IF NOT EXISTS auth_nonce (
  wallet    TEXT PRIMARY KEY,
  nonce     TEXT NOT NULL,
  issued_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS meta (
  k TEXT PRIMARY KEY,
  v TEXT
);
CREATE TABLE IF NOT EXISTS winner (
  fund_ticker TEXT NOT NULL,
  owner       TEXT NOT NULL,
  entries     INTEGER NOT NULL,
  proof_json  TEXT NOT NULL,
  root_hex    TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (fund_ticker, owner)
);
`;
//# sourceMappingURL=schema.js.map