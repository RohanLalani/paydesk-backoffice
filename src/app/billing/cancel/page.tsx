"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, XCircle } from "lucide-react";
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
    control:
      "border-indigo-200/10 bg-[#0b1026] text-slate-300 hover:border-[#7c5cff]/60 hover:text-[#c8c1ff]",
  },
} satisfies Record<PayDeskTheme, Record<string, string>>;

function BillingCancelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = searchParams.get("storeId")?.trim() ?? "";
  const [theme, setTheme] = useState<PayDeskTheme>("light");
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

  return (
    <main className={`min-h-dvh w-full px-4 py-6 sm:px-6 lg:px-8 ${styles.screen}`}>
      <motion.section
        className={`mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[760px] flex-col rounded-[14px] border backdrop-blur-xl ${styles.frame}`}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <header className={`flex items-center justify-between border-b px-5 py-4 sm:px-7 ${styles.border}`}>
          <div className="flex items-center gap-3">
            <Image src="/paydesk-logo-transparent.png" alt="" width={34} height={34} priority className="size-8" />
            <span className={`text-2xl font-bold tracking-normal ${styles.logo}`}>PayDesk</span>
          </div>
          <Link href="/store-select" className={`inline-flex h-10 items-center gap-2 rounded-[8px] border px-4 text-sm font-bold transition ${styles.control}`}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Store Select
          </Link>
        </header>

        <div className="flex flex-1 items-center px-5 py-8 sm:px-7 lg:px-9">
          <section className={`w-full rounded-[10px] border p-6 ${styles.panel}`}>
            <span className="grid size-12 place-items-center rounded-[8px] bg-red-500/15 text-red-400">
              <XCircle className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-6 text-sm font-bold text-[#7c5cff]">Payment canceled</p>
            <h1 className={`mt-2 text-3xl font-bold leading-tight tracking-normal ${styles.title}`}>
              No subscription was started
            </h1>
            <p className={`mt-3 max-w-[600px] text-base font-medium leading-6 ${styles.subtitle}`}>
              Payment was canceled and this store remains inactive. You can
              return to activation setup when you are ready.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={storeId ? `/activateStore?storeId=${encodeURIComponent(storeId)}` : "/createStore"}
                className="inline-flex h-11 items-center justify-center rounded-[7px] bg-[#4f2df2] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(79,45,242,0.28)] transition hover:bg-[#4322dd]"
              >
                Back to activation
              </Link>
              <Link
                href="/createStore"
                className={`inline-flex h-11 items-center justify-center rounded-[7px] border px-5 text-sm font-bold transition ${styles.control}`}
              >
                Draft stores
              </Link>
            </div>
          </section>
        </div>
      </motion.section>
    </main>
  );
}

export default function BillingCancelPage() {
  return (
    <Suspense fallback={<main className="grid min-h-dvh place-items-center bg-[#071126] text-[#eceaff]">Opening PayDesk...</main>}>
      <BillingCancelContent />
    </Suspense>
  );
}
