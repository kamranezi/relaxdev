import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://relaxdev.ru";

export const metadata: Metadata = {
  title: "Relax Dev - Современная платформа для запуска проектов с GitHub",
  description: "Relax Dev - Простой и удобный сервис для развертывания любого бота, сайта, приложения на серверах Yandex",
  keywords: ["Relax Dev", "деплой", "PaaS", "Yandex Cloud", "Next.js", "React", "веб-разработка"],
  authors: [{ name: "Relax Dev Team" }],
  creator: "Relax Dev",
  publisher: "Relax Dev",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    title: "Relax Dev - Современная платформа для запуска проектов с GitHub",
    description: "Relax Dev - Простой и удобный сервис для развертывания любого бота, сайта, приложения на серверах Yandex",
    siteName: "Relax Dev",
    images: [
      {
        url: `${siteUrl}/bg.webp`,
        width: 1200,
        height: 630,
        alt: "Relax Dev Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Relax Dev - Современная платформа для запуска проектов с GitHub",
    description: "Relax Dev - Простой и удобный сервис для развертывания любого бота, сайта, приложения на серверах Yandex",
    images: [`${siteUrl}/bg.webp`],
  },
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#0A0A0A" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
