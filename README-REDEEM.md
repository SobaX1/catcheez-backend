# CZP消費: IPOチケット交換 (POST /api/points/redeem)

## 追加内容（src/scan/ のみ変更。app.module等は変更なし）
- POST /api/points/redeem {ticker, tier, qty}
  - レート: p2e_config 'czp_per_usdc'（既定100 = 100CZPで$1相当）
  - cost = qty × tier.price × rate（tierは既存TIERS: silver$10/gold$50/rainbow$100）
  - 残高不足: 402 INSUFFICIENT_CZP / 不正値: 422
  - 成功時: ticketテーブルに既存購入と同形式で発行（USDCは動かさない、
    fundのraised_usdcにも加算しない）、p2e_ledgerに kind='redeem' でマイナス記録、
    txnに「チケット交換」を記録 → 既存のIPO結果/チケット画面にそのまま表示される
- GET /api/points に rate_czp_per_usdc を追加

## 適用
cd ~/catcheez-backend-clean
unzip -o ~/Downloads/catcheez-p2e-step25.zip -d .
git add -A
git commit -m "P2E: redeem CZP for IPO tickets"
git push

## 確認（デプロイ後）
curl -X POST https://catcheez-backend.onrender.com/api/points/redeem \
  -H "Content-Type: application/json" -d '{"ticker":"PSAX","tier":"silver","qty":1}'
→ 残高1,000未満なら {"error":{"code":"INSUFFICIENT_CZP",...}}（正常）
→ 残高があれば {"redeemed":{...,"ticket_numbers":["P-xxxx"]},"cost_czp":1000,"czp_balance":...}

レート変更: p2e_config に ('czp_per_usdc','10') 等を入れて再起動
（無料枠はディスク揮発のため、恒久変更は P2E_DEFAULTS の値を変えてpush推奨）
