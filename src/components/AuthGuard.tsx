"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getCurrentUser, redirectToLogin, type AuthUser } from "@/lib/auth";
import { checkToolAccess } from "@/lib/api-client";
import { AccessDenied } from "./AccessDenied";

interface AuthGuardProps {
  children: ReactNode;
}

/** 認証 + アクセス権ガード: ログイン済み＆購入済みユーザーのみ表示 */
export function AuthGuard({ children }: AuthGuardProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then(async (currentUser) => {
        if (!currentUser) {
          redirectToLogin();
          return;
        }
        setUser(currentUser);

        const access = await checkToolAccess(currentUser.sub);
        setHasAccess(access);
        setLoading(false);
      })
      .catch(() => {
        redirectToLogin();
      });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">
            認証を確認しています...
          </p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
