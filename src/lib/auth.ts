/**
 * ONEグループ認証ライブラリ
 * auth.aione.co.jp（認証ゲートウェイ）経由のSSO Cookie認証を使用。
 * ⚠️ このファイルはテンプレートのコアです。変更しないでください。
 */
"use client";

import { config } from "./config";

const AUTH_GATEWAY_URL = "https://auth.aione.co.jp";
const ONE_ID_TOKEN_COOKIE = "one_id_token";

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  roles: string[];
}

/** one_id_token CookieからJWTペイロードをデコード */
function decodeIdToken(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

/** one_id_token Cookieを取得 */
function getOneIdToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${ONE_ID_TOKEN_COOKIE}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/** 現在のユーザー情報を取得 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = getOneIdToken();
  if (!token) return null;
  const payload = decodeIdToken(token);
  if (!payload || !payload["email"]) return null;
  return {
    sub: payload["sub"] as string,
    email: payload["email"] as string,
    name: (payload["name"] as string) ?? (payload["email"] as string),
    roles: (payload["cognito:groups"] as string[]) ?? [],
  };
}

/** JWTトークンを取得 */
export async function getIdToken(): Promise<string | null> {
  return getOneIdToken();
}

/** 認証ゲートウェイにリダイレクトしてログイン（元のURLに戻る） */
export function redirectToLogin(): void {
  const currentUrl = encodeURIComponent(window.location.href);
  window.location.href = `${AUTH_GATEWAY_URL}/login?redirect_url=${currentUrl}`;
}

/** ログアウト（Cookie削除 + 認証ゲートウェイのログアウト） */
export function signOut(): void {
  document.cookie = `${ONE_ID_TOKEN_COOKIE}=; domain=${config.cookieDomain}; path=/; max-age=0`;
  const callbackUrl = encodeURIComponent(window.location.origin);
  window.location.href = `https://${config.cognito.domain}/logout?client_id=${config.cognito.clientId}&logout_uri=${callbackUrl}`;
}
