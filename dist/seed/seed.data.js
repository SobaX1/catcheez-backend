"use strict";
/**
 * Catcheez シードデータ（正本＝フロントの catcheez-mobile.html 由来）。
 * フィクションのプロトタイプ。金額の恒等式 IPO達成額 = 裏付け総額 = カーブ開始時価総額 を保つ。
 *
 * フロント→API フィールド対応: tk→ticker, nm→name, col→color, goal→goalUsdc,
 * pct→pct, left→deadlineText, h→holders, mc→mcap, chg→change24h, bond→bondingPct。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEED_GOVERNANCE = exports.SEED_RANKING = exports.SEED_TICKETS = exports.SEED_TX = exports.SEED_WALLET = exports.SEED_HOLDINGS = exports.SEED_LOTTERIES = exports.SEED_TOKENS = exports.SEED_FUNDS = exports.SEED_COMP = exports.TIERS = void 0;
exports.TIERS = [
    { id: 'silver', name: 'シルバー', sub: 'スタンダード参加', price: 10, mult: 1, color: '#9aa3ad' },
    { id: 'gold', name: 'ゴールド', sub: '当選確率6倍', price: 50, mult: 6, color: '#ffb300', recommended: true },
    { id: 'rainbow', name: 'レインボー', sub: '最大倍率プレミアム', price: 100, mult: 15, color: '#c46bd6' },
];
exports.SEED_COMP = [
    { name: 'Pikachu Illustrator', grade: 'PSA 10', refValue: '$5,250,000', art: 'a' },
    { name: '1st Ed. Shadowless Charizard', grade: 'PSA 10', refValue: '$285,000', art: 'c' },
    { name: 'Base Set Blastoise Holo', grade: 'PSA 10', refValue: '$88,000', art: 'b' },
    { name: 'Umbreon Gold Star (POP 5)', grade: 'PSA 10', refValue: '$42,000', art: 'd' },
    { name: 'Base Set Venusaur Holo', grade: 'PSA 10', refValue: '$18,500', art: 'e' },
    { name: '1st Ed. Charizard (Unlimited)', grade: 'PSA 9', refValue: '$9,400', art: 'a' },
    { name: 'Charizard ex Special Art', grade: 'PSA 10', refValue: '$2,100', art: 'c' },
    { name: 'Lugia Neo Genesis Holo', grade: 'PSA 9', refValue: '$1,650', art: 'b' },
    { name: 'Mewtwo Base Set Holo', grade: 'PSA 10', refValue: '$780', art: 'd' },
    { name: 'Eevee Promo Holo', grade: 'PSA 10', refValue: '$320', art: 'e' },
];
exports.SEED_FUNDS = [
    { ticker: 'AURUM', name: 'Aurum Genesis Vault', color: '#ffb300', goalUsdc: 240000, pct: 62, minTicket: 20, deadlineText: '残り 2日 18:42', durationDays: 2, holders: 128, status: 'open', cardCount: 10, mysteryCount: 5 },
    { ticker: 'PSAX', name: 'PSA10 Genesis Box', color: '#7a6cff', goalUsdc: 180000, pct: 88, minTicket: 15, deadlineText: '残り 5時間 06:11', durationDays: 14, holders: 341, status: 'open', cardCount: 10, mysteryCount: 5 },
];
exports.SEED_TOKENS = [
    { ticker: 'CHZ', name: 'Charizard Holo 1st Ed.', creator: '@hiro.sol', listedText: '13時間前', color: '#ff7043', mcap: 51400, change24h: 9.9, holders: 316, bondingPct: 74, price: 0.162, graduated: false },
    { ticker: 'GEM10', name: 'Gem Mint Reserve', creator: '@gemmint', listedText: '1日前', color: '#26a69a', mcap: 120000, change24h: 1.4, holders: 503, bondingPct: 88, price: 0.238, graduated: false },
];
// 抽選結果（VRF）。resData 相当。色は CSS 変数のまま（フロント差し替え容易）。
exports.SEED_LOTTERIES = {
    AURUM: {
        color: '#ffb300',
        meta: { drawnAt: '2026-06-15 21:00', vrfWinRate: '17.4%', participants: 1842, winnersSlots: '320 / 10種' },
        you: {
            status: 'win',
            ticketNumbers: ['A-0888', 'A-0905*', 'A-0931', 'A-0944'],
            card: { name: '$AURUM 構成カード #03', grade: 'GEM MT 10', refValue: '参考値 $4,200' },
        },
        winners: [
            { no: 'A-0905', tier: 'レインボー', color: 'var(--rainbow)', textColor: '#fff', holder: '0x9f2c…a41e', card: '#03 GEM MT10', result: 'win', isMe: true },
            { no: 'A-0102', tier: 'ゴールド', color: 'var(--accent)', textColor: 'var(--ink)', holder: '0x44ab…91c2', card: '#07 NM', result: 'win', isMe: false },
            { no: 'A-0337', tier: 'ゴールド', color: 'var(--accent)', textColor: 'var(--ink)', holder: '@kenta', card: '#01 NM', result: 'win', isMe: false },
            { no: 'B-2210', tier: 'シルバー', color: '#9aa3ad', textColor: '#fff', holder: '0x7d10…3e5f', card: '—', result: 'lose', isMe: false },
        ],
    },
    PSAX: {
        color: '#7a6cff',
        meta: { drawnAt: '2026-06-12 21:00', vrfWinRate: '21.6%', participants: 2310, winnersSlots: '500 / 8種' },
        you: { status: 'lose', ticketNumbers: ['C-1180*', 'C-1192', 'C-1204'], refund: '$60 返金済み' },
        winners: [
            { no: 'A-0451', tier: 'レインボー', color: 'var(--rainbow)', textColor: '#fff', holder: '0x12fe…77aa', card: 'PSA10 #02', result: 'win', isMe: false },
            { no: 'A-0820', tier: 'ゴールド', color: 'var(--accent)', textColor: 'var(--ink)', holder: '@mina', card: 'PSA10 #05', result: 'win', isMe: false },
            { no: 'C-1180', tier: 'シルバー', color: '#9aa3ad', textColor: '#fff', holder: '0x88de…1b30 (YOU)', card: '—', result: 'lose', isMe: true },
        ],
    },
};
// デモユーザーの保有・ウォレット・履歴・チケット。
exports.SEED_HOLDINGS = [
    { ticker: 'CHZ', name: 'Charizard Holo', amount: 420, valueUsdc: 68, change24h: 9.9, color: '#ff7043' },
    { ticker: 'GEM10', name: 'Gem Mint Reserve', amount: 0, valueUsdc: 0, change24h: 1.4, color: '#26a69a' },
];
exports.SEED_WALLET = { usdcBalance: 1250.0, cheezBalance: 8400 };
exports.SEED_TX = [
    { type: 'チケット購入', detail: 'Aurum Genesis · 12枚', icon: 'buy', amount: -240, up: false },
    { type: '分配の受取', detail: 'Neon Rookies 当選', icon: 'pay', amount: 680, up: true },
    { type: '$CHZ 購入', detail: '308 トークン', icon: 'buy', amount: -50, up: false },
    { type: '返金', detail: 'Vintage Holo 落選', icon: 'refund', amount: 120, up: true },
];
exports.SEED_TICKETS = [
    { fundTicker: 'AURUM', tier: 'gold', qty: 4, entries: 24, paidUsdc: 200, ticketNumbers: ['A-0888', 'A-0905', 'A-0931', 'A-0944'] },
    { fundTicker: 'PSAX', tier: 'silver', qty: 3, entries: 3, paidUsdc: 30, ticketNumbers: ['C-1180', 'C-1192', 'C-1204'] },
];
// シーズンランキング / ガバナンス / エアドロップ
exports.SEED_RANKING = [
    { rank: 1, handle: '@gemmint', points: 18420 },
    { rank: 2, handle: '@hiro.sol', points: 15010 },
    { rank: 3, handle: '@kenta', points: 12880 },
    { rank: 4, handle: '@mina', points: 9650 },
    { rank: 5, handle: 'you', points: 7240, isMe: true },
];
exports.SEED_GOVERNANCE = {
    proposalId: 'next-fund-001',
    title: '次に組成するファンドを投票で決定',
    options: [
        { id: 'opt-pikachu', label: 'Pikachu Illustrator Vault', votes: 4210 },
        { id: 'opt-blacklotus', label: 'Black Lotus Reserve', votes: 3880 },
        { id: 'opt-jordan', label: 'Jordan Rookie Box', votes: 2105 },
    ],
};
//# sourceMappingURL=seed.data.js.map