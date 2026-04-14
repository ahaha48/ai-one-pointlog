import type { Metadata } from "next";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";
import toolConfig from "../../tool.config.json";

export const metadata: Metadata = {
  title: toolConfig.name,
  description: toolConfig.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="flex min-h-screen flex-col bg-gray-50">
        <AuthGuard>
          <Header />
          <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
            {children}
          </main>
          <Footer />
        </AuthGuard>
      </body>
    </html>
  );
}
