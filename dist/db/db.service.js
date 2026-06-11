"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const sql_js_1 = __importDefault(require("sql.js"));
const schema_1 = require("./schema");
const seed_1 = require("./seed");
/**
 * SQLite(WASM) 永続化レイヤ。DBサーバ不要。データは1ファイルに保存。
 * 書き込み後は save() でファイルへフラッシュ（プロセス再起動後も保持）。
 * PostgreSQL へ移行する際は prisma/schema.prisma を正本に置換。
 */
let DbService = class DbService {
    constructor() {
        this.file = process.env.DATABASE_FILE || path.join(process.cwd(), 'data', 'catcheez.db');
        this.ready = false;
    }
    async onModuleInit() {
        const SQL = await (0, sql_js_1.default)();
        fs.mkdirSync(path.dirname(this.file), { recursive: true });
        this.db = fs.existsSync(this.file) ? new SQL.Database(fs.readFileSync(this.file)) : new SQL.Database();
        this.db.run(schema_1.SCHEMA_SQL);
        this.migrate();
        const seeded = this.get(`SELECT v FROM meta WHERE k='seeded'`);
        if (!seeded) {
            (0, seed_1.seedDatabase)(this);
            this.run(`INSERT INTO meta(k,v) VALUES('seeded', ?)`, [new Date().toISOString()]);
            common_1.Logger.log('Seeded fresh database', 'DbService');
        }
        this.save();
        this.ready = true;
        common_1.Logger.log(`SQLite ready at ${this.file}`, 'DbService');
    }
    /** 軽量マイグレーション（既存DBへ列追加など） */
    migrate() {
        const cols = this.all(`PRAGMA table_info(fund)`).map((c) => c.name);
        if (!cols.includes('draw_at'))
            this.db.run(`ALTER TABLE fund ADD COLUMN draw_at TEXT`);
        if (!cols.includes('onchain_addr'))
            this.db.run(`ALTER TABLE fund ADD COLUMN onchain_addr TEXT`);
    }
    run(sql, params = []) {
        this.db.run(sql, params);
    }
    all(sql, params = []) {
        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step())
            rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
    }
    get(sql, params = []) {
        const rows = this.all(sql, params);
        return rows.length ? rows[0] : null;
    }
    save() {
        try {
            fs.writeFileSync(this.file, Buffer.from(this.db.export()));
        }
        catch (e) {
            common_1.Logger.error('DB save failed: ' + e.message, 'DbService');
        }
    }
};
exports.DbService = DbService;
exports.DbService = DbService = __decorate([
    (0, common_1.Injectable)()
], DbService);
//# sourceMappingURL=db.service.js.map