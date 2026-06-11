# P2E Step2 修正版（起動防御）

## 何を直したか
前回のデプロイは、新インスタンスがポートを開く前に止まり「Port scan timeout」で失敗していました。
起動時に行っていた P2E の DDL 適用が原因でブートが止まる可能性を排除するため、
scan.service.ts を「起動を絶対にブロックしない」構造に変更:
- onModuleInit は try/catch で包み、失敗しても警告ログだけ出して起動続行
- DDL適用は ensureSchema() に分離し、全エンドポイントの先頭で冪等に再試行

変更ファイルは src/scan/scan.service.ts のみ（他は前回と同一。念のため全部同梱）。

## 適用手順
cd ~/catcheez-backend-clean
unzip -o ~/Downloads/catcheez-p2e-step2b.zip -d .
grep -n "ScanModule" src/app.module.ts        # ← 2行出ることを確認（重要）
git add -A
git commit -m "P2E: harden scan module bootstrap (lazy schema init)"
git push

※ grep で ScanModule が出ない場合は app.module.ts が古いままなので、
  この zip の src/app.module.ts が正しく上書きされているか確認してください。

## デプロイ後の確認ポイント（Renderログ）
1. RoutesResolver に ScanController {/api} と
   Mapped {/api/points, GET} / {/api/collection, GET} / {/api/scan, POST} が出る
2. [ScanService] P2E schema ready が出る
3. Catcheez M1 mock API → ... が出て Live になる

その後:
curl https://catcheez-backend.onrender.com/api/points
curl -X POST https://catcheez-backend.onrender.com/api/scan -H "Content-Type: application/json" -d '{"demo":true}'
