"use client";

import { signOut } from "@/lib/auth";
import toolConfig from "../../tool.config.json";

export function Header() {
  return (
    <header className="border-b bg-white px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-gray-900">
            {toolConfig.name}
          </span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
            {toolConfig.category}
          </span>
        </div>
        <button
          onClick={() => signOut()}
          className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          ログアウト
        </button>
      </div>
    </header>
  );
}
