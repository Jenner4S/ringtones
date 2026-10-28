import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RingtoneMaster · v4",
  description: "AI 挑出最炸的那段 · 丝滑铃声一键出 —— 专业 iPhone 铃声 Agent",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RingtoneMaster",
  },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192" }, { url: "/icon-512.png", sizes: "512x512" }],
    apple: [{ url: "/icon-192.png", sizes: "192x192" }],
    shortcut: [{ url: "/icon-192.png", sizes: "192x192" }],
  },
  category: "music",
  keywords: ["铃声", "iPhone", "AI", "音频分析", "铃声制作", "ringtone"],
  authors: [{ name: "RingtoneMaster Team" }],
  openGraph: {
    title: "RingtoneMaster",
    description: "AI 挑出最炸的那段 · 丝滑铃声一键出",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08080C" },
    { media: "(prefers-color-scheme: light)", color: "#F7F8FA" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="RingtoneMaster" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-icon-precomposed" href="/icon-192.png" />
      </head>
      <body className="relative min-h-screen">
        <RegisterServiceWorker />
        <AmbientBackground />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}

function RegisterServiceWorker() {
  if (typeof window !== "undefined") {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      });
    }
  }
  return null;
}

function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
      <div className="absolute left-1/2 top-0 h-[600px] w-[1100px] -translate-x-1/2 rounded-full opacity-70 animate-breath"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 0%, rgba(0, 229, 255, 0.14) 0%, rgba(124, 92, 255, 0.08) 45%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="absolute -bottom-40 left-1/4 h-[500px] w-[500px] rounded-full opacity-40 animate-float-slow"
        style={{
          background: "radial-gradient(50% 50%, rgba(124,92,255,0.10) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
    </div>
  );
}
