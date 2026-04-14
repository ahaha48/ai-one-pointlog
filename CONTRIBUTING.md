# 開発ガイドライン

## 技術スタック（変更禁止）

| 項目 | 技術 | 備考 |
|:---|:---|:---|
| フレームワーク | Next.js 14 (App Router) | pages/ ルーターは使用禁止 |
| 言語 | TypeScript | JavaScript(.js/.jsx)は禁止 |
| スタイリング | TailwindCSS | CSS Modules, styled-components等は非推奨 |
| 認証 | Cognito SSO（テンプレート組み込み済み） | 独自認証実装は禁止 |
| データ保存 | toolData API（テンプレート組み込み済み） | 詳細は後述 |
| デプロイ | AWS Amplify（自動） | 手動デプロイ不要 |

## データベースに関するルール（最重要）

### 禁止事項

以下のいずれも**禁止**です。PRレビューで却下されます。

| 禁止項目 | 理由 |
|:---|:---|
| Prisma / Drizzle ORM の導入 | 個別DBが乱立し、マイグレーション不可能になるため |
| Turso / libSQL の使用 | 同上 |
| Supabase の使用 | 同上 |
| PlanetScale の使用 | 同上 |
| Firebase Firestore / Realtime DB の使用 | 同上 |
| SQLite ファイルの配置 | 同上 |
| `DATABASE_URL` 環境変数の追加 | 同上 |
| `prisma/` ディレクトリの作成 | 同上 |
| `drizzle.config.ts` の作成 | 同上 |
| `package.json` に DB関連パッケージを追加 | 同上 |
| `src/lib/` 内のファイルを変更 | テンプレート基盤が壊れるため |

### なぜ個別DBが禁止なのか

1. **マイグレーション不可能:** ツールごとに異なるDB（Turso, Supabase, PlanetScale等）を使うと、将来のDB統合・移行が事実上不可能になります
2. **運用コスト爆発:** ツールが10個あればDB監視も10箇所必要。障害対応が困難
3. **退職時のデータ回収:** 講師が退職した際、散らばったDBからデータを回収できない
4. **セキュリティ管理:** 各DBサービスのアクセスキー管理が分散し、漏洩リスクが増大
5. **コスト管理:** 各DBサービスの課金が個別に発生し、全体のコスト把握が困難

### 推奨: useCollection / resilientData の使用

すべてのデータ保存は `useCollection` フックまたは `resilientData` 経由で行ってください:

```typescript
// 方法1: Reactコンポーネント内（推奨）
import { useCollection } from '@/hooks/useCollection';
const { items, create, update, remove } = useCollection('my-collection');

// 方法2: 非コンポーネントから
import { resilientData } from '@/lib/resilient-data';
const items = await resilientData.find('my-collection');
const newItem = await resilientData.create('my-collection', { key: 'value' });
```

> **注意:** `toolData` を直接使わないでください。API障害時にデータが消失します。

データは基盤のAurora PostgreSQLに安全に保存されます。
API障害時はlocalStorageに自動フォールバックし、復旧後に自動再同期されます。

### 新しいデータ構造が必要な場合

`toolData` の標準コレクションでは不十分な場合（複雑なリレーション等）:

1. 管理者に相談（Slack or チャット）
2. 管理者が基盤リポジトリにマイグレーションを追加
3. 専用APIエンドポイントを基盤側に作成
4. ツール側の `api-client.ts` にエンドポイントを追加（管理者が実施）

**ツール開発者がDBスキーマを直接操作することはありません。**

## ファイル構成ルール

### 触ってよいディレクトリ

| ディレクトリ | 用途 |
|:---|:---|
| `src/app/` | ページの追加・編集 |
| `src/app/components/` | ツール固有のコンポーネント（自分で作成） |
| `src/hooks/` | データ管理フック（useCollection） |
| `public/` | 画像・アイコン等の静的ファイル |
| `tool.config.json` | ツール情報の設定 |

### 触らないでください

| ディレクトリ/ファイル | 理由 |
|:---|:---|
| `src/lib/` | 認証・APIの基盤コード |
| `src/components/AuthGuard.tsx` | 認証ガード |
| `src/components/Header.tsx` | 共通ヘッダー |
| `src/components/Footer.tsx` | 共通フッター |
| `amplify.yml` | 自動デプロイ設定 |
| `.env.example` | 環境変数テンプレート |

## パッケージ追加のルール

新しいnpmパッケージが必要な場合:
1. 管理者に相談
2. 管理者がテンプレートに追加（全ツールに反映）
3. 個別ツールでの追加は原則禁止（セキュリティ審査が必要）

**例外:** UIライブラリ（shadcn/ui等）の追加は相談の上で許可される場合があります。

## コーディング規約

- TypeScript必須（`.js` / `.jsx` は使用禁止）
- `"use client"` はクライアントコンポーネントのみに付与
- コンソールにログを残さない（`console.log` は開発時のみ）
- エラーハンドリングを適切に行う（try/catch）

## AWS操作ルール（重要）

### AWS CLI / CDK の実行権限

このプロジェクトのAWSリソース（Amplify, CloudFront, Cognito等）は **ODAKAプロファイル**（リポジトリオーナー個人のIAMユーザー）で運用されています。
**共同作業者（オーナー以外）はODAKAプロファイルを保有していません。**

このため、共同作業者は以下のルールに従ってください:

#### 共同作業者が**やって良いこと**
- アプリコードの編集・ローカルビルド・ユニットテスト
- `git commit` / `git push`（これだけでAmplifyが自動デプロイします）
- ブラウザ/curlによる本番URL（`https://tools.aione.co.jp/{slug}`）の動作確認
- GitHub Commits画面でのビルド結果確認（コミット横の緑チェック/赤バツ）

#### 共同作業者が**やってはいけないこと**
- `aws amplify ...` など AWS CLI コマンドの実行（アクセスキーを求められますが**入力しないでください**）
- `cdk deploy` / `cdk diff` などインフラ変更コマンドの実行
- `scripts/register-tool.sh` / `scripts/verify-aws-account.sh` などオーナー専用スクリプトの実行
- `~/.aws/credentials` への他人の認証情報登録

#### AIエージェント（Claude Code等）への指示ルール
AIエージェントにタスクを依頼する際は、以下の確認と指示を必ず入れてください:

1. **プロファイル判定**: `aws configure list-profiles | grep -x ODAKA` でODAKAプロファイルの有無を判定
2. **ODAKA不在時**: AWS CLI操作を回避し、以下の代替手段を使う
   - デプロイ → `git push` のみ
   - デプロイ確認 → ブラウザ / curl / GitHub Commits画面
   - リソース状態調査 → オーナーに依頼する or タスクとして記録
3. **インフラ変更が必要な場合**: PRまたはIssueで起票し、オーナーに委譲する

> **背景:** 過去、共同作業者の環境でAIエージェントが `aws amplify get-job` を実行してAWSアクセスキーを要求される事象が発生しました。
> 共同作業者にAWSキーを配布することはセキュリティ上できないため、AWS CLI前提のワークフローは避ける必要があります。
