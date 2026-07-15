"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import type { AuthAccount } from "@/src/features/auth/types";
import type { StoreCapabilities } from "@/src/features/stores/types";
import { emptyStoreCapabilities } from "@/src/features/stores/capabilities";
import {
  canShowPrimaryNavigationItem,
  dashboardItem,
  primaryNavigation,
  sidebarCategories,
  type BackOfficeNavKey as PrimaryNavKey,
  type PrimaryNavigationItem,
  type SidebarCategory,
} from "@/src/features/navigation/primaryNavigation";
import { resolveRouteMatch } from "@/src/features/navigation/routeMatching";
import type { PayDeskTheme } from "@/src/lib/theme";

const SIDEBAR_CATEGORY_KEY = "paydesk-sidebar-category";

export type BackOfficeNavKey = PrimaryNavKey;

function readStoredCategory(): SidebarCategory | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(SIDEBAR_CATEGORY_KEY);
  return sidebarCategories.some((category) => category.key === stored) ? (stored as SidebarCategory) : null;
}

function fallbackRouteCategory(pathname: string): SidebarCategory | null {
  if (pathname.startsWith("/analytics") || pathname.startsWith("/reports")) {
    return "analytics";
  }

  if (pathname.startsWith("/customers") || pathname.startsWith("/employees") || pathname.startsWith("/staff")) {
    return "personnel";
  }

  return null;
}

export function BackOfficeSidebar({
  account,
  theme,
  capabilities = emptyStoreCapabilities,
}: {
  activeItem?: BackOfficeNavKey;
  account: AuthAccount | null;
  theme: PayDeskTheme;
  capabilities?: StoreCapabilities;
}) {
  const pathname = usePathname();
  const isDark = theme === "dark";
  const [selectedCategory, setSelectedCategory] = useState<SidebarCategory>("general");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const visiblePrimaryItems = useMemo(
    () => primaryNavigation.filter((item) => canShowPrimaryNavigationItem(account, item, capabilities)),
    [account, capabilities],
  );
  const resolvedActiveItem = useMemo(
    () => resolveRouteMatch(pathname, visiblePrimaryItems),
    [pathname, visiblePrimaryItems],
  );

  useEffect(() => {
    const inferred = resolvedActiveItem?.category ?? fallbackRouteCategory(pathname);

    if (inferred) {
      queueMicrotask(() => {
        setSelectedCategory(inferred);
      });
      return;
    }

    queueMicrotask(() => {
      setSelectedCategory(readStoredCategory() ?? "general");
    });
  }, [pathname, resolvedActiveItem]);

  function handleSelectCategory(category: SidebarCategory) {
    setSelectedCategory(category);
    setIsCategoryOpen(false);
    window.localStorage.setItem(SIDEBAR_CATEGORY_KEY, category);
  }

  const selectedCategoryMeta = sidebarCategories.find((category) => category.key === selectedCategory) ?? sidebarCategories[0];
  const visibleItems = useMemo(
    () => visiblePrimaryItems.filter((item) => item.category === selectedCategory && item.key !== "dashboard"),
    [selectedCategory, visiblePrimaryItems],
  );
  const mobileItems = [dashboardItem, ...visibleItems].slice(0, 8);

  const panelClass = isDark ? "border-slate-400/15 bg-[#0b1224]" : "border-[#ded8f3] bg-white";
  const inactiveClass = isDark
    ? "text-slate-300 hover:bg-white/[0.05] hover:text-white"
    : "text-slate-600 hover:bg-[#f0edff] hover:text-[#4f2df2]";
  const categoryControlClass = isDark
    ? "border-slate-400/15 bg-white/[0.04] text-slate-200 hover:border-[#7c5cff]/60"
    : "border-[#ded8f3] bg-[#fbfaff] text-slate-700 hover:border-[#7c5cff]/60 hover:text-[#4f2df2]";

  function renderNavItem(item: PrimaryNavigationItem, compact = false) {
    const Icon = item.icon;
    const isActive = resolvedActiveItem?.key === item.key;

    return (
      <Link
        key={item.key}
        href={item.href}
        aria-label={compact ? item.label : undefined}
        aria-current={isActive ? "page" : undefined}
        title={item.label}
        className={
          compact
            ? `grid h-12 place-items-center rounded-[8px] transition ${isActive ? "bg-[#4f2df2] text-white" : inactiveClass}`
            : `group flex h-11 items-center gap-3 rounded-[8px] px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35 ${
                isActive ? "bg-[#4f2df2] text-white shadow-[0_14px_26px_rgba(79,45,242,0.28)]" : inactiveClass
              }`
        }
      >
        <Icon className={compact ? "size-5" : "size-4 shrink-0"} aria-hidden="true" />
        {compact ? null : item.label}
      </Link>
    );
  }

  return (
    <>
      <aside className={`hidden min-h-dvh w-[232px] shrink-0 border-r px-5 py-5 lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:overscroll-contain ${panelClass}`}>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-[8px] bg-[#4f2df2] text-white">
            <SlidersHorizontal className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className={`text-lg font-extrabold leading-none ${isDark ? "text-[#f4f1ff]" : "text-slate-950"}`}>PayDesk</p>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
              Back Office
            </p>
          </div>
        </div>

        <nav className="mt-8 space-y-1" aria-label="Back office">
          {renderNavItem(dashboardItem)}
        </nav>

        <div className="relative mt-3">
          <button
            type="button"
            onClick={() => setIsCategoryOpen((value) => !value)}
            className={`flex h-10 w-full items-center justify-between gap-2 rounded-[8px] border px-3 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35 ${categoryControlClass}`}
            aria-haspopup="menu"
            aria-expanded={isCategoryOpen}
          >
            <span>{selectedCategoryMeta.label}</span>
            <ChevronDown className={`size-4 transition ${isCategoryOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>

          {isCategoryOpen ? (
            <div className={`absolute left-0 right-0 z-40 mt-2 rounded-[8px] border p-1 shadow-[0_18px_40px_rgba(15,23,42,0.16)] ${panelClass}`} role="menu">
              {sidebarCategories.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => handleSelectCategory(category.key)}
                  className={`flex h-9 w-full items-center rounded-[6px] px-3 text-left text-sm font-bold transition ${
                    category.key === selectedCategory ? "bg-[#f0edff] text-[#4f2df2]" : inactiveClass
                  }`}
                  role="menuitem"
                >
                  {category.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <nav className="mt-4 space-y-1" aria-label={`${selectedCategoryMeta.label} navigation`}>
          {visibleItems.length ? (
            visibleItems.map((item) => renderNavItem(item))
          ) : (
            <p className={`rounded-[8px] px-3 py-4 text-xs font-semibold leading-5 ${isDark ? "bg-white/[0.04] text-slate-400" : "bg-[#fbfaff] text-slate-500"}`}>
              {selectedCategoryMeta.empty}
            </p>
          )}
        </nav>
      </aside>

      <nav className={`fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 gap-1 border-t px-2 py-2 lg:hidden ${isDark ? "border-slate-400/15 bg-[#0b1224]/95" : "border-[#ded8f3] bg-white/95"}`} aria-label="Back office mobile">
        {mobileItems.map((item) => renderNavItem(item, true))}
      </nav>
    </>
  );
}
