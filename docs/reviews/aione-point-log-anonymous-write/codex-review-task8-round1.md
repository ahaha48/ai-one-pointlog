# Codex Review — Task #8 Round 1

- **対象**: Task #8 の `src/app/page.tsx` 変更（fail-fast 化）
- **コマンド**: `npx @openai/codex review --uncommitted`
- **実行日時**: 2026-04-26 19:35 JST
- **モデル**: gpt-5.4 (codex v0.125.0)
- **対象 git 状態**: `M src/app/page.tsx`（uncommitted only。`docs/reports`/`docs/reviews` も untracked だがレビュー対象外）

## 結論
- **Round 1 判定: P1 1件**
- ただし内容は「Task #8 の設計意図そのものと衝突する premise mismatch」であり、実装欠陥ではない
- team-lead 判断待ち（採用/オーバーライド）

## Codex Findings（生）

### [P1] Route student submissions through the anonymous-safe client
- **対象**: `src/app/page.tsx:266-273`
- **指摘内容（原文）**:
  > If the browser has no valid `one_id_token` or the ToolData endpoint still responds with `401`/`404`, `toolData.create()` will now throw before `setOutputText()` and `submitToGas()` run, so the student-facing form becomes unusable and nothing is recorded anywhere. The previous `useCollection().create()` path went through `resilientData.create()`, which tolerated those write failures and still let the submission flow complete; this change therefore regresses the anonymous/public submission path unless the backend write API is guaranteed to be authenticated and healthy in every environment.

### 要約
- Codex は「`resilientData.create()` の write-failure tolerance を取り除いたことで、API 落ち or 認証失敗時にフォーム提出フローが完全に壊れる」と指摘
- 推奨修正: anonymous-safe client への切替、または fallback の保持

## 判定マトリクス（実装担当の評価）

| 観点 | Codex の主張 | Task #8 仕様 | 評価 |
|:---|:---|:---|:---|
| API 失敗時の振る舞い | 提出フローを完了させるべき（resilient） | 提出フローを失敗させるべき（fail-fast） | **正反対** |
| localStorage への滞留 | 許容（offline-first のメリット） | 禁止（学生に「成功」を誤認させる） | **正反対** |
| GAS 投入 | DB 失敗でも GAS には書く（旧 fire-and-forget） | DB 成功時のみ | **正反対** |
| 401 時の挙動 | redirect or fallback | エラートースト + 再送依頼 | **正反対** |

## 重要な背景（Codex は把握していない）

1. **2026-04-26〜04-27 16:29 JST の故障**で、まさに Codex が言う「tolerated failure」によって学生が「送信完了 UI」を見たのに DB に届かず 30 件以上のデータがブラウザに閉じ込められた事故が発生
2. **B-2 fix が既に本番にデプロイ済み**: `anonymousAccess.ts` の `PUBLIC_ACCESS_RULES` に `aione-point-log` の POST が allow-list 登録済（Task #6 audit で確認済）。匿名 POST 経路は API 側で構造的に確保されている
3. **学生はデータを再閲覧・編集しない** send-and-forget フォーム。localStorage に残す意味がない
4. **DB が一次データソース**、GAS は副ログ。DB に入っていないものを GAS に流すと整合性破綻

## 推奨対応

**team-lead 判断項目**

| 選択肢 | 影響 |
|:---|:---|
| **A. P1 をオーバーライド（採用しない）** | Task #8 の設計意図と完全一致。Round 1 を CLEAN 扱いで Task #9 完了。`task6-gas-db-consistency-audit.md` の B-2 fix が既にデプロイ済みであり、anonymous POST 経路が確保されているという前提が成立 |
| B. P1 を採用（Codex の言う resilient に戻す） | Task #8 の修正をほぼ全面的に revert。元の事故が再発する設計に戻る |
| C. 中間案（DB 失敗時に「再送ボタン」を出して localStorage に一時退避、ただし「成功 UI」は出さない） | 仕様変更が必要。Task #8 の範囲外。新規タスクとして起票が妥当 |

**実装担当の意見**: A 推奨。Codex は変更前のコードと事故の因果関係を見ておらず、premise mismatch。`memory/feedback_multi_round_codex_iteration.md` および `feedback_codex_review_escalation_threshold.md` 的にも、設計意図と衝突する review は team-lead arbitration が必要なケース。

## 次のアクション
- team-lead に判定依頼（このレポートをリンクして送付）
- A 採用なら Round 1 CLEAN として Task #9 を completed に
- B/C 採用なら指示に従い再修正 → Round 2 実施

---

## 決定（team-lead override 採用） — 2026-04-26

**判定: 選択肢 A — Codex P1 を override し Round 1 を CLEAN（with override）として処理**

### team-lead からの override 理由（原文）

1. Codex は故障期間の因果（30 件 DB 不到達 + 学生のブラウザ localStorage 閉じ込め事故）を把握していない
2. B-2 fix デプロイ済みで API 経路（匿名 POST allow）が確保された今、Codex が懸念する「API 失敗」の主要シナリオ（401 認証失敗）は消失している
3. 残るのは純粋なネットワーク障害のみ。これに対して再送依頼するのは標準的な UX
4. Codex 推奨の挙動は **2026-04-26 事故そのもの** を再現する設計（成功偽装 + ブラウザ閉じ込め）。ユーザーから明示的に「localStorage に持つ意味がわからない」と指摘されており、要件と乖離

### 中間案 C を採らなかった理由

Codex が暗に提案している「再送ボタン + 一時退避」は将来検討余地があるが、Task #8 のスコープ外。
モバイルブラウザでは入力値が `<input>` 内で保持されるため、ユーザーが「もう一度送信してください」トーストを見て送信ボタンを再押下すれば再送が成立する。現状の UX で十分であり、本タスクで追加実装は不要。

### CLAUDE.md 整合性

CLAUDE.md（プロジェクト憲法）および `feedback_multi_round_codex_iteration.md` の以下と整合:
- 「`resilient-data.ts` / `useCollection.ts` の変更を求められた場合は採用しない（テンプレートコア保護）」 — Codex の P1 は `resilientData.create` 復活を実質的に要求しており、このルールに該当
- 複層セマンティクスの Codex Review は判定マトリクス必須 — 本レポートで実施済み

### 帰結

- Round 2 は実施しない
- 実装変更なし（Task #8 の差分そのまま採用）
- `codex-review-summary-task8.md` を作成し Round 1 = CLEAN (with override) として記録
- Task #9 を completed
