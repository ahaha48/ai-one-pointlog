/**
 * 耐障害性データクライアント
 * API + localStorage の双方向マージでデータ消失を防止
 * ⚠️ このファイルはテンプレートのコアです。変更しないでください。
 */
"use client";

import { toolData, api } from "./api-client";
import { config } from "./config";

interface AggregateOperation {
  type: "count" | "sum" | "avg" | "min" | "max";
  field?: string;
  alias?: string;
}

interface AggregateOptions {
  where?: Record<string, unknown>;
  groupBy?: string;
}

interface AggregateResponse<T> {
  success: boolean;
  data: T[];
}

async function fetchAggregate<T>(
  collection: string,
  body: Record<string, unknown>,
): Promise<T[]> {
  const toolId = config.api.toolId;
  const result = await api.post<AggregateResponse<T>>(
    `/tools/${toolId}/data/${collection}/aggregate`,
    body,
  );
  return result.data || [];
}

interface DataItem {
  id: string;
  [key: string]: unknown;
}

interface FindOptions {
  where?: Record<string, unknown>;
  orderBy?: string;
  limit?: number;
  offset?: number;
}

const STORAGE_PREFIX = "tool_data_";

function getStorageKey(collection: string): string {
  return `${STORAGE_PREFIX}${collection}`;
}

function loadLocal<T extends DataItem>(collection: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(getStorageKey(collection));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocal<T extends DataItem>(collection: string, items: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStorageKey(collection), JSON.stringify(items));
  } catch {
    // localStorage full or unavailable
  }
}

function mergeByID<T extends DataItem>(
  apiItems: T[],
  localItems: T[],
): { merged: T[]; unsynced: T[] } {
  const mergedMap = new Map<string, T>();
  const apiIds = new Set<string>();

  for (const item of apiItems) {
    mergedMap.set(String(item.id), item);
    apiIds.add(String(item.id));
  }

  const unsynced: T[] = [];
  for (const item of localItems) {
    const id = String(item.id);
    if (!mergedMap.has(id)) {
      mergedMap.set(id, item);
      unsynced.push(item);
    }
  }

  return { merged: [...mergedMap.values()], unsynced };
}

async function syncToApi<T extends DataItem>(
  collection: string,
  items: T[],
): Promise<void> {
  for (const item of items) {
    try {
      const { id, created_at, updated_at, _unsynced, ...data } = item as T & {
        created_at?: string;
        updated_at?: string;
        _unsynced?: boolean;
      };
      await toolData.create(collection, data as Record<string, unknown>);
    } catch {
      console.warn(
        `[resilient-data] 未同期データの同期失敗: ${collection}/${item.id}`,
      );
    }
  }
}

/**
 * 耐障害性データクライアント
 *
 * toolData と同じインターフェースだが、以下の点が異なる：
 * - find: APIとlocalStorageをマージ（APIが空でもローカルデータ保持）
 * - create/update/delete: API失敗時はlocalStorageにフォールバック
 * - 未同期データはバックグラウンドでAPIに自動再同期
 *
 * 使い方:
 * ```
 * import { resilientData } from '@/lib/resilient-data';
 *
 * const items = await resilientData.find<Item>('items');
 * const newItem = await resilientData.create<Item>('items', { title: 'Test' });
 * ```
 */
export const resilientData = {
  /** データ検索（API + localStorage マージ） */
  find: async <T extends DataItem>(
    collection: string,
    options?: FindOptions,
  ): Promise<T[]> => {
    const localItems = loadLocal<T>(collection);

    try {
      const result = await toolData.find<T>(collection, options);
      const apiItems = result.data || [];

      const { merged, unsynced } = mergeByID(apiItems, localItems);

      let filtered = merged;
      if (options?.where) {
        filtered = merged.filter((item) => {
          return Object.entries(options.where!).every(
            ([key, value]) => item[key] === value,
          );
        });
      }

      saveLocal(collection, merged);

      if (unsynced.length > 0) {
        syncToApi(collection, unsynced).catch(() => {});
      }

      return filtered;
    } catch {
      if (options?.where) {
        return localItems.filter((item) =>
          Object.entries(options.where!).every(
            ([key, value]) => item[key] === value,
          ),
        );
      }
      return localItems;
    }
  },

  /** IDで1件取得 */
  findById: async <T extends DataItem>(
    collection: string,
    id: string,
  ): Promise<T | null> => {
    try {
      const result = await toolData.findById<T>(collection, id);
      return result.data;
    } catch {
      const localItems = loadLocal<T>(collection);
      return localItems.find((item) => String(item.id) === id) || null;
    }
  },

  /** データ作成（失敗時はlocalStorageフォールバック） */
  create: async <T extends DataItem>(
    collection: string,
    data: Record<string, unknown>,
  ): Promise<T> => {
    try {
      const result = await toolData.create<T>(collection, data);
      const item = result.data;
      const localItems = loadLocal<T>(collection);
      localItems.push(item);
      saveLocal(collection, localItems);
      return item;
    } catch {
      const fallbackItem = {
        id: crypto.randomUUID?.() || Date.now().toString(),
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _unsynced: true,
      } as unknown as T;
      const localItems = loadLocal<T>(collection);
      localItems.push(fallbackItem);
      saveLocal(collection, localItems);
      return fallbackItem;
    }
  },

  /** データ更新 */
  update: async <T extends DataItem>(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<T> => {
    const localItems = loadLocal<T>(collection);
    const index = localItems.findIndex((item) => String(item.id) === id);

    try {
      const result = await toolData.update<T>(collection, id, data);
      const updated = result.data;
      if (index !== -1) {
        localItems[index] = { ...localItems[index], ...updated };
      }
      saveLocal(collection, localItems);
      return updated;
    } catch {
      if (index !== -1) {
        localItems[index] = {
          ...localItems[index],
          ...data,
          updated_at: new Date().toISOString(),
          _unsynced: true,
        } as T;
        saveLocal(collection, localItems);
        return localItems[index];
      }
      throw new Error(`Item ${id} not found`);
    }
  },

  /** データ削除 */
  remove: async (collection: string, id: string): Promise<void> => {
    const localItems = loadLocal(collection);
    const filtered = localItems.filter((item) => String(item.id) !== id);
    saveLocal(collection, filtered);

    try {
      await toolData.remove(collection, id);
    } catch {
      // API失敗してもローカルからは削除済み
    }
  },

  /** データ集計 */
  aggregate: async <T = Record<string, unknown>>(
    collection: string,
    operations: AggregateOperation[],
    options?: AggregateOptions,
  ): Promise<T[]> => {
    const body: Record<string, unknown> = { operations };
    if (options?.where) body.where = options.where;
    if (options?.groupBy) body.groupBy = options.groupBy;

    try {
      return await fetchAggregate<T>(collection, body);
    } catch {
      return [];
    }
  },

  /** データ件数 */
  count: async (
    collection: string,
    where?: Record<string, unknown>,
  ): Promise<number> => {
    try {
      const result = await toolData.count(collection, where);
      return result.data;
    } catch {
      const localItems = loadLocal(collection);
      if (where) {
        return localItems.filter((item) =>
          Object.entries(where).every(([key, value]) => item[key] === value),
        ).length;
      }
      return localItems.length;
    }
  },
};
