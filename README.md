# ハズレ特典を案4に変更（CZP還元のみ・ボーナスチケット廃止）

## 変更
- src/funds/winners.service.ts: grantConsolation からボーナスチケット発行を削除。
  ハズレ特典は「支払額の50%をCZP還元」のみ。応募ポイント(ランク進捗)は応募時点で加算済み。
- 原資は非換金のCZPのみ。$10相当のチケットばらまきを回避。

## 適用
cd ~/Downloads/catcheez-backend-clean
unzip -o ~/Downloads/catcheez-p2e-cons2.zip -d .
git add -A
git commit -m "IPO consolation: CZP refund only (remove bonus ticket)" && git push

## 検証済み
3名購入→1名当選時、ハズレ2名はCZP+2500のみ、bonusチケット発行0、当選者は対象外。
