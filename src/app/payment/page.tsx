"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Store } from "lucide-react";
import { fetchMyStores, normalizeStoreResponse } from "@/src/features/stores/api";
import type { Store as StoreRecord } from "@/src/features/stores/types";
import { getToken } from "@/src/lib/authStorage";
import { getStoredTheme, type PayDeskTheme } from "@/src/lib/theme";

const PLAN_LABELS = {
  plus: "Plus",
  advanced: "Advanced",
} as const;

const pageStyles = {
  light: {
    screen:
      "bg-[radial-gradient(circle_at_50%_0%,rgba(124,92,255,0.09)_0%,rgba(124,92,255,0.035)_36%,rgba(255,255,255,0)_62%),linear-gradient(180deg,#f8f7ff_0%,#f4f3fb_100%)] text-slate-950",
    frame: "border-[#d7d1ec] bg-[#f7f6fe]/95 shadow-[0_24px_80px_rgba(15,23,42,0.12)]",
    border: "border-[#d8d2ee]",
    panel: "border-[#d8d2ee] bg-white",
    title: "text-slate-950",
    subtitle: "text-slate-700",
    logo: "text-[#4f2df2]",
    muted: "text-slate-600",
    control:
      "border-[#d8d2ee] bg-white text-slate-700 hover:border-[#7c5cff]/50 hover:text-[#4f2df2]",
  },
  dark: {
    screen:
      "bg-[radial-gradient(circle_at_50%_0%,rgba(124,92,255,0.12)_0%,rgba(37,99,235,0.05)_35%,rgba(2,6,23,0)_63%),linear-gradient(180deg,#050a19_0%,#071126_100%)] text-[#eceaff]",
    frame: "border-indigo-200/12 bg-[#071126]/94 shadow-[0_28px_90px_rgba(0,0,0,0.36)]",
    border: "border-indigo-200/10",
    panel: "border-indigo-200/10 bg-[#0b1026]/88",
    title: "text-[#f3f1ff]",
    subtitle: "text-slate-300",
    logo: "text-[#c8c1ff]",
    muted: "text-slate-300",
    control:
      "border-indigo-200/10 bg-[#0b1026] text-slate-300 hover:border-[#7c5cff]/60 hover:text-[#c8c1ff]",
  },
} satisfies Record<PayDeskTheme, Record<string, string>>;

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = searchParams.get("storeId")?.trim() ?? "";
  const rawPlan = searchParams.get("plan");
  const plan = rawPlan === "advanced" ? "advanced" : "plus";
  const [theme, setTheme] = useState<PayDeskTheme>("light");
  const [store, setStore] = useState<StoreRecord | null>(null);
  const styles = useMemo(() => pageStyles[theme], [theme]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    queueMicrotask(() => {
      setTheme(getStoredTheme());
    });
  }, [router]);

  useEffect(() => {
    if (!storeId) {
      return;
    }

    let isMounted = true;

    async function loadStore() {
      try {
        const response = await fetchMyStores({ includeInactive: true });
        const stores = normalizeStoreResponse(response);

        if (isMounted) {
          setStore(stores.find((item) => item.id === storeId) ?? null);
        }
      } catch (error) {
        console.debug("Payment store lookup failed", error);
      }
    }

    void loadStore();

    return () => {
      isMounted = false;
    };
  }, [storeId]);

  return (
    <main className={`min-h-dvh w-full px-4 py-6 sm:px-6 lg:px-8 ${styles.screen}`}>
      <motion.section
        className={`mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[820px] flex-col rounded-[14px] border backdrop-blur-xl ${styles.frame}`}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <header className={`flex items-center justify-between border-b px-5 py-4 sm:px-7 ${styles.border}`}>
          <div className="flex items-center gap-3">
            <Image
              src="/paydesk-logo-transparent.png"
              alt=""
              width={34}
              height={34}
              priority
              className="size-8"
            />
            <span className={`text-2xl font-bold tracking-normal ${styles.logo}`}>PayDesk</span>
          </div>

          <Link
            href={storeId ? `/activateStore?storeId=${encodeURIComponent(storeId)}` : "/createStore"}
            className={`inline-flex h-10 items-center gap-2 rounded-[8px] border px-4 text-sm font-bold transition ${styles.control}`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </Link>
        </header>

        <div className="flex flex-1 items-center px-5 py-8 sm:px-7 lg:px-9">
          <section className={`w-full rounded-[10px] border p-6 ${styles.panel}`}>
            <span className="grid size-12 place-items-center rounded-[8px] bg-[#4f2df2] text-white">
              <CreditCard className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-6 text-sm font-bold text-[#7c5cff]">Payment</p>
            <h1 className={`mt-2 text-3xl font-bold leading-tight tracking-normal ${styles.title}`}>
              Payment setup coming next
            </h1>
            <p className={`mt-3 max-w-[600px] text-base font-medium leading-6 ${styles.subtitle}`}>
              The store has not been activated yet. Payment will complete the
              setup and activate the store in the next step.
            </p>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className={`rounded-[8px] border p-4 ${styles.border}`}>
                <dt className={`text-xs font-bold uppercase tracking-[0.08em] ${styles.muted}`}>
                  Store
                </dt>
                <dd className="mt-2 flex items-center gap-2 text-lg font-extrabold">
                  <Store className="size-4 text-[#4f2df2]" aria-hidden="true" />
                  {store?.name ?? (storeId || "Store not found")}
                </dd>
              </div>
              <div className={`rounded-[8px] border p-4 ${styles.border}`}>
                <dt className={`text-xs font-bold uppercase tracking-[0.08em] ${styles.muted}`}>
                  Selected plan
                </dt>
                <dd className="mt-2 text-lg font-extrabold">{PLAN_LABELS[plan]}</dd>
              </div>
            </dl>
          </section>
        </div>
      </motion.section>
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-dvh place-items-center bg-[#071126] text-[#eceaff]">
          <div className="rounded-[8px] border border-indigo-200/10 bg-[#0b1026]/88 px-5 py-4 text-sm font-bold">
            Opening PayDesk...
          </div>
        </main>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
