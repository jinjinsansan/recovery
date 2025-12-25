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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-slate-950 text-white">
          <SiteNav />
          {children}
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
    <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between text-sm">
        <Link href="/" className="font-semibold tracking-wide text-white">
          Mental Collective Intelligence
        </Link>
        <div className="flex items-center gap-6 text-slate-300">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </Link>
          ))}
          <span className="px-3 py-1 rounded-full bg-white/10 text-xs text-white">Beta</span>
        </div>
      </nav>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8 text-xs text-slate-400 space-y-1">
        <p>note 公開投稿の一次引用のみを扱い、削除リクエストに応じて速やかに反映します。</p>
        <p>医療行為の代替ではなく、同じ症状を経験した方の声を俯瞰するためのダッシュボードです。</p>
        <p>&copy; {new Date().getFullYear()} Mental Collective Intelligence</p>
      </div>
    </footer>
  );
}
