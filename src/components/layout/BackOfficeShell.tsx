"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeftRight, Bell, Store as StoreIcon } from "lucide-react";
import type { AuthAccount } from "@/src/features/auth/types";
import type { Store } from "@/src/features/stores/types";
import type { StoreCapabilities } from "@/src/features/stores/types";
import { useStoreCapabilities } from "@/src/features/stores/capabilities";
import { getSelectedStore } from "@/src/context/StoreContext";
import { getAccount, getToken } from "@/src/lib/authStorage";
import { getStoreTypeConfig } from "@/src/lib/storeTypeConfig";
import { getStoredTheme, type PayDeskTheme } from "@/src/lib/theme";
import { BackOfficeSidebar, type BackOfficeNavKey } from "@/src/components/layout/BackOfficeSidebar";
import { ENABLE_LIVE_SUPPORT, LiveSupportCard } from "@/src/components/support/LiveSupportCard";

type BackOfficeShellProps = {
  activeItem?: BackOfficeNavKey;
  requiredPermission?: string;
  sectionSidebar?: (context: BackOfficeShellContext) => ReactNode;
  children: (context: BackOfficeShellContext) => ReactNode;
};

export type BackOfficeShellContext = {
  theme: PayDeskTheme;
  account: AuthAccount | null;
  selectedStore: Store;
  capabilities: StoreCapabilities;
};

function formatStatus(store: Store) {
  const rawStatus = String(store.status ?? "").toLowerCase();

  if (store.isActive === false || rawStatus.includes("inactive")) {
    return "Inactive";
  }

  if (rawStatus.includes("maintenance")) {
    return "Maintenance";
  }

  return "Active";
}

function getInitials(account: AuthAccount | null) {
  const source = account?.name || account?.email || "PayDesk";
  const parts = source.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? "P"}${parts[1]?.[0] ?? "D"}`.toUpperCase();
}

function hasPermission(account: AuthAccount | null, permission: string) {
  return account?.role === "owner" || account?.role === "partner" || account?.permissions?.includes(permission) === true;
}

export function BackOfficeShell({
  activeItem = "dashboard",
  requiredPermission,
  sectionSidebar,
  children,
}: BackOfficeShellProps) {
  const router = useRouter();
  const [theme, setTheme] = useState<PayDeskTheme>("light");
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { capabilities } = useStoreCapabilities(selectedStore);

  useEffect(() => {
    queueMicrotask(() => {
      setTheme(getStoredTheme());
      setAccount(getAccount());
    });

    if (!getToken()) {
      router.replace("/login");
      return;
    }

    const store = getSelectedStore();

    if (!store) {
      router.replace("/store-select");
      return;
    }

    queueMicrotask(() => {
      setSelectedStore(store);
      setIsReady(true);
    });
  }, [router]);

  useEffect(() => {
    if (!isReady || !requiredPermission || hasPermission(account, requiredPermission)) {
      return;
    }

    router.replace("/dashboard");
  }, [account, isReady, requiredPermission, router]);

  const shellStyles = useMemo(() => {
    const isDark = theme === "dark";

    return {
      isDark,
      screen: isDark
        ? "bg-[#020617] text-[#f4f1ff]"
        : "bg-[linear-gradient(180deg,#f8f7ff_0%,#f8fafc_100%)] text-slate-950",
      main: isDark ? "bg-[#020617]" : "bg-[#f8fafc]",
      header: isDark ? "border-slate-400/15 bg-[#0b1224]" : "border-[#ded8f3] bg-white",
      muted: isDark ? "text-slate-400" : "text-slate-500",
      control: isDark
        ? "border-slate-400/15 bg-white/[0.04] text-slate-300 hover:border-[#7c5cff]/60"
        : "border-[#ded8f3] bg-white text-slate-600 hover:border-[#7c5cff]/60 hover:text-[#4f2df2]",
    };
  }, [theme]);

  if (!isReady || !selectedStore) {
    return (
      <main className={`grid min-h-dvh place-items-center ${shellStyles.screen}`}>
        <div className={`rounded-[8px] border px-5 py-4 text-sm font-bold ${shellStyles.header}`}>
          Opening PayDesk dashboard...
        </div>
      </main>
    );
  }

  const typeConfig = getStoreTypeConfig(selectedStore);
  const status = formatStatus(selectedStore);

  if (requiredPermission && !hasPermission(account, requiredPermission)) {
    return (
      <main className={`grid min-h-dvh place-items-center ${shellStyles.screen}`}>
        <div className={`rounded-[8px] border px-5 py-4 text-sm font-bold ${shellStyles.header}`}>
          Checking permissions...
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-dvh ${shellStyles.screen}`}>
      <div className="flex min-h-dvh">
        <BackOfficeSidebar activeItem={activeItem} account={account} theme={theme} capabilities={capabilities} />

        <section className={`min-w-0 flex-1 pb-20 lg:pb-0 ${shellStyles.main}`}>
          <header className={`sticky top-0 z-20 flex min-h-20 items-center justify-between gap-4 border-b px-4 py-3 sm:px-6 ${shellStyles.header}`}>
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/store-select")}
                className={`grid size-10 shrink-0 place-items-center rounded-[8px] border transition ${shellStyles.control}`}
                aria-label="Switch store"
                title="Switch store"
              >
                <ArrowLeftRight className="size-5" aria-hidden="true" />
              </button>

              <span className="grid size-10 shrink-0 place-items-center rounded-[8px] bg-[#4f2df2] text-white">
                <StoreIcon className="size-5" aria-hidden="true" />
              </span>

              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h1 className="truncate text-lg font-extrabold leading-none tracking-normal sm:text-xl">
                    {selectedStore.name}
                  </h1>
                  <span className={`rounded-[4px] px-2 py-1 text-[10px] font-extrabold uppercase leading-none ${shellStyles.isDark ? "bg-white/8 text-slate-300" : "bg-[#f0edff] text-[#4f2df2]"}`}>
                    {typeConfig.label}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-[4px] bg-emerald-500/15 px-2 py-1 text-[10px] font-extrabold uppercase leading-none text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                    {status}
                  </span>
                </div>
                <p className={`mt-1 max-w-[520px] truncate text-xs font-semibold ${shellStyles.muted}`}>
                  {selectedStore.address || "Address unavailable"}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className={`grid size-10 place-items-center rounded-[8px] border transition ${shellStyles.control}`}
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => router.push("/settings/account")}
                className="grid size-10 place-items-center rounded-full border border-[#7c5cff]/50 bg-[#101827] text-xs font-extrabold text-[#c8c1ff] shadow-[0_0_0_3px_rgba(124,92,255,0.12)] transition hover:border-[#c8c1ff]"
                aria-label="Account settings"
                title={account?.name || account?.email || "Account settings"}
              >
                {getInitials(account)}
              </button>
            </div>
          </header>

          <div className="flex min-w-0 flex-1 flex-col lg:flex-row">
            {sectionSidebar?.({ theme, account, selectedStore, capabilities })}

            <div className="mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
              {children({ theme, account, selectedStore, capabilities })}
            </div>
          </div>

          {ENABLE_LIVE_SUPPORT ? (
            <div className="fixed bottom-6 left-6 hidden w-[190px] lg:block">
              <LiveSupportCard theme={theme} />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
