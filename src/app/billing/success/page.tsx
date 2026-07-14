"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, RefreshCw, Store, XCircle } from "lucide-react";
import { saveSelectedStore } from "@/src/context/StoreContext";
import { getStoreActivationStatus } from "@/src/features/billing/api";
import type { StoreActivationStatus } from "@/src/features/billing/types";
import { isStoreBusinessType } from "@/src/features/stores/businessTypes";
import { getToken } from "@/src/lib/authStorage";
import { getStoredTheme, type PayDeskTheme } from "@/src/lib/theme";

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
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    inactive: "border-rose-200 bg-rose-50 text-rose-700",
    skeleton: "bg-slate-200",
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
    success: "border-emerald-400/20 bg-emerald-950/30 text-emerald-200",
    inactive: "border-rose-400/20 bg-rose-950/30 text-rose-200",
    skeleton: "bg-white/10",
  },
} satisfies Record<PayDeskTheme, Record<string, string>>;

function BillingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = searchParams.get("storeId")?.trim() ?? "";
  const [theme, setTheme] = useState<PayDeskTheme>("light");
  const [activationStatus, setActivationStatus] = useState<StoreActivationStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const styles = useMemo(() => pageStyles[theme], [theme]);
  const isActive = activationStatus?.isActive === true;

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    queueMicrotask(() => {
      setTheme(getStoredTheme());
    });
  }, [router]);

  const checkActivationStatus = useCallback(async () => {
    if (!storeId) {
      setErrorMessage("Store not found.");
      return;
    }

    setIsChecking(true);
    setErrorMessage("");

    try {
      const status = await getStoreActivationStatus(storeId);
      setActivationStatus(status);
    } catch (error) {
      console.debug("Activation status lookup failed", error);
      setErrorMessage("Could not check activation status. Please try again.");
    } finally {
      setIsChecking(false);
    }
  }, [storeId]);

  useEffect(() => {
    queueMicrotask(() => {
      void checkActivationStatus();
    });
  }, [checkActivationStatus]);

  useEffect(() => {
    if (!storeId || isActive) {
      return;
    }

    const timer = window.setInterval(() => {
      void checkActivationStatus();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [checkActivationStatus, isActive, storeId]);

  const openDashboard = useCallback(() => {
    if (!activationStatus?.isActive) {
      return;
    }

    saveSelectedStore({
      id: activationStatus.storeId,
      name: activationStatus.name,
      address: activationStatus.address ?? undefined,
      businessType: isStoreBusinessType(activationStatus.businessType)
        ? activationStatus.businessType
        : "other",
      isActive: activationStatus.isActive,
    });
    router.push("/dashboard");
  }, [activationStatus, router]);

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
            <Image src="/paydesk-logo-transparent.png" alt="" width={34} height={34} priority className="size-8" />
            <span className={`text-2xl font-bold tracking-normal ${styles.logo}`}>PayDesk</span>
          </div>
          <Link href="/store-select" className={`inline-flex h-10 items-center rounded-[8px] border px-4 text-sm font-bold transition ${styles.control}`}>
            Store Select
          </Link>
        </header>

        <div className="flex flex-1 items-center px-5 py-8 sm:px-7 lg:px-9">
          <section className={`w-full rounded-[10px] border p-6 ${styles.panel}`}>
            <span className="grid size-12 place-items-center rounded-[8px] bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-6 text-sm font-bold text-[#7c5cff]">Payment received</p>
            <h1 className={`mt-2 text-3xl font-bold leading-tight tracking-normal ${styles.title}`}>
              {isActive ? "Store Activated" : "Store activation is processing"}
            </h1>
            <p className={`mt-3 max-w-[620px] text-base font-medium leading-6 ${styles.subtitle}`}>
              {isActive
                ? "Your store is now active and ready to use."
                : "Stripe confirmed your payment. PayDesk is waiting for the verified webhook before activating your store."}
            </p>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className={`rounded-[8px] border p-4 ${styles.border}`}>
                <dt className={`text-xs font-bold uppercase tracking-[0.08em] ${styles.muted}`}>Store</dt>
                <dd className="mt-2 flex items-center gap-2 text-lg font-extrabold">
                  <Store className="size-4 text-[#4f2df2]" aria-hidden="true" />
                  {activationStatus?.name ?? (storeId || "Pending store")}
                </dd>
              </div>
              <div
                className={`rounded-[8px] border p-4 ${
                  isActive ? styles.success : styles.inactive
                }`}
              >
                <dt className="text-xs font-bold uppercase tracking-[0.08em]">Activation Status</dt>
                <dd className="mt-2 flex items-center gap-2 text-lg font-extrabold">
                  {isChecking && !activationStatus ? (
                    <>
                      <span className={`h-7 w-28 animate-pulse rounded-[6px] ${styles.skeleton}`} />
                    </>
                  ) : isActive ? (
                    <>
                      <CheckCircle2 className="size-5" aria-hidden="true" />
                      Active
                    </>
                  ) : (
                    <>
                      <XCircle className="size-5" aria-hidden="true" />
                      Inactive
                    </>
                  )}
                </dd>
              </div>
            </dl>

            {errorMessage ? (
              <div className={`mt-5 rounded-[8px] border p-4 text-sm font-semibold ${styles.inactive}`}>
                {errorMessage}
              </div>
            ) : null}

            {isActive ? (
              <button
                type="button"
                onClick={openDashboard}
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-[7px] bg-[#4f2df2] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(79,45,242,0.28)] transition hover:bg-[#4322dd]"
              >
                Go to Dashboard
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void checkActivationStatus()}
                disabled={isChecking || !storeId}
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-[7px] bg-[#4f2df2] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(79,45,242,0.28)] transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isChecking ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
                Check activation status
              </button>
            )}
          </section>
        </div>
      </motion.section>
    </main>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<main className="grid min-h-dvh place-items-center bg-[#071126] text-[#eceaff]">Opening PayDesk...</main>}>
      <BillingSuccessContent />
    </Suspense>
  );
}
