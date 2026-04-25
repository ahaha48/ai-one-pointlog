import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

// `.env.local` を Node プロセスで読み込む（MCPサーバーは標準では .env.local を読まないため）。
// 既に process.env に値があれば優先する（.claude/settings.json の env や shell export を尊重）。
function loadEnvLocal() {
  const envPath = join(PROJECT_ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  for (const rawLine of content.split("\n")) {
    let line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice(7).trim();
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
loadEnvLocal();

// tool.config.json からツール情報を自動読み取り
function loadToolConfig() {
  try {
    const config = JSON.parse(readFileSync(join(PROJECT_ROOT, "tool.config.json"), "utf-8"));
    return config;
  } catch {
    return { slug: "unknown", name: "Unknown Tool" };
  }
}

const toolConfig = loadToolConfig();
// MCPサーバーはNode.jsプロセスとして動作するため、NEXT_PUBLIC_ ではなく独自の環境変数を使用。
// .claude/settings.json の mcpServers.*.env で API_BASE_URL を上書き可能。
// アプリ側の NEXT_PUBLIC_API_BASE_URL とは異なるが、デフォルト値は同じ本番URLを指す。
const API_BASE_URL = process.env.API_BASE_URL || "https://tools.aione.co.jp/api/v1";
const TOOL_ID = process.env.TOOL_ID || toolConfig.slug;

// API呼び出しヘルパー
// Note: MCPサーバーはサーバーサイドで動作するため、ブラウザのCognito認証は使えない。
// 中央 tool_data API は Cognito ID Token (Bearer) 認証必須に移行済。
// `.env.local` に ONE_GROUP_BEARER_TOKEN として user 自身の ID Token を export して使う。
// 1時間TTL → 期限切れ時は再ログインしてトークンを更新する（README参照）。
async function callApi(method, path, body) {
  const url = `${API_BASE_URL}${path}`;
  const headers = { "Content-Type": "application/json" };
  const bearerToken = process.env.ONE_GROUP_BEARER_TOKEN;
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }
  const options = { method, headers };
  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  const text = await response.text();
  try {
    return { status: response.status, data: JSON.parse(text) };
  } catch {
    return { status: response.status, data: text };
  }
}

const server = new McpServer(
  { name: "one-group-tool-dev", version: "1.0.0" },
  {
    capabilities: { tools: {} },
    instructions: `ONEグループ ツール開発支援MCPサーバー。ツール「${toolConfig.name}」(slug: ${TOOL_ID}) のデータ操作、テンプレートガイド、デプロイ状態確認ができます。`,
  }
);

// ===== データ操作ツール =====

server.tool(
  "tool_data_find",
  "ツールのデータコレクションからデータを検索する",
  {
    collection: z.string().describe("コレクション名（例: items, listings, funnels）"),
    where: z.string().optional().describe("検索条件（JSON文字列、例: {\"status\":\"active\"}）"),
    orderBy: z.string().optional().describe("並び順（例: created_at DESC）"),
    limit: z.number().optional().describe("取得件数（デフォルト: 20）"),
  },
  async ({ collection, where, orderBy, limit }) => {
    const params = new URLSearchParams();
    if (where) params.set("where", where);
    if (orderBy) params.set("orderBy", orderBy);
    if (limit) params.set("limit", String(limit));
    const query = params.toString() ? `?${params.toString()}` : "";

    const result = await callApi("GET", `/tools/${TOOL_ID}/data/${collection}${query}`);
    return {
      content: [{
        type: "text",
        text: `## ${collection} データ一覧\n\n**Status:** ${result.status}\n\n\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\``,
      }],
    };
  }
);

server.tool(
  "tool_data_create",
  "ツールのデータコレクションにデータを作成する",
  {
    collection: z.string().describe("コレクション名"),
    data: z.string().describe("作成するデータ（JSON文字列）"),
  },
  async ({ collection, data }) => {
    const parsed = JSON.parse(data);
    const result = await callApi("POST", `/tools/${TOOL_ID}/data/${collection}`, parsed);
    return {
      content: [{
        type: "text",
        text: `## データ作成結果\n\n**Status:** ${result.status}\n\n\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\``,
      }],
    };
  }
);

server.tool(
  "tool_data_update",
  "ツールのデータコレクションのデータを更新する",
  {
    collection: z.string().describe("コレクション名"),
    id: z.string().describe("更新するデータのID"),
    data: z.string().describe("更新するフィールド（JSON文字列）"),
  },
  async ({ collection, id, data }) => {
    const parsed = JSON.parse(data);
    const result = await callApi("PUT", `/tools/${TOOL_ID}/data/${collection}/${id}`, parsed);
    return {
      content: [{
        type: "text",
        text: `## データ更新結果\n\n**Status:** ${result.status}\n\n\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\``,
      }],
    };
  }
);

server.tool(
  "tool_data_delete",
  "ツールのデータコレクションからデータを削除する",
  {
    collection: z.string().describe("コレクション名"),
    id: z.string().describe("削除するデータのID"),
  },
  async ({ collection, id }) => {
    const result = await callApi("DELETE", `/tools/${TOOL_ID}/data/${collection}/${id}`);
    return {
      content: [{
        type: "text",
        text: `## データ削除結果\n\n**Status:** ${result.status}\n\n\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\``,
      }],
    };
  }
);

server.tool(
  "tool_data_collections",
  "このツールで使用されているデータコレクション一覧を取得する（各コレクションの件数付き）",
  async () => {
    // よく使われるコレクション名を試行して存在チェック
    const commonNames = ["items", "funnels", "tasks", "actions", "listings", "reports", "settings", "users", "images", "videos", "messages"];
    const found = [];
    let authFailed = false;

    for (const name of commonNames) {
      try {
        const result = await callApi("GET", `/tools/${TOOL_ID}/data/${name}?limit=1`);
        if (result.status === 401 || result.status === 403) {
          authFailed = true;
          break;
        }
        if (result.status === 200 && result.data?.success) {
          found.push({ name, count: result.data.meta?.totalCount ?? "?" });
        }
      } catch {
        // skip
      }
    }

    if (authFailed) {
      return {
        content: [{
          type: "text",
          text: `## 認証エラー（401/403）\n\n中央 \`tool_data\` API の認証に失敗しました。\n\n環境変数 \`ONE_GROUP_BEARER_TOKEN\` が未設定または期限切れの可能性があります。\n\n### 対処\n1. https://tools.aione.co.jp/ にブラウザで再ログイン\n2. DevTools → Application → Cookies → \`one_id_token\` の値をコピー\n3. プロジェクトルートの \`.env.local\` の \`ONE_GROUP_BEARER_TOKEN=...\` を更新\n4. Claude Code または MCP プロセスを再起動\n\n詳細は README の「Bearer Token の設定」を参照してください。`,
        }],
      };
    }

    if (found.length === 0) {
      return {
        content: [{
          type: "text",
          text: `## コレクション一覧\n\nデータコレクションがまだありません。\n\n\`tool_data_create\` でデータを作成すると、コレクションが自動的に作成されます。\n\n例: \`tool_data_create({ collection: "items", data: '{"title": "テスト"}' })\``,
        }],
      };
    }

    const list = found.map(c => `- **${c.name}**: ${c.count} 件`).join("\n");
    return {
      content: [{
        type: "text",
        text: `## コレクション一覧（ツール: ${TOOL_ID}）\n\n${list}`,
      }],
    };
  }
);

server.tool(
  "tool_data_aggregate",
  "ツールのデータコレクションで集計を実行する（合計、平均、件数、最小、最大）",
  {
    collection: z.string().describe("コレクション名"),
    operations: z.string().describe("集計操作のJSON配列（例: [{\"type\":\"sum\",\"field\":\"price\"},{\"type\":\"count\"}]）"),
    where: z.string().optional().describe("フィルタ条件（JSON文字列）"),
    groupBy: z.string().optional().describe("グループ化するフィールド名"),
  },
  async ({ collection, operations, where, groupBy }) => {
    const body = { operations: JSON.parse(operations) };
    if (where) body.where = JSON.parse(where);
    if (groupBy) body.groupBy = groupBy;

    const result = await callApi("POST", `/tools/${TOOL_ID}/data/${collection}/aggregate`, body);
    return {
      content: [{
        type: "text",
        text: `## ${collection} 集計結果\n\n**Status:** ${result.status}\n\n\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\``,
      }],
    };
  }
);

server.tool(
  "upload_image",
  "画像ファイルのアップロード用presigned URLを取得する（実際のアップロードはブラウザから行う）",
  {
    fileName: z.string().describe("ファイル名（例: product.jpg）"),
    contentType: z.string().describe("MIMEタイプ（例: image/jpeg, image/png, application/pdf）"),
    category: z.string().optional().describe("カテゴリ（images または files、デフォルト: images）"),
  },
  async ({ fileName, contentType, category }) => {
    const body = { fileName, contentType, category: category || "images" };
    const result = await callApi("POST", `/tools/${TOOL_ID}/upload`, body);
    return {
      content: [{
        type: "text",
        text: `## アップロードURL取得結果\n\n**Status:** ${result.status}\n\n\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\`\n\n### 使い方\n1. \`uploadUrl\` に対してPUTリクエストでファイルを送信\n2. \`publicUrl\` をtoolDataに保存して画面に表示`,
      }],
    };
  }
);

// ===== テンプレートガイドツール =====

server.tool(
  "get_template_guide",
  "ONEグループ ツール開発テンプレートの使い方・コーディングルール・プロジェクト構成を返す。ツール開発を始める前に必ず参照すること。",
  async () => {
    // CONTRIBUTING.md を読み込み
    let contributing = "";
    try {
      contributing = readFileSync(join(PROJECT_ROOT, "CONTRIBUTING.md"), "utf-8");
    } catch {
      contributing = "CONTRIBUTING.md が見つかりません";
    }

    return {
      content: [{
        type: "text",
        text: `# ONEグループ ツール開発ガイド

## 現在のツール情報
- **名前:** ${toolConfig.name}
- **Slug:** ${TOOL_ID}
- **URL:** https://tools.aione.co.jp/${TOOL_ID}/
- **認証:** ${toolConfig.requiredAuth ? "あり（Cognito SSO）" : "なし"}

## 技術スタック
- Next.js 14 (App Router) + TypeScript + TailwindCSS
- データ保存: \`useCollection\` フック推奨（\`src/hooks/useCollection.ts\`）
- 認証: Cognito SSO（テンプレート組み込み済み）
- デプロイ: AWS Amplify（mainブランチpushで自動）

## データ保存の推奨パターン

\`\`\`typescript
"use client";
import { useCollection } from '@/hooks/useCollection';

interface Item {
  id: string;
  title: string;
  price: number;
}

function ItemsList() {
  const { items, loading, create, update, remove } = useCollection<Item>('items');
  // ...
}
\`\`\`

> **重要:** \`toolData\` を直接使わないでください。API障害時にデータが消失します。
> 必ず \`useCollection\` または \`resilientData\` を使ってください。

## 変更してよいもの
- \`src/app/\` 内のページファイル
- \`src/hooks/\` 内のカスタムフック
- \`tool.config.json\` のツール情報
- \`public/\` 内の静的ファイル

## 変更禁止
- \`src/lib/\` 内のファイル（認証・API基盤）
- \`src/components/AuthGuard.tsx\`, \`Header.tsx\`, \`Footer.tsx\`
- \`amplify.yml\`

---

${contributing}`,
      }],
    };
  }
);

server.tool(
  "get_data_api_docs",
  "toolData APIの詳細リファレンス（メソッド一覧、パラメータ、使用例）を返す",
  async () => {
    let apiDocs = "";
    try {
      apiDocs = readFileSync(join(PROJECT_ROOT, "docs", "DATA_API.md"), "utf-8");
    } catch {
      apiDocs = "docs/DATA_API.md が見つかりません";
    }

    return {
      content: [{
        type: "text",
        text: apiDocs,
      }],
    };
  }
);

// ===== デプロイ状態ツール =====

server.tool(
  "get_build_status",
  "Amplifyの最新ビルド状態を確認する（デプロイの成否確認用）",
  async () => {
    return {
      content: [{
        type: "text",
        text: `## デプロイ状態の確認方法

### 自動デプロイ
mainブランチにpushすると自動的にビルド＆デプロイされます（約2-3分）。

### 確認方法（AWSキー不要 - 共同作業者でも可能）
1. **公開URL目視:** ブラウザで https://tools.aione.co.jp/${TOOL_ID}/ を開き、変更が反映されているか確認
2. **curl:** \`curl -I https://tools.aione.co.jp/${TOOL_ID}/\` でHTTPステータス確認
3. **GitHub Commits画面:** リポジトリのコミット横の緑チェック/赤バツで判定
4. **Amplify Console:** 管理者から共有されたAmplify Console URLをブラウザで開く（要IAM認証）

### 確認方法（ODAKAプロファイル保有者=オーナー専用）
以下はリポジトリオーナー（ODAKAプロファイル保有者）のみ実行可能です。
共同作業者環境では **AWSアクセスキーを要求されるため実行してはいけません**。
\`\`\`bash
# プロファイル有無を事前確認
aws configure list-profiles | grep -x ODAKA || echo "ODAKA未設定 - このコマンドは実行不可"

# ODAKAがあれば以下を実行
aws amplify list-jobs --app-id <APP_ID> --branch-name main --profile ODAKA --region ap-northeast-1 --query 'jobSummaries[0]' --output table
\`\`\`

### 公開URL
- https://tools.aione.co.jp/${TOOL_ID}/

### ビルドが失敗する場合
- \`amplify.yml\` を変更していないか確認
- \`package.json\` に未承認のパッケージを追加していないか確認
- TypeScriptの型エラーがないか \`npx tsc --noEmit\` で確認
- 管理者に連絡してください`,
      }],
    };
  }
);

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP Server failed to start:", error);
  process.exit(1);
});
