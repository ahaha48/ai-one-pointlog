"use client";

import { signOut } from "@/lib/auth";

export function AccessDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-bold text-gray-900">
          アクセス権がありません
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          このツールを利用するには購入が必要です。
        </p>
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}
