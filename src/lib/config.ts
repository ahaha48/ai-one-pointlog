/**
 * 環境変数の一元管理
 * ⚠️ このファイルはテンプレートのコアです。変更しないでください。
 */

export const config = {
  cognito: {
    userPoolId: process.env["NEXT_PUBLIC_COGNITO_USER_POOL_ID"] ?? "",
    clientId: process.env["NEXT_PUBLIC_COGNITO_CLIENT_ID"] ?? "",
    domain: process.env["NEXT_PUBLIC_COGNITO_DOMAIN"] ?? "",
    region: "ap-northeast-1",
  },
  api: {
    baseUrl: process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:3000/api/v1",
    toolId: process.env["NEXT_PUBLIC_TOOL_ID"] ?? "",
  },
  cookieDomain: process.env["NEXT_PUBLIC_COOKIE_DOMAIN"] ?? ".aione.co.jp",
} as const;
