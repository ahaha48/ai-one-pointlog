# Task #8 — Fail-fast フォーム送信実装

## 概要
学生ポイント申請フォーム (`src/app/page.tsx`) を、API 失敗時に localStorage に書き込まずに明示的にエラーを表示する fail-fast パターンへ切り替えた。

## 背景
- aione-point-log は send-and-forget 型のフォーム。学生はデータを再閲覧・編集しない
- 旧実装は `useCollection.create` → `resilientData.create` を経由しており、API 失敗時にレコードを localStorage に `_unsynced=true` で滞留させていた
- 2026-04-26〜04-27 16:29 JST の故障期間中、学生は「送信完了 UI」を見たにもかかわらず DB へ届かず、データがブラウザ内に閉じ込められる事故が発生
- DB が一次データソース、GAS スプレッドシートは副ログ。DB に入っていないものを GAS に流すべきではない

## 修正対象ファイル
- `src/app/page.tsx` のみ

`useCollection.ts` / `resilient-data.ts` / `api-client.ts` は **変更していない**（テンプレートコアおよび admin 画面 `/log` での使用継続のため）。

## 修正内容（diff 抜粋）

### import の置換
```diff
 import { useState, useRef } from "react";
-import { useCollection } from "@/hooks/useCollection";
+import { toolData } from "@/lib/api-client";
```

### `useCollection` 呼び出し削除
```diff
 export default function HomePage() {
-  const { create: saveLog } = useCollection<LogEntry>("point-logs");
-
   const [userName, setUserName] = useState("");
```

### `handleSubmit` の fail-fast 化（要点抜粋）
```diff
   setLoading(true);
+  setShowOutput(false);
 
   try {
     // ...formattedText / gasDetails を組み立て...

-    setOutputText(formattedText);
-    setShowOutput(true);
-    showToast("テキストを生成しました！", "success");
-
-    // ログをアプリ内に保存
-    await saveLog({
+    const submittedAt = new Date().toISOString();
+
+    await toolData.create<LogEntry>("point-logs", {
       userName,
       category,
       usedAI: category === "イベント参加" ? "" : usedAI,
       aiUsageDetail: aiUsageDetail || "",
       details: gasDetails,
-      timestamp: new Date().toISOString(),
+      timestamp: submittedAt,
     });
 
+    setOutputText(formattedText);
+    setShowOutput(true);
+    showToast("テキストを生成しました！", "success");
+
     submitToGas({
       userName,
       category,
       usedAI,
       details: gasDetails,
-      timestamp: new Date().toISOString(),
+      timestamp: submittedAt,
     });
 
-  } catch {
-    showToast("エラーが発生しました。");
+  } catch (error) {
+    console.error("[aione-point-log] form submission failed:", error);
+    showToast("送信に失敗しました。お手数ですが、もう一度送信してください。", "error");
   } finally {
```

## 動作セマンティクス（修正後）

| イベント | 振る舞い |
|:---|:---|
| 成功（DB 200 OK） | DB 書き込み → 出力 UI 表示 → 成功トースト → GAS 副ログ投入 → loading 解除 |
| 失敗（401 / 5xx / network） | DB 書き込み失敗 → エラートースト「送信に失敗しました。お手数ですが、もう一度送信してください。」 → 出力 UI **表示しない** → GAS にも投入しない → loading 解除 |
| 連続再送（前回成功 → 今回失敗） | submit 開始時に `setShowOutput(false)` で前回の出力を消すため、失敗時に古い出力が残らない |

## 設計判断

1. **DB → GAS の順序を厳格化した理由**
   DB が真のデータソース。DB が落ちている状態で GAS だけ投入すると、後で DB 復旧して再送信を促す際に GAS 側に重複が発生する。failure 時は両方とも書かないのが整合性として安全。

2. **GAS を `await` しない理由**
   GAS 投入は `<form target="hidden_iframe">` 経由の fire-and-forget。学生は DB 成功さえ確認できれば良く、GAS 失敗をユーザーに見せる UX 価値はない。GAS 落ちは admin 側の運用課題。

3. **`resilient-data.ts` を変更しなかった理由**
   テンプレート共通コードであり、ヘッダーで「変更しないでください」と明記されている。他ツール（再閲覧・編集を行うもの）では offline-first のメリットがある。aione-point-log 固有の要件は呼び出し側で対応すべき。

4. **`useCollection.ts` を変更しなかった理由**
   admin 画面 `/log` (= `src/app/log/page.tsx`) で読み取り用に使用継続。読み取りについては localStorage キャッシュがあっても問題にならない。

5. **`submittedAt` を一度だけ生成する理由**
   旧実装は DB と GAS でそれぞれ `new Date().toISOString()` を呼んでおり、ms 単位でタイムスタンプがズレる可能性があった。DB と GAS の照合のため一度だけ生成して両方へ渡す。

6. **`setShowOutput(false)` を try の手前に置いた理由**
   学生が一度成功 → 文言調整して再送信 → 失敗、というパターンで前回の出力が見えたままだと「成功した」と誤認しかねない。失敗時は確実に空にする。

## ビルド結果
```
$ npx next build
▲ Next.js 14.2.35

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
 ✓ Generating static pages (6/6)

Route (app)                              Size     First Load JS
┌ ○ /                                    8.45 kB        95.8 kB
├ ○ /_not-found                          873 B          88.2 kB
├ ○ /api/health                          0 B                0 B
└ ○ /log                                 14.8 kB         102 kB
+ First Load JS shared by all            87.3 kB
```
型エラー・lint エラーなし。

## 想定される副作用

| 対象 | 影響 |
|:---|:---|
| `/log`（admin） | **影響なし**。`useCollection` 経由で resilient-data の読み取りを続ける |
| 他の ONE グループ基盤ツール | **影響なし**。aione-point-log の `src/app/page.tsx` のみの変更 |
| 既存の localStorage に滞留している `_unsynced` レコード | 旧データはそのまま残る。学生側で復旧手段はないため admin 側で別途対応（今回スコープ外） |
| GAS スプレッドシート | DB 失敗時のみ書き込みなくなる（旧実装でも DB 失敗時は throw されて GAS に到達していなかったケースが多いため、実質変化なし） |

## 残課題（別タスク）

- Task #9: Codex Review
- Task #10: Playwright headed での正常系/異常系検証
- Task #11: 本番デプロイ
- 既存の localStorage 滞留データの救済（必要なら admin 画面に「ローカル保存データの再送ボタン」を別途検討。本タスクのスコープ外）
