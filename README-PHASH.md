# pHash重複検知＋画像送信（仕様書 Step4の一部）

## 変更ファイル
- package.json: jimp 追加（純JSの画像処理。npm installで入る）
- src/main.ts: JSONボディ上限を6MBに（base64画像受信用）
- src/scan/scan.service.ts:
  - dHash(64bit) 計算と ハミング距離比較を追加
  - POST /api/scan が body.image（dataURL/base64, 任意）を受理
  - 撮影画像あり: 過去30日の自分のスキャンと距離≤8で 409 DUPLICATE_IMAGE
    （エナジー消費なし）。phash は p2e_scan.phash に保存
  - デモスキャン（画像なし）は従来通り
  - しきい値は p2e_config: phash_hamming_max / phash_window_days

## 適用
cd ~/Downloads/catcheez-backend-clean
unzip -o ~/Downloads/catcheez-p2e-step4.zip -d .
git add -A
git commit -m "P2E: pHash duplicate detection + image upload" && git push

## 確認（デプロイ後）
フロント v50 で実カメラ撮影→同じ写真をもう一度→
「同じ写真は使用できません」が出れば成功。
（注意: 構図がほぼ同じ写真は別カードでも近似判定されることがあります。
 しきい値は p2e_config の phash_hamming_max で調整可能）
