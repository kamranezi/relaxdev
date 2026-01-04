import type { Metadata } from "next";
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
  title: "RuVercel - Российская платформа для деплоя",
  description: "RuVercel - современная PaaS платформа для деплоя проектов на Yandex Cloud. Деплой Next.js, React и других приложений за секунды.",
  keywords: ["RuVercel", "деплой", "PaaS", "Yandex Cloud", "Next.js", "React", "веб-разработка"],
  authors: [{ name: "RuVercel Team" }],
  creator: "RuVercel",
  publisher: "RuVercel",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://ruvercel.app"),
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    title: "RuVercel - Российская платформа для деплоя",
    description: "RuVercel - современная PaaS платформа для деплоя проектов на Yandex Cloud",
    siteName: "RuVercel",
    images: [
      {
        url: "/bg.webp",
        width: 1200,
        height: 630,
        alt: "RuVercel Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RuVercel - Российская платформа для деплоя",
    description: "RuVercel - современная PaaS платформа для деплоя проектов на Yandex Cloud",
    images: ["/bg.webp"],
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#0A0A0A" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
