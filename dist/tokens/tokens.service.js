"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokensService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const db_service_1 = require("../db/db.service");
const candles_util_1 = require("../seed/candles.util");
const FEE = 0.01; // 取引手数料 1%（mock）
const round2 = (x) => Math.round(x * 100) / 100;
const round6 = (x) => Math.round(x * 1e6) / 1e6;
let TokensService = class TokensService {
    constructor(db) {
        this.db = db;
    }
    mapToken(t) {
        return {
            ticker: t.ticker, name: t.name, creator: t.creator, listedText: t.listed_text, color: t.color,
            mcap: t.mcap, change24h: t.change24h, holders: t.holders, bondingPct: t.bonding_pct,
            price: t.price, graduated: !!t.graduated,
        };
    }
    list() {
        return { tokens: this.db.all(`SELECT * FROM token ORDER BY rowid`).map((t) => this.mapToken(t)) };
    }
    detail(ticker) {
        return this.mapToken(this.requireToken(ticker));
    }
    candles(ticker, tf = '1h') {
        const t = this.requireToken(ticker);
        return { ticker: t.ticker, timeframe: tf, candles: (0, candles_util_1.seedCandles)(t.price, t.change24h >= 0) };
    }
    holders(ticker) {
        const t = this.requireToken(ticker);
        const top = [
            { handle: t.creator, amount: Math.round((t.mcap * 0.12) / t.price), pct: 12.0 },
            { handle: '0x9f2c…a41e', amount: Math.round((t.mcap * 0.08) / t.price), pct: 8.0 },
            { handle: '@kenta', amount: Math.round((t.mcap * 0.05) / t.price), pct: 5.0 },
        ];
        return { ticker: t.ticker, totalHolders: t.holders, top };
    }
    trade(ticker, side, amount, userId) {
        const t = this.requireToken(ticker);
        if (!['buy', 'sell'].includes(side))
            throw new common_1.BadRequestException('side は buy / sell');
        if (!(amount > 0))
            throw new common_1.BadRequestException('amount は正の数');
        const w = this.db.get(`SELECT usdc, cheez FROM wallet WHERE user_id=?`, [userId]) || { usdc: 0, cheez: 0 };
        let hold = this.db.get(`SELECT * FROM holding WHERE user_id=? AND token_ticker=?`, [userId, t.ticker]);
        const gross = amount * t.price;
        const fee = round2(gross * FEE);
        let newPrice = t.price, newUsdc = w.usdc, newAmount = hold ? hold.amount : 0, newHolders = t.holders;
        if (side === 'buy') {
            const cost = round2(gross + fee);
            if (w.usdc < cost)
                throw new common_1.BadRequestException(`USDC残高不足（必要 $${cost}）`);
            newUsdc = round2(w.usdc - cost);
            newAmount += amount;
            newPrice = round6(t.price * (1 + Math.min(0.25, amount / 5000)));
            if (!hold)
                newHolders += 1;
            this.recordTxn(userId, `${t.ticker} 購入`, `${amount} トークン`, 'buy', -cost, false);
        }
        else {
            if (!hold || hold.amount < amount)
                throw new common_1.BadRequestException(`保有不足（保有 ${hold ? hold.amount : 0}）`);
            const proceeds = round2(gross - fee);
            newUsdc = round2(w.usdc + proceeds);
            newAmount -= amount;
            newPrice = round6(t.price * (1 - Math.min(0.25, amount / 5000)));
            this.recordTxn(userId, `${t.ticker} 売却`, `${amount} トークン`, 'sell', proceeds, true);
        }
        // holding upsert
        if (hold)
            this.db.run(`UPDATE holding SET amount=? WHERE user_id=? AND token_ticker=?`, [newAmount, userId, t.ticker]);
        else
            this.db.run(`INSERT INTO holding(user_id,token_ticker,name,color,amount,change24h) VALUES(?,?,?,?,?,?)`, [userId, t.ticker, t.name, t.color, newAmount, t.change24h]);
        this.db.run(`UPDATE wallet SET usdc=? WHERE user_id=?`, [newUsdc, userId]);
        const newMcap = Math.round(t.mcap + (side === 'buy' ? gross : -gross));
        const bonding = Math.min(100, Math.round((newMcap / (newMcap + 30000)) * 100));
        const graduated = bonding >= 100 ? 1 : (t.graduated ? 1 : 0);
        this.db.run(`UPDATE token SET price=?, mcap=?, bonding_pct=?, holders=?, graduated=? WHERE ticker=?`, [newPrice, newMcap, bonding, newHolders, graduated, t.ticker]);
        this.db.run(`INSERT INTO trade(id,user_id,token_ticker,side,amount,price,fee,tx_sig,created_at) VALUES(?,?,?,?,?,?,?,?,?)`, [(0, crypto_1.randomUUID)(), userId, t.ticker, side, amount, newPrice, fee, (0, crypto_1.randomUUID)().replace(/-/g, ''), new Date().toISOString()]);
        this.db.save();
        return {
            fill: { ticker: t.ticker, side, amount, price: newPrice, gross: round2(gross), fee },
            token: this.mapToken(this.requireToken(ticker)),
            holding: { ticker: t.ticker, amount: newAmount, valueUsdc: round2(newAmount * newPrice) },
            wallet: { usdcBalance: newUsdc, cheezBalance: w.cheez },
        };
    }
    recordTxn(userId, type, detail, icon, amount, up) {
        this.db.run(`INSERT INTO txn(id,user_id,type,detail,icon,amount,up,created_at) VALUES(?,?,?,?,?,?,?,?)`, [(0, crypto_1.randomUUID)(), userId, type, detail, icon, amount, up ? 1 : 0, new Date().toISOString()]);
    }
    requireToken(ticker) {
        const t = this.db.get(`SELECT * FROM token WHERE ticker=? COLLATE NOCASE`, [ticker]);
        if (!t)
            throw new common_1.NotFoundException(`銘柄が見つかりません: ${ticker}`);
        return t;
    }
};
exports.TokensService = TokensService;
exports.TokensService = TokensService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_service_1.DbService])
], TokensService);
//# sourceMappingURL=tokens.service.js.map