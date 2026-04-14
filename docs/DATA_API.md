# ToolData API リファレンス

ツール内でデータを保存・取得するためのAPIです。
SQLやデータベースの知識は不要です。

## おすすめ: useCollection フック

データの取得・作成・更新・削除を簡単に行えるReactフックです。
API障害時もlocalStorageに自動フォールバックし、**リロードしてもデータが消えません**。

```typescript
"use client";
import { useCollection } from '@/hooks/useCollection';

interface Item {
  id: string;
  title: string;
  price: number;
}

export default function ItemsPage() {
  const { items, loading, create, update, remove } = useCollection<Item>('items');

  if (loading) return <p>読み込み中...</p>;

  async function handleAdd() {
    await create({ title: '新しい商品', price: 5000 });
  }

  return (
    <div>
      <button onClick={handleAdd}>追加</button>
      <ul>
        {items.map(item => (
          <li key={item.id}>
            {item.title} - ¥{item.price}
            <button onClick={() => update(item.id, { price: item.price + 100 })}>値上げ</button>
            <button onClick={() => remove(item.id)}>削除</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

> **注意:** `toolData`（低レベルAPI）を直接使うこともできますが、`useCollection` または `resilientData` の使用を推奨します。`toolData` を直接使うとAPI障害時にデータが消失するリスクがあります。

---

## resilientData（非コンポーネントから使う場合）

Reactコンポーネント外からデータ操作する場合は `resilientData` を使います。

```typescript
import { resilientData } from '@/lib/resilient-data';

// データ検索（API + localStorage マージ）
const items = await resilientData.find<Item>('items');

// 条件付き検索
const soldItems = await resilientData.find<Item>('items', {
  where: { status: 'sold' },
});

// データ作成（API失敗時もlocalStorageに保存）
const newItem = await resilientData.create<Item>('items', {
  title: 'iPhone 15',
  price: 120000,
});

// データ更新
await resilientData.update<Item>('items', 'uuid-xxx', { price: 130000 });

// データ削除
await resilientData.remove('items', 'uuid-xxx');
```

---

## 低レベルAPI（toolData）

## インポート

```typescript
import { toolData } from '@/lib/api-client';
```

## メソッド一覧

### `toolData.find(collection, options?)`

コレクション（データのグループ）からデータを検索します。

**パラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|:---|:---|:---|:---|
| `collection` | string | はい | コレクション名（英数字、例: `listings`, `items`） |
| `options.where` | object | いいえ | 検索条件（例: `{ status: 'active' }`） |
| `options.orderBy` | string | いいえ | 並び順（例: `'created_at DESC'`） |
| `options.limit` | number | いいえ | 取得件数（デフォルト: 20） |
| `options.offset` | number | いいえ | スキップ件数（ページネーション用） |

**戻り値:**

```typescript
{
  success: true,
  data: [
    { id: "uuid-1", title: "商品A", price: 5000, created_at: "..." },
    { id: "uuid-2", title: "商品B", price: 3000, created_at: "..." },
  ],
  meta: {
    totalCount: 42,
    currentPage: 1,
    totalPages: 3,
  }
}
```

**例:**

```typescript
// 全件取得（最新20件）
const { data: items } = await toolData.find('items');

// 条件付き検索
const { data: soldItems } = await toolData.find('items', {
  where: { status: 'sold' },
  orderBy: 'sold_at DESC',
  limit: 50,
});
```

---

### `toolData.findById(collection, id)`

IDを指定して1件取得します。

**例:**

```typescript
const { data: item } = await toolData.findById('items', 'uuid-xxx');
```

---

### `toolData.create(collection, data)`

新しいデータを作成します。`id`, `created_at`, `updated_at` は自動生成されます。

**例:**

```typescript
const { data: newItem } = await toolData.create('items', {
  title: 'iPhone 15 Pro',
  purchasePrice: 80000,
  salePrice: 120000,
  status: 'listed',
});
// newItem.id → 自動生成されたUUID
```

---

### `toolData.update(collection, id, data)`

既存データを更新します。指定したフィールドのみ更新されます。

**例:**

```typescript
await toolData.update('items', 'uuid-xxx', {
  salePrice: 130000,
  status: 'sold',
});
```

---

### `toolData.remove(collection, id)`

データを削除します。

**例:**

```typescript
await toolData.remove('items', 'uuid-xxx');
```

---

### `toolData.count(collection, where?)`

データ件数を取得します。

**例:**

```typescript
const { data: totalCount } = await toolData.count('items');
const { data: soldCount } = await toolData.count('items', { status: 'sold' });
```

---

## 実践例: eBay利益トラッカー風

```typescript
"use client";

import { useState, useEffect } from "react";
import { toolData } from "@/lib/api-client";

interface Listing {
  id: string;
  itemTitle: string;
  purchasePrice: number;
  salePrice: number | null;
  platformFee: number;
  shippingCost: number;
  status: "listed" | "sold";
}

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    loadListings();
  }, []);

  async function loadListings() {
    const { data } = await toolData.find<Listing>("listings", {
      orderBy: "created_at DESC",
      limit: 50,
    });
    setListings(data);
  }

  async function addListing(title: string, price: number) {
    await toolData.create("listings", {
      itemTitle: title,
      purchasePrice: price,
      salePrice: null,
      platformFee: 0,
      shippingCost: 0,
      status: "listed",
    });
    await loadListings(); // 再読み込み
  }

  async function markAsSold(id: string, salePrice: number, fee: number) {
    await toolData.update("listings", id, {
      salePrice,
      platformFee: fee,
      status: "sold",
    });
    await loadListings();
  }

  // ... UIコンポーネント
}
```

## コレクション名のルール

- 英小文字とアンダースコアのみ（例: `listings`, `daily_reports`）
- 複数形を推奨（例: `items`, `users`, `reports`）
- ツール内で自由に作成可能（事前申請不要）
- コレクション間のリレーション（関連付け）が必要な場合は管理者に相談

## 制限事項

| 項目 | 制限 |
|:---|:---|
| 1レコードの最大サイズ | 1MB |
| 1コレクションの最大レコード数 | 制限なし（ただし大量データは要相談） |
| コレクション数 | 制限なし |

---

## 検索演算子

`where` パラメータで以下の演算子が使えます:

| 演算子 | 説明 | 例 |
|:---|:---|:---|
| （値そのまま） | 完全一致 | `{ "status": "active" }` |
| `$eq` | 完全一致 | `{ "status": { "$eq": "active" } }` |
| `$ne` | 不一致 | `{ "status": { "$ne": "deleted" } }` |
| `$gt` / `$gte` | より大きい / 以上 | `{ "price": { "$gte": 1000 } }` |
| `$lt` / `$lte` | より小さい / 以下 | `{ "price": { "$lt": 5000 } }` |
| `$like` | 部分一致 | `{ "title": { "$like": "%iPhone%" } }` |
| `$in` | 配列内一致 | `{ "status": { "$in": ["active", "sold"] } }` |

**組み合わせ例:**
```typescript
const { data } = await resilientData.find('items', {
  where: {
    price: { "$gte": 1000, "$lte": 5000 },
    status: "active"
  }
});
```

---

## 集計（aggregate）

```typescript
const results = await resilientData.aggregate('items', [
  { type: 'sum', field: 'price' },
  { type: 'count' },
  { type: 'avg', field: 'price' },
], {
  where: { status: 'sold' },
  groupBy: 'category',
});
// → [{ category: "electronics", sum_price: 150000, count_all: 5, avg_price: 30000 }, ...]
```

| 集計タイプ | 説明 |
|:---|:---|
| `count` | 件数 |
| `sum` | 合計 |
| `avg` | 平均 |
| `min` | 最小値 |
| `max` | 最大値 |

---

## 画像アップロード

```typescript
import { useImageUpload } from '@/hooks/useImageUpload';

function ImageUploader() {
  const { upload, uploading, error } = useImageUpload();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const { publicUrl } = await upload(file);
    // publicUrl を toolData に保存
    await resilientData.create('images', { url: publicUrl, name: file.name });
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} />
      {uploading && <p>アップロード中...</p>}
      {error && <p style={{color: 'red'}}>{error}</p>}
    </div>
  );
}
```
