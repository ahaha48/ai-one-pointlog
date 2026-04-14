/**
 * useCollection: コレクションデータ管理フック
 *
 * 使い方:
 * ```
 * const { items, loading, create, update, remove, refresh } = useCollection<Item>('items');
 * ```
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { resilientData } from "@/lib/resilient-data";

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

interface AggregateOperation {
  type: "count" | "sum" | "avg" | "min" | "max";
  field?: string;
  alias?: string;
}

interface AggregateOptions {
  where?: Record<string, unknown>;
  groupBy?: string;
}

interface UseCollectionResult<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  create: (data: Record<string, unknown>) => Promise<T>;
  update: (id: string, data: Record<string, unknown>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  aggregate: (
    operations: AggregateOperation[],
    options?: AggregateOptions,
  ) => Promise<Record<string, unknown>[]>;
}

export function useCollection<T extends DataItem>(
  collection: string,
  options?: FindOptions,
): UseCollectionResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const serializedOptions = JSON.stringify(options);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await resilientData.find<T>(collection, options);
      setItems(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "データの取得に失敗しました",
      );
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection, serializedOptions]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (data: Record<string, unknown>): Promise<T> => {
      const item = await resilientData.create<T>(collection, data);
      setItems((prev) => [...prev, item]);
      return item;
    },
    [collection],
  );

  const update = useCallback(
    async (id: string, data: Record<string, unknown>): Promise<T> => {
      const updated = await resilientData.update<T>(collection, id, data);
      setItems((prev) =>
        prev.map((item) => (String(item.id) === id ? updated : item)),
      );
      return updated;
    },
    [collection],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await resilientData.remove(collection, id);
      setItems((prev) => prev.filter((item) => String(item.id) !== id));
    },
    [collection],
  );

  const aggregate = useCallback(
    async (
      operations: AggregateOperation[],
      options?: AggregateOptions,
    ): Promise<Record<string, unknown>[]> => {
      return resilientData.aggregate(collection, operations, options);
    },
    [collection],
  );

  return { items, loading, error, create, update, remove, refresh, aggregate };
}
