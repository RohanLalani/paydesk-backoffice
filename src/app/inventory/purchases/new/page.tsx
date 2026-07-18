"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BackOfficeShell } from "@/src/components/layout/BackOfficeShell";

export default function NewPurchasePage() {
  return (
    <BackOfficeShell activeItem="inventory" requiredPermission="manage_purchases">
      {({ theme }) => {
        const isDark = theme === "dark";

        return (
          <section className={`rounded-[8px] border p-6 ${isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white"}`}>
            <h1 className="text-2xl font-bold tracking-normal">New Purchase</h1>
            <p className={`mt-2 max-w-[720px] text-sm font-semibold leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Start a new supplier purchase record. The full purchase-entry form will be added in a later step.
            </p>
            <Link
              href="/inventory/purchases"
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Purchases
            </Link>
          </section>
        );
      }}
    </BackOfficeShell>
  );
}
