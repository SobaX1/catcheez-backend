# P2E Step2 適用手順 — POST /api/scan (mock) + フロント接続切替

前提: Step1 適用済み（未適用ならこの zip だけで Step1+2 両方入ります）

## バックエンド変更内容
- src/scan/scan.service.ts: scan() 追加（spec §3〜§5 のmock実装）
  - エナジー上限(402 ENERGY_EXHAUSTED) / 間隔制限(429 RATE_LIMITED, 既定3秒)
  - レアリティ重み付き抽選 → 4ランク判定(G>P>R>N) → 重複×0.2 → 連続ボーナス
  - scans / user_cards / ledger(scanとstreak_bonusは別行) / state に記録
  - SCAN_MODE=mock 既定。liveは503を返す（Step3で実装）
- src/scan/scan.controller.ts: POST /api/scan 追加（JSON {demo:true} を受理、画像不要）
- src/scan/scan.schema.ts: 既定値追加（scan_min_interval_sec=3 ※specは15。p2e_configで変更可）

## 適用手順
1. src/ をリポジトリに上書き → git push → Renderデプロイ
2. 確認:
```
curl -X POST https://catcheez-backend.onrender.com/api/scan \
  -H "Content-Type: application/json" -d '{"demo":true}'
→ {"scan_id":"scn_...","card":{...},"reward":{"rank":"N","total_czp":7,...},"energy":{...}}
```
3. 連打すると {"error":{"code":"RATE_LIMITED",...}}、11回目で ENERGY_EXHAUSTED

## フロント (catcheez-mobile-v42.html)
- 起動時に GET /points + /collection + /ledger を取得（p2eSync）。
  成功なら p2eLive=true でサーバ正本、失敗なら従来のローカルモックに自動フォールバック。
- スキャン時は演出と並行して POST /api/scan を実行し、演出終了後に結果を表示。
  CZPボール演出・カウントアップは balance_after 基準で動作。
- 402/429/接続失敗はアラート表示（エナジー消費なし）。
- 接続先は既存の window.CATCHEEZ_API（1行目の script タグ）をそのまま使用。
