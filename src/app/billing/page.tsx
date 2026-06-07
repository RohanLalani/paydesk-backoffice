"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, ExternalLink, Store } from "lucide-react";
import { getStoredTheme, type PayDeskTheme } from "@/src/lib/theme";

const PENDING_STORE_KEY = "paydesk-pending-store-create";

type PendingStore = {
  name?: string;
  address?: string | null;
};

const billingStyles = {
  light: {
    screen: "bg-[#F8FAFC] text-slate-950",
    card: "border-[#DDD6FE] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)]",
    title: "text-[#0F172A]",
    body: "text-[#475569]",
    detail: "border-[#E2E8F0] bg-[#F8FAFC] text-[#334155]",
    secondary:
      "border-[#DDD6FE] bg-white text-slate-700 hover:border-[#4F22F2]/50 hover:text-[#4F22F2]",
  },
  dark: {
    screen: "bg-[#020617] text-[#F8FAFC]",
    card: "border-[rgba(148,163,184,0.18)] bg-[#0F172A] shadow-[0_28px_90px_rgba(0,0,0,0.44)]",
    title: "text-[#F8FAFC]",
    body: "text-[#CBD5E1]",
    detail: "border-[rgba(148,163,184,0.18)] bg-[#0B1020] text-[#E2E8F0]",
    secondary:
      "border-[rgba(148,163,184,0.18)] bg-transparent text-slate-200 hover:border-[#7C5CFF]/60 hover:text-white",
  },
} satisfies Record<PayDeskTheme, Record<string, string>>;

function readPendingStore() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(PENDING_STORE_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as PendingStore;
  } catch {
    window.localStorage.removeItem(PENDING_STORE_KEY);
    return null;
  }
}

export default function BillingPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<PayDeskTheme>("light");
  const [pendingStore, setPendingStore] = useState<PendingStore | null>(null);
  const styles = useMemo(() => billingStyles[theme], [theme]);

  useEffect(() => {
    setTheme(getStoredTheme());
    setPendingStore(readPendingStore());
  }, []);

  return (
    <main className={`grid min-h-dvh w-full place-items-center px-4 py-8 ${styles.screen}`}>
      <motion.section
        className={`w-full max-w-[720px] rounded-[14px] border p-6 sm:p-8 ${styles.card}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="flex size-12 items-center justify-center rounded-[10px] bg-[#4F22F2] text-white shadow-[0_14px_28px_rgba(79,34,242,0.28)]">
          <CreditCard className="size-6" aria-hidden="true" />
        </div>

        <h1 className={`mt-6 text-3xl font-bold leading-tight tracking-normal ${styles.title}`}>
          Upgrade Your Plan
        </h1>
        <p className={`mt-3 max-w-[560px] text-base font-medium leading-7 ${styles.body}`}>
          You need an active subscription or available store slot to create another
          store.
        </p>

        <div className={`mt-7 rounded-[10px] border p-4 ${styles.detail}`}>
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Store className="size-4 text-[#4F22F2]" aria-hidden="true" />
            Pending store
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.08em] opacity-70">
                Name
              </dt>
              <dd className="mt-1 text-sm font-semibold">
                {pendingStore?.name || "No pending store"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.08em] opacity-70">
                Address
              </dt>
              <dd className="mt-1 text-sm font-semibold">
                {pendingStore?.address || "Not provided"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/store-select")}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-[7px] border px-5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F22F2]/30 ${styles.secondary}`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Return to Store Selector
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[7px] bg-[#4F22F2] px-5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(79,34,242,0.28)] transition hover:bg-[#4320d4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F22F2]/35"
          >
            Continue to Payment
            <ExternalLink className="size-4" aria-hidden="true" />
          </motion.button>
        </div>
      </motion.section>
    </main>
  );
}
