"use client";

import { useState, useRef } from "react";

const GAS_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbw6gAnFX8pthrHcncNqBxw86bHTTBSVZzBHhvOm272Ny7wPdMI4mLuuqeDZ7GOFlw/exec";

const AI_OPTIONS = ["ChatGPT", "Gemini", "Claude", "Claude Code", "Antigravity", "その他"] as const;
const CATEGORY_OPTIONS = ["ライティング", "画像編集・デザイン", "業務効率化", "動画編集", "AIコンサル", "その他"] as const;
const PLATFORM_OPTIONS = ["クラウドワークス", "ランサーズ", "ココナラ", "その他"] as const;

type Category = "案件応募" | "案件受注" | "マネタイズ報告" | "LINEスタンプ制作" | "その他" | "";

const PRACTICAL_CATEGORIES: Category[] = ["案件応募", "案件受注", "マネタイズ報告", "LINEスタンプ制作"];

function useCheckboxGroup(options: readonly string[]) {
  const [checked, setChecked] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");

  const toggle = (value: string) => {
    setChecked((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const getValue = () => {
    const result = checked
      .filter((v) => v !== "その他")
      .concat(checked.includes("その他") && otherText ? [otherText] : []);
    return result.join(", ");
  };

  const reset = () => {
    setChecked([]);
    setOtherText("");
  };

  return { checked, otherText, setOtherText, toggle, getValue, reset };
}

export default function HomePage() {
  const [userName, setUserName] = useState("");
  const [category, setCategory] = useState<Category>("");

  const aiGroup = useCheckboxGroup(AI_OPTIONS);
  const appCategoryGroup = useCheckboxGroup(CATEGORY_OPTIONS);
  const platformGroup = useCheckboxGroup(PLATFORM_OPTIONS);

  const [appCount, setAppCount] = useState("");
  const [appAmount, setAppAmount] = useState("");
  const [details, setDetails] = useState("");

  // LINEスタンプ用
  const [stampTheme, setStampTheme] = useState("");
  const [stampImpression, setStampImpression] = useState("");
  const [stampMessage, setStampMessage] = useState("");

  const [outputText, setOutputText] = useState("");
  const [showOutput, setShowOutput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [copied, setCopied] = useState(false);

  const outputRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isPractical = PRACTICAL_CATEGORIES.includes(category);

  const showToast = (message: string, type: "error" | "success" = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCategoryChange = (val: Category) => {
    setCategory(val);
    appCategoryGroup.reset();
    platformGroup.reset();
    setAppCount("");
    setAppAmount("");
    setDetails("");
    setStampTheme("");
    setStampImpression("");
    setStampMessage("");
    setShowOutput(false);
  };

  const getDetailsLabel = () => {
    if (category === "案件応募" || category === "案件受注" || category === "マネタイズ報告") return "ひとこと";
    return "詳細情報";
  };

  const getDetailsPlaceholder = () => {
    if (category === "案件応募") return "面談希望、連絡待ちなどひとことご記入ください";
    if (category === "案件受注") return "取引先の反応や工夫した点などひとことご記入ください";
    if (category === "マネタイズ報告") return "取引先の反応や工夫した点などひとことご記入ください";
    return "媒体名、場所、またはその他の自由記述をご記入ください";
  };

  const getCategoryGroupLabel = () => {
    if (category === "マネタイズ報告") return "収益カテゴリ";
    return "案件カテゴリ";
  };

  const getPlatformGroupLabel = () => {
    if (category === "案件受注") return "受注媒体";
    if (category === "マネタイズ報告") return "媒体（プラットフォーム）";
    return "応募媒体";
  };

  const getAmountLabel = () => {
    if (category === "マネタイズ報告") return "収益金額：（非公開でもOK）";
    return "受注金額：（非公開でもOK）";
  };

  const submitToGas = (payload: Record<string, string>) => {
    if (!GAS_WEBAPP_URL) return;

    const iframeId = "hidden_iframe_for_gas";
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.name = iframeId;
      iframe.id = iframeId;
      iframe.style.display = "none";
      document.body.appendChild(iframe);
    }

    const form = document.createElement("form");
    form.action = GAS_WEBAPP_URL;
    form.method = "POST";
    form.target = iframeId;
    form.style.display = "none";

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "payload";
    input.value = JSON.stringify(payload);

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    setTimeout(() => form.remove(), 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const usedAI = aiGroup.getValue();

    if (!userName || !category) {
      showToast("お名前とカテゴリを選択してください。");
      return;
    }

    if (category === "LINEスタンプ制作") {
      if (!stampTheme || !stampImpression || !stampMessage) {
        showToast("スタンプのすべての詳細項目を入力してください。");
        return;
      }
    } else if (!details) {
      showToast("詳細情報を入力してください。");
      return;
    }

    if (category === "案件応募" && (!appCount || !appCategoryGroup.getValue() || !platformGroup.getValue())) {
      showToast("応募件数、カテゴリ、媒体を入力してください。");
      return;
    }

    if ((category === "案件受注" || category === "マネタイズ報告") && (!appCategoryGroup.getValue() || !platformGroup.getValue())) {
      showToast("カテゴリと媒体を選択してください。");
      return;
    }

    if (aiGroup.checked.includes("その他") && !aiGroup.otherText) {
      showToast("その他のAI名をご記入ください。");
      return;
    }

    if (["案件応募", "案件受注", "マネタイズ報告"].includes(category)) {
      if (appCategoryGroup.checked.includes("その他") && !appCategoryGroup.otherText) {
        showToast("その他のカテゴリをご記入ください。");
        return;
      }
      if (platformGroup.checked.includes("その他") && !platformGroup.otherText) {
        showToast("その他の媒体をご記入ください。");
        return;
      }
    }

    if (isPractical && !usedAI) {
      showToast("AI ONEの実践報告には、使用したAIの選択が必須です！");
      return;
    } else if (!usedAI) {
      showToast("使用したAIを選択してください。");
      return;
    }

    setLoading(true);

    try {
      let formattedText = "";
      let gasDetails = details;
      const appCat = appCategoryGroup.getValue();
      const appPlat = platformGroup.getValue();

      if (category === "案件応募") {
        formattedText = `📩【応募報告】\n▷ 本日の応募件数：${appCount}\n▷ 案件カテゴリ：${appCat}\n▷ 応募媒体：${appPlat}\n▷ 使用AI：${usedAI}\n▷ ひとこと：${details}`;
        gasDetails = `応募件数: ${appCount}\nカテゴリ: ${appCat}\n媒体: ${appPlat}\nひとこと: ${details}`;
      } else if (category === "案件受注") {
        formattedText = `📩【案件受注報告】\n▷ 案件カテゴリ：${appCat}\n▷ 受注媒体：${appPlat}\n▷ 受注金額：${appAmount || "非公開"}\n▷ 使用AI：${usedAI}\n▷ ひとこと：${details}`;
        gasDetails = `カテゴリ: ${appCat}\n媒体: ${appPlat}\n受注金額: ${appAmount || "非公開"}\nひとこと: ${details}`;
      } else if (category === "マネタイズ報告") {
        formattedText = `📩【マネタイズ報告】\n▷ 収益カテゴリ：${appCat}\n▷ 媒体：${appPlat}\n▷ 収益金額：${appAmount || "非公開"}\n▷ 使用AI：${usedAI}\n▷ ひとこと：${details}`;
        gasDetails = `カテゴリ: ${appCat}\n媒体: ${appPlat}\n収益金額: ${appAmount || "非公開"}\nひとこと: ${details}`;
      } else if (category === "LINEスタンプ制作") {
        const stampDetails = `▷ スタンプのテーマ・コンセプト：\n${stampTheme}\n\n▷ 作成してみての感想・工夫した点：\n${stampImpression}\n\n▷ これからチャレンジする方へひとこと：\n${stampMessage}`;
        formattedText = `📩【LINEスタンプ制作報告】\n●使用AI：${usedAI}\n\n${stampDetails}`;
        gasDetails = stampDetails;
      } else {
        const titleCategory = category.endsWith("報告") ? category : category + "報告";
        formattedText = `【${titleCategory}】\n●使用AI：${usedAI}\n●詳細・感想：\n${details}`;
      }

      setOutputText(formattedText);
      setShowOutput(true);
      showToast("テキストを生成しました！", "success");

      submitToGas({
        userName,
        category,
        usedAI,
        details: gasDetails,
        timestamp: new Date().toISOString(),
      });

    } catch {
      showToast("エラーが発生しました。");
    } finally {
      setTimeout(() => {
        setLoading(false);
        setTimeout(() => {
          outputRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 100);
      }, 500);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-xl animate-[slideUp_0.6s_cubic-bezier(0.16,1,0.3,1)]">
        {/* Card */}
        <div className="rounded-2xl border border-[#D4AF37]/20 border-t-[#D4AF37]/40 bg-[#0F172A]/95 p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <header className="relative mb-10 text-center">
            <h1 className="mb-1 text-2xl font-bold tracking-wide text-white">AI ONE 実践報告用フォーム</h1>
            <p className="text-sm font-medium text-[#D4AF37]">実績報告用テキスト生成ツール</p>
            <div className="mx-auto mt-4 h-0.5 w-12 rounded bg-[#D4AF37]" />
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* お名前 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white">
                お名前（フルネーム）<span className="ml-1 text-[#D4AF37]">*</span>
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="AI太郎"
                required
                className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3.5 text-white placeholder-white/30 outline-none transition focus:border-[#D4AF37] focus:bg-white/8 focus:ring-4 focus:ring-[#D4AF37]/15"
              />
            </div>

            {/* 申請項目 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white">
                申請項目<span className="ml-1 text-[#D4AF37]">*</span>
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value as Category)}
                  required
                  className="w-full appearance-none rounded-lg border border-white/15 bg-white/5 px-4 py-3.5 text-white outline-none transition focus:border-[#D4AF37] focus:bg-white/8 focus:ring-4 focus:ring-[#D4AF37]/15 [&>option]:bg-slate-800"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23D4AF37%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 16px center",
                    backgroundSize: "12px",
                  }}
                >
                  <option value="">選択してください</option>
                  <option value="案件応募">案件応募（実践報告）</option>
                  <option value="案件受注">案件受注（実践報告）</option>
                  <option value="マネタイズ報告">マネタイズ報告（実践報告）</option>
                  <option value="LINEスタンプ制作">LINEスタンプ制作（実践報告）</option>
                  <option value="その他">その他（学習報告など）</option>
                </select>
              </div>
            </div>

            {/* 使用AI */}
            {category && (
              <div className={isPractical ? "rounded-lg border border-red-500/40 bg-red-500/5 p-3" : ""}>
                <label className={`mb-1.5 block text-sm font-medium ${isPractical ? "text-red-200" : "text-white"}`}>
                  使用したAI<span className="ml-1 text-[#D4AF37]">*</span>
                  {isPractical && (
                    <span className="ml-2 animate-pulse rounded border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-300">
                      ※実践報告では必須項目です！
                    </span>
                  )}
                </label>
                <div className="flex flex-wrap gap-2">
                  {AI_OPTIONS.map((ai) => (
                    <CheckboxChip
                      key={ai}
                      label={ai}
                      checked={aiGroup.checked.includes(ai)}
                      onChange={() => aiGroup.toggle(ai)}
                    />
                  ))}
                </div>
                {aiGroup.checked.includes("その他") && (
                  <input
                    type="text"
                    value={aiGroup.otherText}
                    onChange={(e) => aiGroup.setOtherText(e.target.value)}
                    placeholder="Canva, Genspark などを入力してください"
                    className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/15"
                  />
                )}
              </div>
            )}

            {/* 案件応募 固有フィールド */}
            {category === "案件応募" && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white">
                    本日の応募件数<span className="ml-1 text-[#D4AF37]">*</span>
                  </label>
                  <input
                    type="number"
                    value={appCount}
                    onChange={(e) => setAppCount(e.target.value)}
                    min="1"
                    placeholder="例：3"
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3.5 text-white placeholder-white/30 outline-none transition focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/15"
                  />
                </div>
                <CheckboxGroupField
                  label={getCategoryGroupLabel()}
                  options={CATEGORY_OPTIONS}
                  group={appCategoryGroup}
                  otherPlaceholder="カテゴリ名をご記入ください"
                  required
                />
                <CheckboxGroupField
                  label={getPlatformGroupLabel()}
                  options={PLATFORM_OPTIONS}
                  group={platformGroup}
                  otherPlaceholder="媒体名をご記入ください"
                  required
                />
              </>
            )}

            {/* 案件受注 / マネタイズ報告 固有フィールド */}
            {(category === "案件受注" || category === "マネタイズ報告") && (
              <>
                <CheckboxGroupField
                  label={getCategoryGroupLabel()}
                  options={CATEGORY_OPTIONS}
                  group={appCategoryGroup}
                  otherPlaceholder="カテゴリ名をご記入ください"
                  required
                />
                <CheckboxGroupField
                  label={getPlatformGroupLabel()}
                  options={PLATFORM_OPTIONS}
                  group={platformGroup}
                  otherPlaceholder="媒体名をご記入ください"
                  required
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white">
                    {getAmountLabel()}
                  </label>
                  <input
                    type="text"
                    value={appAmount}
                    onChange={(e) => setAppAmount(e.target.value)}
                    placeholder="例：10,000円、非公開など"
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3.5 text-white placeholder-white/30 outline-none transition focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/15"
                  />
                </div>
              </>
            )}

            {/* LINEスタンプ固有フィールド */}
            {category === "LINEスタンプ制作" && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white">
                    スタンプのテーマ・コンセプト<span className="ml-1 text-[#D4AF37]">*</span>
                  </label>
                  <textarea
                    value={stampTheme}
                    onChange={(e) => setStampTheme(e.target.value)}
                    rows={2}
                    placeholder="テーマやコンセプトをご記入ください"
                    className="w-full resize-y rounded-lg border border-white/15 bg-white/5 px-4 py-3.5 text-white placeholder-white/30 outline-none transition focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/15"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white">
                    作成してみての感想・工夫した点<span className="ml-1 text-[#D4AF37]">*</span>
                  </label>
                  <textarea
                    value={stampImpression}
                    onChange={(e) => setStampImpression(e.target.value)}
                    rows={3}
                    placeholder="感想や工夫した点をご記入ください"
                    className="w-full resize-y rounded-lg border border-white/15 bg-white/5 px-4 py-3.5 text-white placeholder-white/30 outline-none transition focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/15"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white">
                    これからチャレンジする方へひとこと<span className="ml-1 text-[#D4AF37]">*</span>
                  </label>
                  <textarea
                    value={stampMessage}
                    onChange={(e) => setStampMessage(e.target.value)}
                    rows={2}
                    placeholder="ひとことメッセージをご記入ください"
                    className="w-full resize-y rounded-lg border border-white/15 bg-white/5 px-4 py-3.5 text-white placeholder-white/30 outline-none transition focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/15"
                  />
                </div>
              </>
            )}

            {/* 詳細情報（LINEスタンプ以外） */}
            {category && category !== "LINEスタンプ制作" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">
                  {getDetailsLabel()}<span className="ml-1 text-[#D4AF37]">*</span>
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={category === "その他" ? 6 : 3}
                  placeholder={getDetailsPlaceholder()}
                  className="w-full resize-y rounded-lg border border-white/15 bg-white/5 px-4 py-3.5 text-white placeholder-white/30 outline-none transition focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/15"
                />
              </div>
            )}

            {/* 生成ボタン */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-3 rounded-lg border-none py-4 text-base font-bold shadow-[0_8px_16px_rgba(212,175,55,0.15)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_20px_rgba(212,175,55,0.25)] active:translate-y-0 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/40 disabled:shadow-none"
              style={{
                background: loading ? undefined : "linear-gradient(135deg, #D4AF37 0%, #B8922A 100%)",
                color: loading ? undefined : "#0F172A",
              }}
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                  <span className="opacity-0">コピペ用のテキストを生成</span>
                </>
              ) : (
                <span>コピペ用のテキストを生成</span>
              )}
            </button>
          </form>

          {/* 出力セクション */}
          {showOutput && (
            <div
              ref={outputRef}
              className="mt-8 animate-[fadeIn_0.5s_ease] border-t border-[#D4AF37]/20 pt-8"
            >
              <h2 className="mb-1 text-lg font-semibold text-[#D4AF37]">生成されたテキスト</h2>
              <p className="mb-4 text-sm text-slate-400">
                以下のテキストをコピーし、
                <strong className="text-[#D4AF37] text-base font-extrabold underline px-1">スクリーンショットを添付して</strong>
                「AI ONEメイングループオープンチャット」にアウトプットしてください。
              </p>
              <div className="relative">
                <textarea
                  readOnly
                  value={outputText}
                  rows={8}
                  className="w-full resize-y rounded-lg border border-[#D4AF37]/40 bg-black/25 px-4 py-3.5 font-mono text-[#D4AF37] outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition hover:border-[#D4AF37] hover:bg-[#D4AF37]/30"
                >
                  {copied ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      <span style={{ color: "#10B981" }}>コピー完了！</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                      コピーする
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* トースト通知 */}
      {toast && (
        <div
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 translate-y-0 rounded-lg px-7 py-3.5 text-sm font-semibold text-white shadow-2xl transition-all duration-400 z-50 whitespace-nowrap ${
            toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ===== 子コンポーネント =====

function CheckboxChip({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer select-none items-center gap-2 rounded-lg border px-3 py-2 text-sm text-white transition hover:bg-white/10 ${
        checked ? "border-[#D4AF37]/60 bg-[#D4AF37]/10" : "border-white/15 bg-white/5"
      }`}
    >
      <span
        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition ${
          checked ? "border-[#D4AF37] bg-[#D4AF37]" : "border-white/40 bg-transparent"
        }`}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label}
    </label>
  );
}

function CheckboxGroupField({
  label,
  options,
  group,
  otherPlaceholder,
  required,
}: {
  label: string;
  options: readonly string[];
  group: ReturnType<typeof useCheckboxGroup>;
  otherPlaceholder: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-white">
        {label}
        {required && <span className="ml-1 text-[#D4AF37]">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <CheckboxChip
            key={opt}
            label={opt}
            checked={group.checked.includes(opt)}
            onChange={() => group.toggle(opt)}
          />
        ))}
      </div>
      {group.checked.includes("その他") && (
        <input
          type="text"
          value={group.otherText}
          onChange={(e) => group.setOtherText(e.target.value)}
          placeholder={otherPlaceholder}
          className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/15"
        />
      )}
    </div>
  );
}
