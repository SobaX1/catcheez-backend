/**
 * Catcheez シードデータ（正本＝フロントの catcheez-mobile.html 由来）。
 * フィクションのプロトタイプ。金額の恒等式 IPO達成額 = 裏付け総額 = カーブ開始時価総額 を保つ。
 *
 * フロント→API フィールド対応: tk→ticker, nm→name, col→color, goal→goalUsdc,
 * pct→pct, left→deadlineText, h→holders, mc→mcap, chg→change24h, bond→bondingPct。
 */

export interface Tier { id: string; name: string; sub: string; price: number; mult: number; color: string; recommended?: boolean; }
export const TIERS: Tier[] = [
  { id: 'silver',  name: 'シルバー',   sub: 'スタンダード参加',   price: 10,  mult: 1,  color: '#9aa3ad' },
  { id: 'gold',    name: 'ゴールド',   sub: '当選確率6倍',       price: 50,  mult: 6,  color: '#ffb300', recommended: true },
  { id: 'rainbow', name: 'レインボー', sub: '最大倍率プレミアム', price: 100, mult: 15, color: '#c46bd6' },
];

// 構成カード10枚テンプレ。idx<5 = ミステリー（残り5日から24hごとに1枚公開）。
export interface CompCard { name: string; grade: string; refValue: string; art: string; }
export const SEED_COMP: CompCard[] = [
  { name: 'Genesis Holo', grade: 'PSA 10',  refValue: '$15,900', art: 'a' },
  { name: 'Eclipse 1st',  grade: 'PSA 10',  refValue: '$3,500',  art: 'c' },
  { name: 'Aurora Prime', grade: 'PSA 9.5', refValue: '$2,800',  art: 'b' },
  { name: 'Nova Promo',   grade: 'PSA 10',  refValue: '$1,200',  art: 'd' },
  { name: 'Halo Rare',    grade: 'PSA 10',  refValue: '$950',    art: 'e' },
  { name: 'Ember Shine',  grade: 'PSA 9',   refValue: '$850',    art: 'a' },
  { name: 'Solar Crest',  grade: 'PSA 10',  refValue: '$450',    art: 'c' },
  { name: 'Lumen Arc',    grade: 'MANA 10', refValue: '$380',    art: 'b' },
  { name: 'Vortex Foil',  grade: 'MANA 10', refValue: '$320',    art: 'd' },
  { name: 'Radiant Base', grade: 'PSA 10',  refValue: '$180',    art: 'e' },
];

// IPO/VAULT（募集中）。raisedUsdc は goalUsdc*pct/100 で算出（恒等式の起点）。
export interface SeedFund {
  ticker: string; name: string; color: string; goalUsdc: number; pct: number;
  minTicket: number; deadlineText: string; durationDays: number; holders: number;
  status: string; cardCount: number; mysteryCount: number;
}
export const SEED_FUNDS: SeedFund[] = [
  { ticker: 'AURUM', name: 'Aurum Genesis Vault', color: '#ffb300', goalUsdc: 240000, pct: 62, minTicket: 20, deadlineText: '残り 2日 18:42', durationDays: 14, holders: 128, status: 'open', cardCount: 10, mysteryCount: 5 },
  { ticker: 'PSAX',  name: 'PSA10 Genesis Box',    color: '#7a6cff', goalUsdc: 180000, pct: 88, minTicket: 15, deadlineText: '残り 5時間 06:11', durationDays: 14, holders: 341, status: 'open', cardCount: 10, mysteryCount: 5 },
];

// LIVE銘柄（発動済み・ボンディングカーブ取引中）。
export interface SeedToken {
  ticker: string; name: string; creator: string; listedText: string; color: string;
  mcap: number; change24h: number; holders: number; bondingPct: number; price: number; graduated: boolean;
}
export const SEED_TOKENS: SeedToken[] = [
  { ticker: 'CHZ',   name: 'Charizard Holo 1st Ed.', creator: '@hiro.sol', listedText: '13時間前', color: '#ff7043', mcap: 51400,  change24h: 9.9, holders: 316, bondingPct: 74, price: 0.162, graduated: false },
  { ticker: 'GEM10', name: 'Gem Mint Reserve',       creator: '@gemmint', listedText: '1日前',    color: '#26a69a', mcap: 120000, change24h: 1.4, holders: 503, bondingPct: 88, price: 0.238, graduated: false },
];

// 抽選結果（VRF）。resData 相当。色は CSS 変数のまま（フロント差し替え容易）。
export const SEED_LOTTERIES: Record<string, any> = {
  AURUM: {
    color: '#ffb300',
    meta: { drawnAt: '2026-06-15 21:00', vrfWinRate: '17.4%', participants: 1842, winnersSlots: '320 / 10種' },
    you: {
      status: 'win',
      ticketNumbers: ['A-0888', 'A-0905*', 'A-0931', 'A-0944'],
      card: { name: '$AURUM 構成カード #03', grade: 'GEM MT 10', refValue: '参考値 $4,200' },
    },
    winners: [
      { no: 'A-0905', tier: 'レインボー', color: 'var(--rainbow)', textColor: '#fff',       holder: '0x9f2c…a41e', card: '#03 GEM MT10', result: 'win',  isMe: true },
      { no: 'A-0102', tier: 'ゴールド',   color: 'var(--accent)',  textColor: 'var(--ink)', holder: '0x44ab…91c2', card: '#07 NM',       result: 'win',  isMe: false },
      { no: 'A-0337', tier: 'ゴールド',   color: 'var(--accent)',  textColor: 'var(--ink)', holder: '@kenta',      card: '#01 NM',       result: 'win',  isMe: false },
      { no: 'B-2210', tier: 'シルバー',   color: '#9aa3ad',        textColor: '#fff',       holder: '0x7d10…3e5f', card: '—',            result: 'lose', isMe: false },
    ],
  },
  PSAX: {
    color: '#7a6cff',
    meta: { drawnAt: '2026-06-12 21:00', vrfWinRate: '21.6%', participants: 2310, winnersSlots: '500 / 8種' },
    you: { status: 'lose', ticketNumbers: ['C-1180*', 'C-1192', 'C-1204'], refund: '$60 返金済み' },
    winners: [
      { no: 'A-0451', tier: 'レインボー', color: 'var(--rainbow)', textColor: '#fff',       holder: '0x12fe…77aa',       card: 'PSA10 #02', result: 'win',  isMe: false },
      { no: 'A-0820', tier: 'ゴールド',   color: 'var(--accent)',  textColor: 'var(--ink)', holder: '@mina',             card: 'PSA10 #05', result: 'win',  isMe: false },
      { no: 'C-1180', tier: 'シルバー',   color: '#9aa3ad',        textColor: '#fff',       holder: '0x88de…1b30 (YOU)', card: '—',         result: 'lose', isMe: true },
    ],
  },
};

// デモユーザーの保有・ウォレット・履歴・チケット。
export const SEED_HOLDINGS = [
  { ticker: 'CHZ',   name: 'Charizard Holo',   amount: 420, valueUsdc: 68, change24h: 9.9, color: '#ff7043' },
  { ticker: 'GEM10', name: 'Gem Mint Reserve', amount: 0,   valueUsdc: 0,  change24h: 1.4, color: '#26a69a' },
];
export const SEED_WALLET = { usdcBalance: 1250.0, cheezBalance: 8400 };
export const SEED_TX = [
  { type: 'チケット購入', detail: 'Aurum Genesis · 12枚', icon: 'buy',    amount: -240, up: false },
  { type: '分配の受取',   detail: 'Neon Rookies 当選',    icon: 'pay',    amount: 680,  up: true },
  { type: '$CHZ 購入',    detail: '308 トークン',         icon: 'buy',    amount: -50,  up: false },
  { type: '返金',         detail: 'Vintage Holo 落選',    icon: 'refund', amount: 120,  up: true },
];
export const SEED_TICKETS = [
  { fundTicker: 'AURUM', tier: 'gold',   qty: 4, entries: 24, paidUsdc: 200, ticketNumbers: ['A-0888', 'A-0905', 'A-0931', 'A-0944'] },
  { fundTicker: 'PSAX',  tier: 'silver', qty: 3, entries: 3,  paidUsdc: 30,  ticketNumbers: ['C-1180', 'C-1192', 'C-1204'] },
];

// シーズンランキング / ガバナンス / エアドロップ
export const SEED_RANKING = [
  { rank: 1, handle: '@gemmint',  points: 18420 },
  { rank: 2, handle: '@hiro.sol', points: 15010 },
  { rank: 3, handle: '@kenta',    points: 12880 },
  { rank: 4, handle: '@mina',     points: 9650 },
  { rank: 5, handle: 'you',       points: 7240, isMe: true },
];
export const SEED_GOVERNANCE = {
  proposalId: 'next-fund-001',
  title: '次に組成するファンドを投票で決定',
  options: [
    { id: 'opt-pikachu',    label: 'Pikachu Illustrator Vault', votes: 4210 },
    { id: 'opt-blacklotus', label: 'Black Lotus Reserve',       votes: 3880 },
    { id: 'opt-jordan',     label: 'Jordan Rookie Box',         votes: 2105 },
  ],
};
