import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mental Collective Intelligence",
  description: "note から収集した実体験をもとに、メンタルヘルスの回復方法を可視化するダッシュボード",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-slate-900`}
      >
        <div className="min-h-screen flex flex-col">
          <SiteNav />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}

function SiteNav() {
  const links = [
    { href: "/", label: "ホーム" },
    { href: "/analysts", label: "メソッド分析" },
    { href: "/about", label: "このプロジェクト" },
  ];
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between text-sm text-slate-600">
        <Link href="/" className="font-semibold tracking-wide text-slate-900">
          Mental Collective Intelligence
        </Link>
        <div className="flex items-center gap-6">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-slate-900">
              {link.label}
            </Link>
          ))}
          <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-xs">Beta</span>
        </div>
      </nav>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8 text-xs text-slate-500 space-y-1">
        <p>note 公開投稿の一次引用のみを扱い、削除リクエストに応じて速やかに反映します。</p>
        <p>医療行為の代替ではなく、同じ症状を経験した方の声を俯瞰するためのダッシュボードです。</p>
        <p>&copy; {new Date().getFullYear()} Mental Collective Intelligence</p>
      </div>
    </footer>
  );
}
