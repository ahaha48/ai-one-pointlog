# ONE Group ツール開発テンプレート

あなた専用のWebツールを作成・公開するためのテンプレートです。
このテンプレートを使えば、コードを書いてpushするだけで自動的にWebアプリが公開されます。

## はじめに

### ステップ1: このテンプレートからリポジトリを作成

1. このページ上部の緑色の「Use this template」ボタンをクリック
2. 「Create a new repository」を選択
3. リポジトリ名を入力（例: `tool-ai-writer`）
4. 「Private」を選択
5. 「Create repository」をクリック

### ステップ2: ツール情報を設定

リポジトリが作成されたら、`tool.config.json` を開いて以下を編集します:

| 項目 | 説明 | 例 |
|:---|:---|:---|
| `name` | ツールの名前（日本語OK） | `AIライター` |
| `slug` | URL用の英語名（半角英数字とハイフン） | `ai-writer` |
| `description` | ツールの説明 | `AIを使って記事を自動生成するツール` |
| `author` | あなたの名前 | `田中太郎` |
| `price` | 販売価格（円）。無料なら0 | `9800` |
| `category` | カテゴリ | `AI` / `物販` / `分析` / `教育` / `その他` |

### ステップ3: ツールの画面を作成

`src/app/page.tsx` を編集して、ツールのメイン画面を作成します。

- HTMLとReactコンポーネントで画面を作ります
- TailwindCSSでデザインできます
- AIツール（Claude等）に「○○な画面を作って」と依頼するのも有効です

新しいページを追加したい場合:
- `src/app/settings/page.tsx` → `/settings` ページ
- `src/app/history/page.tsx` → `/history` ページ

### ステップ4: push → 自動デプロイ

変更をcommitしてpushすれば、自動的にビルド＆デプロイされます。
数分後にはWebアプリとして公開されます。

> **重要:** デプロイにAWSアクセスキーやAWS CLIは**一切不要**です。GitHubへのpushだけで完了します。
> `aws amplify ...` 等のCLIコマンドはリポジトリオーナー専用であり、共同作業者は実行する必要も権限もありません。
> 共同作業者の環境では、`aws amplify` コマンドを実行するとAWSアクセスキーを要求されますが、**キーの入力は不要です**。
> デプロイ状況の確認方法は下記「[デプロイ状況の確認](#デプロイ状況の確認)」を参照してください。

### デプロイ状況の確認

pushしたあとのデプロイ状況は、**AWS CLIを使わない方法**で確認できます:

| 方法 | 手順 |
|:---|:---|
| **公開URL目視** | ブラウザで `https://tools.aione.co.jp/{slug}` を開き、変更が反映されているか確認 |
| **curl** | `curl -I https://tools.aione.co.jp/{slug}` でHTTPステータスを確認 |
| **GitHub Commits** | リポジトリのCommits画面で、コミット横の緑チェック/赤バツを確認 |
| **Amplify Console** | 管理者から共有されたAmplify Console URLをブラウザで開く（要IAM認証） |

## データの保存・取得

ツール内でデータを保存したい場合（ユーザーの入力データ、履歴等）、
`useCollection` フックを使ってください。API障害時もデータが消えません。

```typescript
"use client";
import { useCollection } from '@/hooks/useCollection';

interface Item {
  id: string;
  title: string;
  price: number;
}

function ItemsList() {
  const { items, loading, create, update, remove } = useCollection<Item>('items');

  if (loading) return <p>読み込み中...</p>;

  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>
          {item.title} - ¥{item.price}
          <button onClick={() => update(item.id, { price: item.price + 100 })}>値上げ</button>
          <button onClick={() => remove(item.id)}>削除</button>
        </li>
      ))}
      <button onClick={() => create({ title: '新商品', price: 5000 })}>追加</button>
    </ul>
  );
}
```

> **重要:** `toolData` を直接使うとAPI障害時にデータが消失するリスクがあります。
> 必ず `useCollection` または `resilientData` を使ってください。

詳しいAPIリファレンスは [docs/DATA_API.md](docs/DATA_API.md) を参照してください。

## ローカル開発

```bash
# 依存パッケージをインストール
npm install

# 開発サーバーを起動
npm run dev

# ブラウザで http://localhost:3000 を開く
```

> **注意:** ローカル開発では認証機能が動作しません。
> 認証なしでUI開発を進め、pushしてデプロイ後に動作確認してください。

## プロジェクト構成

```
src/
├── app/              ← ページを追加・編集するディレクトリ
│   ├── page.tsx      ← メインページ（ここを編集）
│   └── ...           ← 新しいページをここに追加
├── hooks/            ← データ管理フック（useCollection等）
├── components/       ← 共通コンポーネント（変更不要）
└── lib/              ← 認証・API（変更禁止）
```

### 変更してよいもの
- `src/app/` 内のページファイル
- `src/app/` 内に新しいフォルダ/ページを追加
- `tool.config.json` のツール情報
- `public/` 内の画像ファイル

### 変更しないでください
- `src/lib/` 内のファイル（認証・API基盤）
- `src/components/` 内のファイル（共通UI）
- `amplify.yml`（自動デプロイ設定）
- `package.json` の依存パッケージ（パッケージ追加は管理者に相談）

## 環境変数について

環境変数は**管理者が設定**します。講師は設定不要です。
- Cognito認証情報
- API接続情報
- ツールID

ツールの申請後、管理者がアプリを作成し、環境変数を設定します。

## 困ったら

- デプロイが失敗する → 管理者に連絡してください
- 新しいパッケージを使いたい → 管理者に相談してください
- データの保存方法がわからない → `toolData` の使い方を [docs/DATA_API.md](docs/DATA_API.md) で確認
- 独自のデータベースを使いたい → **禁止です**。`toolData` を使ってください（理由は [CONTRIBUTING.md](CONTRIBUTING.md) を参照）
