# Catcheez Backend — M2（SQLite 永続化 ＋ ed25519 本認証）

> **フィクションのプロトタイプです**（実在の金融商品ではありません）。
> M1（モックAPI）を、**データ永続化**と**本物の Sign-In with Solana** に進めた段階。
> DB サーバは不要 — SQLite(WASM) を1ファイルに保存します。`npm install && npm run build && npm start` だけで動きます。

## M1 からの変更点
- **永続化**: in-memory → SQLite(WASM, `sql.js`)。データは `data/catcheez.db` に保存され、**再起動後も保持**。
- **本認証**: 署名検証スタブ → `tweetnacl` による **ed25519 署名検証**。`/auth/verify` は正しい署名のみ受理し JWT を発行。
- **マルチユーザー**: 残高・保有・チケット・取引・投票が**ユーザー単位**で永続化。`Authorization: Bearer <jwt>` で識別。
- 後方互換: トークン無しのリクエストは **demo-user**（M1 のシードデータ所有者）にフォールバック。M1 接続済みフロントは認証無しでもそのまま動作。

## クイックスタート
```bash
npm install        # ネイティブビルド不要（sql.js は WASM）
npm run build
npm start          # → http://localhost:4000/api （初回起動でDBをシード）

# 動作確認（サーバ起動中に別ターミナルで）
npm run smoke      # 全エンドポイント＋本物のサインイン＋偽署名拒否＋永続状態を検証
npm run signin     # ed25519 鍵を生成し nonce→署名→verify→JWT を実演
```

データを初期化したいときは DB ファイルを消すだけ:
```bash
rm -f data/catcheez.db   # 次回起動で再シード
```

## 認証フロー（Sign-In with Solana）
1. `POST /auth/nonce { wallet }` → `{ nonce, message }` を取得（wallet は base58 の公開鍵）。
2. ウォレットの秘密鍵で **message に ed25519 署名**。
3. `POST /auth/verify { wallet, signature, nonce }`（signature は base58）→ 検証成功で `{ token, user }`。
   - 検証は `tweetnacl.sign.detached.verify` による本物の署名検証。失敗は 401。
   - nonce は使い捨て＋10分TTL。
   - 新規ウォレットは初回サインイン時にユーザー作成＋**フォーセット 500 USDC** を付与（プロト用）。
4. 以降は `Authorization: Bearer <token>` を付けて `/me/*` や `apply` / `trade` / `vote` を呼ぶと、そのユーザーの状態に作用。

フロント側は Phantom の `signMessage` で 2 を行い、3 の戻り JWT を保存 → 以後のリクエストに付与、という流れになります（M3 でフロントに組込み予定）。

## エンドポイント（プレフィックス `/api`）
M1 と同一。認証関連と「誰の状態か」が変わっただけで**契約は不変**:
- `POST /auth/nonce` `POST /auth/verify`（signature/nonce 必須に）
- `GET /funds` `/funds/:t` `/funds/:t/cards` `/funds/:t/schedule` `/funds/:t/lottery`
- `POST /funds/:t/apply`（要 Bearer 推奨。無しなら demo-user）`POST /funds/:t/draw`
- `GET /tokens` `/tokens/:t` `/tokens/:t/candles` `/tokens/:t/holders` `POST /tokens/:t/trade`
- `GET /me/portfolio` `/me/wallet` `/me/holdings` `/me/tickets` `/me/results` `/me/transactions`
- `GET /ranking` `/governance` `POST /governance/vote`

## データモデル
- 実装 DDL: `src/db/schema.ts`（SQLite）。テーブル: app_user / wallet / fund / fund_card / token / ticket / holding / trade / txn / lottery / gov_option / gov_vote / point / auth_nonce / meta。
- 将来の **PostgreSQL 移行ターゲット**: `prisma/schema.prisma`（型・enum・リレーション付き。M3+ でチェーン連携と合わせて採用）。

## 不変ルール（メモより）
- 金額の恒等式 **IPO達成額 = 裏付け総額 = カーブ開始時価総額** を維持（`raised_usdc` を正とする）。
- VRF結果は**改変不能・検証可能**（現状は擬似VRF＋プルーフ。M3 で Switchboard 実装）。

## スケジューラ / 締切判定（M4）
インプロセスのスケジューラ（`@nestjs/schedule`、Redis 不要）が周期 tick で次を処理します:
- **時限公開**: ミステリーカードは `reveal_at` 到来で確定公開（`is_mystery=0`）。
- **締切判定**: 募集締切を過ぎたファンドは、**達成 → `locked`（+72h で `draw_at` 設定）／未達 → `refunded`（全チケットを全額返金し各ユーザーの USDC に戻す）**。
- **自動抽選**: `locked` かつ `draw_at` 到来で擬似VRF抽選を実行 → `distributed`（プルーフを記録）。

実行間隔は `SCHED_INTERVAL_MS`（既定 15000ms）。

### プロトタイプ用 admin（締切を決定的にテスト）
`ALLOW_ADMIN=false` で無効化（本番必須）。
- `POST /admin/tick` — スケジューラを即時実行し処理結果を返す
- `POST /admin/funds/:t/expire { meetGoal? }` — 締切を過去に（meetGoal で達成/未達を指定）
- `POST /admin/funds/:t/force-draw-due` — 抽選期日を過去に（自動抽選を誘発）
- `POST /admin/funds/:t/reveal/:idx` — 指定カードの公開時刻を過去に

検証: `npm run test:scheduler`（返金・ロック・自動抽選・時限公開を確認、全 PASS）。

## オンチェーン indexer（C）
Anchor プログラム（別リポジトリ `catcheez-anchor`）の `emit!` イベントを購読し DB を同期します。
- 有効化: `SOLANA_RPC` + `PROGRAM_ID` + `CATCHEEZ_IDL`（IDL の json パス）を設定し、`npm i @coral-xyz/anchor`。
- 未設定なら idle（ログのみ）。読み取りは引き続き API、書き込みは段階的に on-chain Tx へ。
- 対応イベント → DB: `FundInitialized`(addr↔ticker マッピング/goal), `TicketBought`(raised/pct), `Settled`(status), `Drawn`(randomness を proof に/ distributed), `WinnersRootPosted`(merkleRoot), `Claimed`(返金/当選を履歴に)。
- 反映ロジックはチェーン非依存の純粋関数（`src/indexer/event-apply.ts`）。
- 検証: `npm run test:indexer`（合成イベントを `POST /admin/indexer/event` で投入し DB 反映を確認、全 PASS）。

## マイルストーン
- **M1**: モックAPI（完了）。
- **M2（このリリース）**: SQLite 永続化 ＋ ed25519 本認証 ＋ マルチユーザー（完了・検証済み）。
- **M3**: 擬似VRF → Switchboard VRF。エスクロー/抽選/配布を Anchor でオンチェーン化（案A→B の第一歩）。
- **M4（このリリース）**: 締切判定（達成ロック/未達返金）・時限公開・自動抽選（インプロセス・検証済み）。
- **M5**: セカンダリ（Jupiter/Magic Eden）・物理カード償還・エアドロップ。

## 注意
- CORS は全許可（M2）。本番ではオリジン制限へ。
- `sql.js` は単一プロセス前提（last-write-wins でファイル保存）。水平スケール時は PostgreSQL（prisma スキーマ）へ移行。
- 検証: `npm run build`（型チェック）＋ `npm run smoke`（23 チェック：本物の署名・偽署名拒否・永続化）。
