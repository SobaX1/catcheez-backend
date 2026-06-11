# 修正: 起動ハングの根本原因（IndexerService）

## 原因
IndexerService.onModuleInit が起動時に Solana RPC への初期同期を await しており、
RPC が応答しない場合に app.listen() へ到達できず「No open ports detected」で
デプロイが失敗していました（ScanController のルートは正しくマッピング済みでした）。

## 修正
src/indexer/indexer.service.ts:
初期同期（syncFundsFromChain / indexRecentSignatures）を20秒タイムアウト付きの
バックグラウンド実行に変更。RPC不調でも起動は続行し、以後は30秒ポーリングが拾う。

## 適用
cd ~/catcheez-backend-clean
unzip -o ~/Downloads/catcheez-p2e-step2c.zip -d .
git add -A
git commit -m "fix: non-blocking initial chain sync in indexer (unblocks boot)"
git push

## 確認（Renderログ）
SQLite ready → [ScanService] P2E schema ready → Catcheez M1 mock API → Live
（initial chain sync deferred の警告が出てもOK）

curl https://catcheez-backend.onrender.com/api/points
curl -X POST https://catcheez-backend.onrender.com/api/scan -H "Content-Type: application/json" -d '{"demo":true}'
