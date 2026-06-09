# Catcheez バックエンドを無料で公開して LIVE 版を動かす

所要 10分くらい。コマンドはほぼ不要（GitHub と Render のWeb画面だけ）。

## 手順（おすすめ: Render 無料枠）
1. このバックエンドを GitHub に置く（`catcheez-backend.bundle` から push 済み、または zip をアップロード）。
2. https://render.com にサインアップ（無料）。
3. 画面右上「New +」→「**Blueprint**」を選ぶ。
4. さっきの GitHub リポジトリを選択 →「Apply」。`render.yaml` を自動で読み、ビルド〜起動まで進みます。
5. 数分待つとサービスURLが出ます（例 `https://catcheez-backend.onrender.com`）。
   - 確認: ブラウザで `そのURL/api/health` を開いて `{"ok":true,...}` が出れば成功。

> 補足（無料枠の制約）
> - しばらくアクセスが無いと自動停止し、次のアクセスで数十秒の起動待ちがあります（デモなら問題なし）。
> - データ保存は一時的（再デプロイ/再起動で初期データに戻ります）。永続化が必要になったら有料ディスク or 外部DBへ。

## フロントを LIVE に向ける（1行）
`catcheez-mobile.html` の `<head>` 直後に、上で出たURL（末尾に `/api`）を入れるだけ:
```html
<script>window.CATCHEEZ_API = 'https://catcheez-backend.onrender.com/api';</script>
```
これを入れて GitHub に push すると、GitHub Pages のアプリが左下 **● LIVE** になり、
ログイン・残高・履歴・締切/抽選が「本物の裏方」で動きます。
（一時的に試すだけなら `…/catcheez-mobile.html?api=https://catcheez-backend.onrender.com/api` でもOK）

## 他のホストでも可（任意）
`Dockerfile` 同梱なので Railway / Fly.io 等でもそのままデプロイできます。
共通の要点: ビルド `npm install --include=dev && npm run build` / 起動 `node dist/main.js` /
公開時は環境変数 `ALLOW_ADMIN=false`、`JWT_SECRET` を安全な値に。`PORT` はホストが自動で渡します。

## つまずいたら
- `/api/health` が出ない → Render のログでビルド失敗を確認（多くは Node バージョン。`NODE_VERSION=20` 設定済み）。
- フロントが ● MOCK のまま → `window.CATCHEEZ_API` のURL末尾が `/api` か、https かを確認。
