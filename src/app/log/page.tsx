"use client";

import { useState } from "react";
import Link from "next/link";
import { useCollection } from "@/hooks/useCollection";

interface LogEntry {
  id: string;
  userName: string;
  category: string;
  usedAI: string;
  details: string;
  timestamp: string;
  [key: string]: unknown;
}

const CATEGORY_COLORS: Record<string, string> = {
  案件応募: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  案件受注: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  マネタイズ報告: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  LINEスタンプ制作: "bg-green-500/20 text-green-300 border-green-500/30",
  その他: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LogPage() {
  const { items, loading, error } = useCollection<LogEntry>("point-logs");
  const [filterCategory, setFilterCategory] = useState("");
  const [searchName, setSearchName] = useState("");

  const sorted = [...items].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const filtered = sorted.filter((item) => {
    const matchCategory = filterCategory ? item.category === filterCategory : true;
    const matchName = searchName
      ? item.userName.includes(searchName)
      : true;
    return matchCategory && matchName;
  });

  const categories = Array.from(new Set(items.map((i) => i.category))).filter(Boolean);

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl">
        {/* Card */}
        <div className="rounded-2xl border border-[#D4AF37]/20 border-t-[#D4AF37]/40 bg-[#0F172A]/95 p-8 shadow-2xl backdrop-blur-xl">

          {/* Header */}
          <header className="relative mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-wide text-white">実践報告ログ一覧</h1>
              <p className="mt-1 text-sm text-[#D4AF37]">
                {loading ? "読み込み中..." : `${filtered.length} 件`}
              </p>
            </div>
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/60 transition hover:border-[#D4AF37]/40 hover:text-[#D4AF37]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              フォームに戻る
            </Link>
          </header>

          {/* フィルター */}
          <div className="mb-6 flex flex-wrap gap-3">
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="名前で絞り込み"
              className="flex-1 min-w-[160px] rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/15"
            />
            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="appearance-none rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 pr-8 text-sm text-white outline-none transition focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/15 [&>option]:bg-slate-800"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23D4AF37%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 10px center",
                  backgroundSize: "10px",
                }}
              >
                <option value="">すべての申請項目</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* コンテンツ */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-white/40">
              <svg className="mr-3 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              読み込み中...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              データの取得に失敗しました: {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-white/30">
              <svg className="mx-auto mb-4 h-12 w-12 opacity-30" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <p>ログがありません</p>
              <Link href="/" className="mt-2 inline-block text-sm text-[#D4AF37] underline">
                フォームから報告する
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((entry) => (
                <LogCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LogCard({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const colorClass = CATEGORY_COLORS[entry.category] ?? CATEGORY_COLORS["その他"];

  return (
    <div className="rounded-xl border border-white/10 bg-white/3 p-4 transition hover:border-white/20">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold text-white">{entry.userName}</span>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
            {entry.category}
          </span>
        </div>
        <span className="text-xs text-white/30">{formatDate(entry.timestamp)}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/60">
        <span>
          <span className="text-white/30">使用AI：</span>
          {entry.usedAI}
        </span>
      </div>

      {entry.details && (
        <div className="mt-2">
          <p className={`text-sm text-white/50 ${expanded ? "whitespace-pre-wrap" : "line-clamp-2"}`}>
            {entry.details}
          </p>
          {entry.details.length > 60 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs text-[#D4AF37]/70 hover:text-[#D4AF37]"
            >
              {expanded ? "閉じる" : "もっと見る"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
