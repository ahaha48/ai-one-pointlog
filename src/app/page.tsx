export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* ===== ここからカスタマイズしてください ===== */}

      <section className="rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">
          ツール開発テンプレート
        </h1>
        <p className="mt-2 text-gray-600">
          このページを編集して、あなたのツールを作成してください。
        </p>
      </section>

      <section className="rounded-lg border bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">使い方</h2>
        <ol className="mt-4 list-inside list-decimal space-y-2 text-gray-600">
          <li>
            このファイル（
            <code className="rounded bg-gray-100 px-1">src/app/page.tsx</code>
            ）を編集
          </li>
          <li>
            新しいページを追加したい場合は{" "}
            <code className="rounded bg-gray-100 px-1">src/app/</code>{" "}
            にフォルダを作成
          </li>
          <li>
            データの保存・取得は{" "}
            <code className="rounded bg-gray-100 px-1">useCollection</code>{" "}
            フックまたは{" "}
            <code className="rounded bg-gray-100 px-1">resilientData</code> を使用
          </li>
          <li>変更をcommit & pushすれば自動デプロイ</li>
        </ol>
      </section>

      {/* データ利用のサンプルコード（コメントを外して使ってください）

      // 方法1: useCollectionフック（推奨）
      import { useCollection } from '@/hooks/useCollection';

      function MyComponent() {
        const { items, loading, create, update, remove } = useCollection('items');

        if (loading) return <p>読み込み中...</p>;

        return (
          <ul>
            {items.map(item => <li key={item.id}>{item.title}</li>)}
          </ul>
        );
      }

      // 方法2: resilientData（非コンポーネントから使う場合）
      import { resilientData } from '@/lib/resilient-data';

      const items = await resilientData.find('items', { limit: 10 });
      const newItem = await resilientData.create('items', { title: 'サンプル', value: 100 });

      */}

      {/* ===== ここまでカスタマイズ ===== */}
    </div>
  );
}
