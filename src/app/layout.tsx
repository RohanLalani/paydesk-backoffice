import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from '@/src/components/providers/QueryProvider';

export const metadata: Metadata = {
  title: "PayDesk Back Office",
  description: "PayDesk back office application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-950 text-white"><QueryProvider>{children}</QueryProvider></body>
    </html>
  );
}
