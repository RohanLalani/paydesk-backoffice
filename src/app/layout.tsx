import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/src/components/providers/QueryProvider";
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
  title: "PayDesk Back Office",
  description: "PayDesk back office application",
};

const themeInitScript = `
try {
  var theme = window.localStorage.getItem("paydesk-theme");
  if (theme !== "dark" && theme !== "light") {
    theme = "light";
  }
  document.documentElement.dataset.theme = theme;
} catch (_) {
  document.documentElement.dataset.theme = "light";
}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full bg-slate-950 text-white">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
