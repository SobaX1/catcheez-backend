# ハズレ特典（CZP還元＋ボーナスチケット）

## 概要
IPO抽選で外れた参加者に救済特典を配布する。draw-winners（抽選確定）時に自動実行。
- CZP還元: 支払ったチケット代USDの50%をCZP換算で還元（p2e_ledger kind='consolation'）
- ボーナスチケット: 次回応募に使える無償チケット1枚（tier='bonus', paid_usdc=0, is_nft=0）
- 当選者は対象外。冪等（同fundで再抽選しても二重付与されない）

## 変更ファイル
- src/funds/winners.service.ts のみ（grantConsolation を追加し drawWinners から呼ぶ）

## 設定（p2e_config で変更可・既定値）
- consolation_czp_pct : 0.5   （支払額の何割をCZP還元するか）
- czp_per_usdc        : 100   （1USDC=何CZP。redeemと共通）
- consolation_bonus_tickets : 1（ハズレ1人あたりのボーナスチケット枚数）

## 適用
cd ~/Downloads/catcheez-backend-clean
unzip -o ~/Downloads/catcheez-p2e-consolation.zip -d .
git add -A
git commit -m "IPO: consolation rewards (CZP refund + bonus ticket) for losers" && git push

## 動作（検証済み）
3名購入→1名当選時、ハズレ2名に各 CZP=支払×50%×100、ボーナス券1枚を付与。
再抽選しても二重付与なし（冪等）。当選者は付与対象外。

## 注意・今後の調整余地
1. ボーナスチケット(tier='bonus')は応募エントリーにも入るため、次回抽選に自動参加する形に
   なる。これを「次回まで持ち越し」にするか「即エントリー」にするかは仕様判断。
2. 現状ボーナスチケットもランクの応募カウント(SUM(qty))に加算される。ハズレ救済が
   ランクを押し上げてよいかは要検討（除外したい場合は is_nft=0 等で集計条件を変える）。
3. 抽選の draw-winners は merkle で new PublicKey(owner) を使うため、owner は有効な
   Solanaアドレスである必要がある（本番のPhantom接続では問題なし）。
