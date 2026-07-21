"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeftRight, Bell, CheckCircle2, ChevronDown, Menu, Store as StoreIcon, X } from "lucide-react";
import type { AuthAccount } from "@/src/features/auth/types";
import type { Store } from "@/src/features/stores/types";
import type { StoreCapabilities } from "@/src/features/stores/types";
import { useStoreCapabilities } from "@/src/features/stores/capabilities";
import { getSelectedStore } from "@/src/context/StoreContext";
import { getAccount, getToken } from "@/src/lib/authStorage";
import { getStoreTypeConfig } from "@/src/lib/storeTypeConfig";
import { applyThemeToDocument, getStoredTheme, type PayDeskTheme } from "@/src/lib/theme";
import { BackOfficeSidebar, type BackOfficeNavKey } from "@/src/components/layout/BackOfficeSidebar";
import { ContextualSidebar } from "@/src/components/layout/ContextualSidebar";
import { ENABLE_LIVE_SUPPORT, LiveSupportCard } from "@/src/components/support/LiveSupportCard";
import {
  canShowPrimaryNavigationItem,
  canShowSecondaryNavigationItem,
  dashboardItem,
  primaryNavigation,
  sidebarCategories,
  type PrimaryNavigationItem,
  type SecondaryNavigationItem,
} from "@/src/features/navigation/primaryNavigation";
import { isRouteActive, resolveRouteMatch } from "@/src/features/navigation/routeMatching";

type BackOfficeShellProps = {
  activeItem?: BackOfficeNavKey;
  requiredPermission?: string;
  sectionSidebar?: (context: BackOfficeShellContext) => ReactNode;
  layoutMode?: "default" | "workspace";
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

type MobileNavigationDrawerProps = {
  open: boolean;
  onClose: () => void;
  account: AuthAccount | null;
  theme: PayDeskTheme;
  pathname: string;
  items: PrimaryNavigationItem[];
  activePrimaryItem: PrimaryNavigationItem | null;
};

function MobileNavigationDrawer({
  open,
  onClose,
  account,
  theme,
  pathname,
  items,
  activePrimaryItem,
}: MobileNavigationDrawerProps) {
  const isDark = theme === "dark";
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<PrimaryNavigationItem["category"] | null>(
    activePrimaryItem?.category ?? "general",
  );
  const [expandedPrimaryKey, setExpandedPrimaryKey] = useState<BackOfficeNavKey | null>(
    activePrimaryItem?.key ?? dashboardItem.key,
  );

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;

    queueMicrotask(() => {
      setExpandedCategory(activePrimaryItem?.category ?? "general");
      setExpandedPrimaryKey(activePrimaryItem?.key ?? dashboardItem.key);
    });
  }, [activePrimaryItem, open]);

  const panelClass = isDark ? "border-slate-400/15 bg-[#0b1224] text-[#f4f1ff]" : "border-[#ded8f3] bg-white text-slate-950";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const inactiveClass = isDark
    ? "text-slate-300 hover:bg-white/[0.05] hover:text-white"
    : "text-slate-700 hover:bg-[#f0edff] hover:text-[#4f2df2]";
  const visibleDashboardItem = items.find((item) => item.key === dashboardItem.key);

  const renderSecondaryLink = (item: SecondaryNavigationItem) => {
    const Icon = item.icon;
    const isActive = isRouteActive(pathname, item.href, item.exact) || item.match?.some((match) => isRouteActive(pathname, match, item.exact));

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        aria-current={isActive ? "page" : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-[8px] px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35 ${
          isActive
            ? "bg-[#f0edff] text-[#4f2df2] shadow-[inset_3px_0_0_#4f2df2]"
            : inactiveClass
        }`}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {isActive ? <CheckCircle2 className="size-4 shrink-0" aria-label="Current page" /> : null}
      </Link>
    );
  };

  const renderPrimaryLink = (item: PrimaryNavigationItem) => {
    const Icon = item.icon;
    const isActive = activePrimaryItem?.key === item.key;
    const secondaryItems = item.secondaryNavigation?.filter((secondary) =>
      canShowSecondaryNavigationItem(account, secondary),
    );
    const hasChildren = Boolean(secondaryItems?.length);
    const isExpanded = expandedPrimaryKey === item.key;

    if (hasChildren && secondaryItems) {
      return (
        <div key={item.key} className="space-y-1">
          <button
            type="button"
            onClick={() => setExpandedPrimaryKey((current) => (current === item.key ? null : item.key))}
            className={`flex min-h-11 w-full items-center gap-3 rounded-[8px] px-3 text-left text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35 ${
              isActive ? "bg-[#4f2df2] text-white shadow-[inset_3px_0_0_#c8c1ff]" : inactiveClass
            }`}
            aria-expanded={isExpanded}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            <ChevronDown className={`size-4 shrink-0 transition ${isExpanded ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {isExpanded ? (
            <div className={`ml-4 space-y-1 border-l pl-3 ${isDark ? "border-slate-400/15" : "border-[#ded8f3]"}`}>
              <Link
                href={item.href}
                onClick={onClose}
                className={`flex min-h-11 items-center gap-2 rounded-[8px] px-3 text-sm font-bold transition ${
                  isRouteActive(pathname, item.href, item.exact)
                    ? "bg-[#4f2df2]/12 text-[#4f2df2] shadow-[inset_3px_0_0_#4f2df2]"
                    : inactiveClass
                }`}
              >
                <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                <span className="truncate">{item.label} Home</span>
              </Link>
              {secondaryItems.map((secondary) => renderSecondaryLink(secondary))}
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <Link
        key={item.key}
        href={item.href}
        onClick={onClose}
        aria-current={isActive ? "page" : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-[8px] px-3 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35 ${
          isActive ? "bg-[#4f2df2] text-white shadow-[inset_3px_0_0_#c8c1ff]" : inactiveClass
        }`}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {isActive ? <CheckCircle2 className="size-4 shrink-0" aria-label="Current section" /> : null}
      </Link>
    );
  };

  return (
    <div className={`fixed inset-0 z-[70] md:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <button
        type="button"
        className={`absolute inset-0 bg-slate-950/55 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
        aria-label="Close navigation drawer backdrop"
        tabIndex={open ? 0 : -1}
      />
      <aside
        id="mobile-navigation-drawer"
        className={`absolute inset-y-0 left-0 flex w-[85vw] max-w-[320px] flex-col border-r shadow-[0_28px_70px_rgba(15,23,42,0.32)] transition-transform duration-200 ${panelClass} ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        <div className={`flex min-h-14 items-center justify-between border-b px-4 ${isDark ? "border-slate-400/15" : "border-[#ded8f3]"}`}>
          <div>
            <p className="text-base font-extrabold">PayDesk</p>
            <p className={`text-[10px] font-extrabold uppercase tracking-[0.08em] ${mutedClass}`}>Navigation</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className={`grid size-10 place-items-center rounded-[8px] border transition ${isDark ? "border-slate-400/15 hover:bg-white/[0.06]" : "border-[#ded8f3] hover:bg-[#f0edff]"}`}
            aria-label="Close navigation menu"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-4" aria-label="Mobile back office navigation">
          {visibleDashboardItem ? <section>{renderPrimaryLink(visibleDashboardItem)}</section> : null}
          {sidebarCategories.map((category) => {
            const categoryItems = items.filter((item) => item.category === category.key && item.key !== dashboardItem.key);
            const isExpanded = expandedCategory === category.key;
            const hasActiveItem = activePrimaryItem?.category === category.key;

            if (!categoryItems.length) return null;

            return (
              <section key={category.key}>
                <button
                  type="button"
                  onClick={() => setExpandedCategory((current) => (current === category.key ? null : category.key))}
                  className={`flex min-h-11 w-full items-center justify-between rounded-[8px] px-3 text-left text-xs font-extrabold uppercase tracking-[0.08em] transition ${
                    hasActiveItem ? "bg-[#4f2df2]/10 text-[#4f2df2]" : mutedClass
                  }`}
                  aria-expanded={isExpanded}
                >
                  <span>{category.label}</span>
                  <ChevronDown className={`size-4 transition ${isExpanded ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                {isExpanded ? (
                  <div className="mt-2 space-y-1">
                    {categoryItems.map((item) => renderPrimaryLink(item))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}

export function BackOfficeShell({
  activeItem = "dashboard",
  requiredPermission,
  sectionSidebar,
  layoutMode = "default",
  children,
}: BackOfficeShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [theme, setTheme] = useState<PayDeskTheme>("light");
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const { capabilities } = useStoreCapabilities(selectedStore);

  useEffect(() => {
    queueMicrotask(() => {
      const storedTheme = getStoredTheme();
      setTheme(storedTheme);
      applyThemeToDocument(storedTheme);
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

  const closeMobileNavigation = useCallback(() => {
    setIsMobileNavOpen(false);
    window.setTimeout(() => mobileMenuButtonRef.current?.focus(), 0);
  }, []);

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
  const visiblePrimaryItems = primaryNavigation.filter((item) =>
    canShowPrimaryNavigationItem(account, item, capabilities),
  );
  const activePrimaryItem = resolveRouteMatch(pathname, visiblePrimaryItems);
  const visibleSecondaryItems = activePrimaryItem?.secondaryNavigation?.filter((item) =>
    canShowSecondaryNavigationItem(account, item),
  );
  const automaticSectionSidebar =
    layoutMode === "workspace" ? null : visibleSecondaryItems?.length && activePrimaryItem?.secondaryLabel ? (
      <ContextualSidebar
        label={activePrimaryItem.secondaryLabel}
        items={visibleSecondaryItems}
        theme={theme}
      />
    ) : null;
  const renderedSectionSidebar = sectionSidebar?.({ theme, account, selectedStore, capabilities }) ?? automaticSectionSidebar;

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
    <div data-paydesk-theme={theme} className={`min-h-dvh md:h-dvh md:overflow-hidden ${shellStyles.screen}`}>
      <MobileNavigationDrawer
        open={isMobileNavOpen}
        onClose={closeMobileNavigation}
        account={account}
        theme={theme}
        pathname={pathname}
        items={visiblePrimaryItems}
        activePrimaryItem={activePrimaryItem}
      />

      <div className="flex min-h-dvh md:h-dvh md:min-h-0 md:overflow-hidden">
        <BackOfficeSidebar activeItem={activeItem} account={account} theme={theme} capabilities={capabilities} />

        <section className={`min-w-0 flex-1 pb-24 md:flex md:min-h-0 md:flex-col md:overflow-hidden md:pb-0 ${shellStyles.main}`}>
          <header className={`sticky top-0 z-20 flex min-h-16 flex-none items-center justify-between gap-2 border-b px-3 py-2 sm:px-4 md:min-h-20 md:gap-4 md:px-6 md:py-3 ${shellStyles.header}`}>
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                ref={mobileMenuButtonRef}
                type="button"
                onClick={() => setIsMobileNavOpen(true)}
                className={`grid size-10 shrink-0 place-items-center rounded-[8px] border transition md:hidden ${shellStyles.control}`}
                aria-label="Open navigation menu"
                aria-expanded={isMobileNavOpen}
                aria-controls="mobile-navigation-drawer"
                title="Open navigation"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => router.push("/store-select")}
                className={`hidden size-10 shrink-0 place-items-center rounded-[8px] border transition sm:grid ${shellStyles.control}`}
                aria-label="Switch store"
                title="Switch store"
              >
                <ArrowLeftRight className="size-5" aria-hidden="true" />
              </button>

              <span className="hidden size-10 shrink-0 place-items-center rounded-[8px] bg-[#4f2df2] text-white sm:grid">
                <StoreIcon className="size-5" aria-hidden="true" />
              </span>

              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                  <h1 className="min-w-0 truncate text-sm font-extrabold leading-none tracking-normal sm:text-lg md:text-xl">
                    {selectedStore.name}
                  </h1>
                  <span className={`hidden rounded-[4px] px-2 py-1 text-[10px] font-extrabold uppercase leading-none sm:inline-flex ${shellStyles.isDark ? "bg-white/8 text-slate-300" : "bg-[#f0edff] text-[#4f2df2]"}`}>
                    {typeConfig.label}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-[4px] bg-emerald-500/15 px-2 py-1 text-[10px] font-extrabold uppercase leading-none text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                    {status}
                  </span>
                </div>
                <p className={`mt-1 hidden max-w-[520px] truncate text-xs font-semibold sm:block ${shellStyles.muted}`}>
                  {selectedStore.address || "Address unavailable"}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className={`grid size-9 place-items-center rounded-[8px] border transition sm:size-10 ${shellStyles.control}`}
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="size-4 sm:size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => router.push("/settings/account")}
                className="grid size-9 place-items-center rounded-full border border-[#7c5cff]/50 bg-[#101827] text-[11px] font-extrabold text-[#c8c1ff] shadow-[0_0_0_3px_rgba(124,92,255,0.12)] transition hover:border-[#c8c1ff] sm:size-10 sm:text-xs"
                aria-label="Account settings"
                title={account?.name || account?.email || "Account settings"}
              >
                {getInitials(account)}
              </button>
            </div>
          </header>

          <div className="flex min-w-0 flex-1 flex-col md:min-h-0 md:overflow-hidden md:flex-row">
            {renderedSectionSidebar}

            <div
              className={`mx-auto w-full px-4 pb-28 pt-5 sm:px-6 md:h-full md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain md:px-8 md:py-7 ${layoutMode === "workspace" ? "max-w-none" : "max-w-[1280px]"}`}
              role="main"
              tabIndex={-1}
            >
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
    </div>
  );
}
