/**
 * 基盤APIクライアント + ToolDataClient
 * ⚠️ このファイルはテンプレートのコアです。変更しないでください。
 */

import { getIdToken } from "./auth";
import { config } from "./config";

/** 基盤APIクライアント */
async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getIdToken();
  const url = `${config.api.baseUrl}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      const { redirectToLogin } = await import("./auth");
      redirectToLogin();
    }
    throw new Error("認証が必要です");
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      (errorBody as { error?: { message?: string } }).error?.message ??
      `API Error: ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

/** ツール固有のAPI呼び出し */
export const api = {
  get: <T>(path: string) => fetchApi<T>(path),
  post: <T>(path: string, body: unknown) =>
    fetchApi<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    fetchApi<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => fetchApi<T>(path, { method: "DELETE" }),
};

interface ToolAccessResponse {
  success: boolean;
  data: { hasAccess: boolean };
}

/** ツールアクセス権チェック */
export async function checkToolAccess(cognitoSub: string): Promise<boolean> {
  try {
    const response = await api.get<ToolAccessResponse>(
      `/marketplace/tools/${config.api.toolId}/access?subscriberId=${encodeURIComponent(cognitoSub)}`,
    );
    return response.data.hasAccess;
  } catch {
    return false;
  }
}

// ================================
// ToolDataClient
// ツール固有データの保存・取得API
// 開発者はこのクライアントを使ってデータを管理する
// SQLやDB接続コードを書く必要はない
// ================================

interface FindOptions {
  where?: Record<string, unknown>;
  orderBy?: string;
  limit?: number;
  offset?: number;
}

interface DataResponse<T> {
  success: boolean;
  data: T;
}

interface PaginatedDataResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    totalCount: number;
    currentPage: number;
    totalPages: number;
  };
}

const TOOL_DATA_BASE = `/tools/${config.api.toolId}/data`;

function buildQueryString(options?: FindOptions): string {
  if (!options) return "";
  const params = new URLSearchParams();
  if (options.where) params.set("where", JSON.stringify(options.where));
  if (options.orderBy) params.set("orderBy", options.orderBy);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * ツール固有データクライアント
 *
 * 使い方:
 * ```
 * import { toolData } from '@/lib/api-client';
 *
 * // データ取得
 * const items = await toolData.find('listings', { where: { status: 'sold' }, limit: 50 });
 *
 * // データ作成
 * const newItem = await toolData.create('listings', { title: 'iPhone 15', price: 120000 });
 *
 * // データ更新
 * await toolData.update('listings', 'item-id', { price: 130000 });
 *
 * // データ削除
 * await toolData.remove('listings', 'item-id');
 * ```
 */
export const toolData = {
  /** コレクションからデータを検索 */
  find: <T>(collection: string, options?: FindOptions) =>
    fetchApi<PaginatedDataResponse<T>>(
      `${TOOL_DATA_BASE}/${collection}${buildQueryString(options)}`,
    ),

  /** IDでデータを1件取得 */
  findById: <T>(collection: string, id: string) =>
    fetchApi<DataResponse<T>>(`${TOOL_DATA_BASE}/${collection}/${id}`),

  /** データを作成 */
  create: <T>(collection: string, data: Record<string, unknown>) =>
    fetchApi<DataResponse<T>>(`${TOOL_DATA_BASE}/${collection}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /** データを更新 */
  update: <T>(collection: string, id: string, data: Record<string, unknown>) =>
    fetchApi<DataResponse<T>>(`${TOOL_DATA_BASE}/${collection}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /** データを削除 */
  remove: (collection: string, id: string) =>
    fetchApi<DataResponse<null>>(`${TOOL_DATA_BASE}/${collection}/${id}`, {
      method: "DELETE",
    }),

  /** データ件数を取得 */
  count: (collection: string, where?: Record<string, unknown>) =>
    fetchApi<DataResponse<number>>(
      `${TOOL_DATA_BASE}/${collection}/count${where ? `?where=${JSON.stringify(where)}` : ""}`,
    ),
};
