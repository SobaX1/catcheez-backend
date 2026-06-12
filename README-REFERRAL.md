# 紹介システム＋応募数ランクアップ＋ゲストID分離

## 変更ファイル
- src/common/auth-context.middleware.ts
  JWTなし時に X-Guest-Id ヘッダ（端末発行ID）で 'g_<id>' としてユーザー分離
- src/scan/scan.schema.ts: p2e_ref_code / p2e_ref_use テーブル＋報酬設定
- src/scan/scan.service.ts / scan.controller.ts:
  - GET /api/referral … 自分の紹介コード（無ければ発行）＋応募数・紹介数
  - POST /api/referral/claim {code} … 紹介コード適用（1回のみ/自己紹介不可/双方にCZP）
  - GET /api/rank … 応募数(累計チケット)・紹介数からランク判定（Rookie〜Master）

## ランク条件（応募 or 紹介、どちらか達成で昇格）
Rookie 0 / Bronze 応募5 / Silver 応募20 or 紹介3 / Gold 応募50 or 紹介10 / Master 応募100 or 紹介30
報酬: 紹介した側 +50 CZP / された側 +25 CZP（p2e_config: ref_reward_referrer/referred）

## 適用
cd ~/Downloads/catcheez-backend-clean
unzip -o ~/Downloads/catcheez-p2e-step5.zip -d .
git add -A
git commit -m "P2E: referral system + rank + guest-id user separation" && git push

## 確認（デプロイ後・ヘッダにX-Guest-Idを付けて別ユーザーを再現）
curl -s https://catcheez-backend.onrender.com/api/referral -H "X-Guest-Id: testA111"
# → {"code":"XXXXXX",...} を控える
curl -s -X POST https://catcheez-backend.onrender.com/api/referral/claim \
  -H "X-Guest-Id: testB222" -H "Content-Type: application/json" -d '{"code":"XXXXXX"}'
# → {"applied":true,"bonus_czp":25,...}

## フロント v55
- 端末ごとに guest_id を localStorage 発行し、全API呼び出しに X-Guest-Id を付与（ユーザー分離）
- アカウントのランクカード下に紹介ボックス: 紹介リンクのコピー、紹介コード/招待人数、コード入力＆適用
- URLに ?ref=CODE が付いていれば入力欄へ自動投入（招待リンク経由の登録導線）
- ランクはサーバの /api/rank を正本に表示（応募・紹介の両条件に対応）

注意: ゲストIDはアプリの匿名分離用。正式なアカウント/ログインは別途JWT連携で。
