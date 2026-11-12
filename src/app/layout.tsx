import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";

import { Providers } from "@/providers/Providers";
import { langFromCookieValue } from "@/lib/i18n/storage";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://regexlab.indevs.in"
).replace(/\/+$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Regex Lab — Escribe, entiende y depura RegEx sin dolor",
    template: "%s | Regex Lab",
  },
  description:
    "Editor visual de RegEx con tester en tiempo real, explicación token-a-token, biblioteca personal y export multi-lenguaje.",
  keywords: [
    "regex",
    "regular expressions",
    "regex tester",
    "regex builder",
    "regex cheatsheet",
    "developer tools",
    "expresiones regulares",
  ],
  authors: [{ name: "Regex Lab" }],
  creator: "Regex Lab",
  publisher: "Regex Lab",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: SITE_URL,
    siteName: "Regex Lab",
    title: "Regex Lab — Escribe, entiende y depura RegEx sin dolor",
    description:
      "Editor visual de RegEx con tester en tiempo real, explicación token-a-token, biblioteca personal y export multi-lenguaje.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Regex Lab - Visual Regex Editor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Regex Lab",
    description: "Escribe, entiende y depura RegEx sin dolor",
    images: ["/og.png"],
  },
  icons: {

    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  verification:{
    google: 'Kci8jKdhEqpmW976SZobsWBV0hR9tgWdc-ORNQg7JwU',
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const cookieStore = await cookies();
  const lang = langFromCookieValue(cookieStore.get("rl-lang")?.value) ?? "es";

  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>

      </head>
      <body className="min-h-screen flex flex-col">
        <Providers defaultLang={lang}>{children}</Providers>
      </body>
    </html>
  );
}