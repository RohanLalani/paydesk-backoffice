"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { BackOfficeShell, type BackOfficeShellContext } from "@/src/components/layout/BackOfficeShell";
import { getStoreBillingSummary, type StoreBillingSummary } from "@/src/features/billing/api";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function StoreBillingContent({ selectedStore, theme }: BackOfficeShellContext) {
  const isDark = theme === "dark";
  const [summary, setSummary] = useState<StoreBillingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      setIsLoading(true);
      setError("");
    });

    getStoreBillingSummary(selectedStore.id)
      .then((response) => {
        if (mounted) {
          setSummary(response);
        }
      })
      .catch((billingError) => {
        if (mounted) {
          setError(billingError instanceof Error ? billingError.message : "Could not load billing.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [selectedStore.id]);

  return (
    <section className={`rounded-[8px] border p-6 ${isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white"}`}>
      <h1 className="text-2xl font-bold tracking-normal">Billing</h1>
      <p className={`mt-2 max-w-[720px] text-sm font-semibold leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        Review the base subscription and paid add-ons for this store.
      </p>

      {isLoading ? (
        <div className="mt-8 flex items-center gap-2 text-sm font-bold">
          <Loader2 className="size-4 animate-spin text-[#4f2df2]" aria-hidden="true" />
          Loading billing...
        </div>
      ) : error ? (
        <p className="mt-8 rounded-[8px] border border-red-500/25 bg-red-500/10 p-3 text-sm font-bold text-red-500">{error}</p>
      ) : summary ? (
        <div className="mt-8 grid gap-4">
          <div className={`rounded-[8px] border p-5 ${isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]"}`}>
            <h2 className="text-base font-bold">Base subscription</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Plan</dt>
                <dd className="mt-1 text-sm font-bold capitalize">{summary.basePlan ?? "Not active"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Monthly amount</dt>
                <dd className="mt-1 text-sm font-bold">{money(summary.baseMonthlyAmount)}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Status</dt>
                <dd className="mt-1 text-sm font-bold capitalize">{summary.subscriptionStatus ?? "Unavailable"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Next billing date</dt>
                <dd className="mt-1 text-sm font-bold">
                  {summary.nextBillingDate ? new Date(summary.nextBillingDate).toLocaleDateString() : "Unavailable"}
                </dd>
              </div>
            </dl>
          </div>

          <div className={`rounded-[8px] border p-5 ${isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]"}`}>
            <h2 className="text-base font-bold">Add-ons</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Loyalty</dt>
                <dd className="mt-1 text-sm font-bold capitalize">{summary.loyalty.status.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Loyalty amount</dt>
                <dd className="mt-1 text-sm font-bold">{money(summary.loyaltyMonthlyAmount)}</dd>
              </div>
            </dl>
            <Link href="/services" className="mt-4 inline-flex h-10 items-center rounded-[7px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd]">
              Manage services
            </Link>
          </div>

          <div className={`rounded-[8px] border p-5 ${isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]"}`}>
            <h2 className="text-base font-bold">Estimated recurring monthly total</h2>
            <p className="mt-3 text-3xl font-extrabold text-[#4f2df2]">{money(summary.estimatedMonthlyTotal)}</p>
            <p className={`mt-2 text-sm font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              This estimate is based on synchronized subscription data. Stripe invoices remain authoritative.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function BillingPage() {
  return (
    <BackOfficeShell activeItem="billing">
      {(context) => <StoreBillingContent {...context} />}
    </BackOfficeShell>
  );
}
