"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Blocks,
  Boxes,
  ChevronDown,
  CreditCard,
  Gauge,
  Gift,
  Landmark,
  LayoutGrid,
  MonitorUp,
  NotebookTabs,
  Package,
  Printer,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import type { AuthAccount } from "@/src/features/auth/types";
import type { StoreCapabilities } from "@/src/features/stores/types";
import { emptyStoreCapabilities } from "@/src/features/stores/capabilities";
import type { PayDeskTheme } from "@/src/lib/theme";

const SIDEBAR_CATEGORY_KEY = "paydesk-sidebar-category";

export type BackOfficeNavKey =
  | "dashboard"
  | "products"
  | "lottery"
  | "recipeSuite"
  | "inventory"
  | "sendToPos"
  | "storeSettings"
  | "departments"
  | "permissions"
  | "loyalty"
  | "services"
  | "bank"
  | "billing"
  | "receiptSetup"
  | "analytics"
  | "customers"
  | "employees"
  | "settings";

type SidebarCategory = "general" | "setup" | "analytics" | "personnel";

type SidebarItem = {
  key: BackOfficeNavKey;
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
  requires?: keyof Pick<StoreCapabilities, "lottery" | "recipeSuite" | "loyalty">;
};

const categories: { key: SidebarCategory; label: string; empty: string }[] = [
  { key: "general", label: "General", empty: "" },
  { key: "setup", label: "Setup", empty: "" },
  { key: "analytics", label: "Analytics", empty: "Analytics options coming soon." },
  { key: "personnel", label: "Personnel", empty: "Personnel options coming soon." },
];

const dashboardItem: SidebarItem = {
  key: "dashboard",
  label: "Dashboard",
  href: "/dashboard",
  icon: Gauge,
};

const categoryItems: Record<SidebarCategory, SidebarItem[]> = {
  general: [
    { key: "products", label: "Products", href: "/products", icon: Package, permission: "manage_products" },
    { key: "lottery", label: "Lottery", href: "/lottery", icon: Ticket, requires: "lottery" },
    { key: "recipeSuite", label: "Recipe Suite", href: "/recipe-suite", icon: NotebookTabs, requires: "recipeSuite" },
    { key: "inventory", label: "Inventory", href: "/inventory", icon: Boxes, permission: "manage_inventory" },
    { key: "sendToPos", label: "Send to POS", href: "/send-to-pos", icon: MonitorUp },
  ],
  setup: [
    { key: "storeSettings", label: "Store Settings", href: "/settings/store", icon: Store },
    { key: "departments", label: "Departments", href: "/departments", icon: LayoutGrid, permission: "manage_products" },
    { key: "permissions", label: "Permissions", href: "/permissions", icon: ShieldCheck, permission: "manage_permissions" },
    { key: "loyalty", label: "Loyalty", href: "/loyalty", icon: Gift, requires: "loyalty" },
    { key: "services", label: "Services", href: "/services", icon: Blocks },
    { key: "bank", label: "Bank", href: "/bank", icon: Landmark },
    { key: "billing", label: "Billing", href: "/billing", icon: CreditCard },
    { key: "receiptSetup", label: "Print / Receipt Setup", href: "/settings/receipt", icon: Printer },
  ],
  analytics: [],
  personnel: [],
};

function canShowItem(account: AuthAccount | null, item: SidebarItem, capabilities: StoreCapabilities) {
  if (item.requires && !capabilities[item.requires]?.available) {
    return false;
  }

  if (!item.permission || !account || account.role === "owner" || account.role === "partner") {
    return true;
  }

  return account.permissions?.includes(item.permission) === true;
}

function isItemActive(pathname: string, item: SidebarItem, activeItem?: BackOfficeNavKey) {
  if (item.key === activeItem) {
    return true;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function routeCategory(pathname: string): SidebarCategory | null {
  if (pathname.startsWith("/products") || pathname.startsWith("/inventory") || pathname.startsWith("/lottery") || pathname.startsWith("/recipe-suite") || pathname.startsWith("/send-to-pos")) {
    return "general";
  }

  if (pathname.startsWith("/settings/store") || pathname.startsWith("/settings/receipt") || pathname.startsWith("/departments") || pathname.startsWith("/permissions") || pathname.startsWith("/loyalty") || pathname.startsWith("/services") || pathname.startsWith("/bank") || pathname.startsWith("/billing")) {
    return "setup";
  }

  if (pathname.startsWith("/analytics") || pathname.startsWith("/reports")) {
    return "analytics";
  }

  if (pathname.startsWith("/customers") || pathname.startsWith("/employees") || pathname.startsWith("/staff")) {
    return "personnel";
  }

  return null;
}

function readStoredCategory(): SidebarCategory | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(SIDEBAR_CATEGORY_KEY);
  return categories.some((category) => category.key === stored) ? (stored as SidebarCategory) : null;
}

export function BackOfficeSidebar({
  activeItem = "dashboard",
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

  useEffect(() => {
    const inferred = routeCategory(pathname);

    if (inferred) {
      queueMicrotask(() => {
        setSelectedCategory(inferred);
      });
      return;
    }

    queueMicrotask(() => {
      setSelectedCategory(readStoredCategory() ?? "general");
    });
  }, [pathname]);

  function handleSelectCategory(category: SidebarCategory) {
    setSelectedCategory(category);
    setIsCategoryOpen(false);
    window.localStorage.setItem(SIDEBAR_CATEGORY_KEY, category);
  }

  const selectedCategoryMeta = categories.find((category) => category.key === selectedCategory) ?? categories[0];
  const visibleItems = useMemo(
    () => categoryItems[selectedCategory].filter((item) => canShowItem(account, item, capabilities)),
    [account, capabilities, selectedCategory],
  );
  const mobileItems = [dashboardItem, ...visibleItems].slice(0, 8);

  const panelClass = isDark ? "border-slate-400/15 bg-[#0b1224]" : "border-[#ded8f3] bg-white";
  const inactiveClass = isDark
    ? "text-slate-300 hover:bg-white/[0.05] hover:text-white"
    : "text-slate-600 hover:bg-[#f0edff] hover:text-[#4f2df2]";
  const categoryControlClass = isDark
    ? "border-slate-400/15 bg-white/[0.04] text-slate-200 hover:border-[#7c5cff]/60"
    : "border-[#ded8f3] bg-[#fbfaff] text-slate-700 hover:border-[#7c5cff]/60 hover:text-[#4f2df2]";

  function renderNavItem(item: SidebarItem, compact = false) {
    const Icon = item.icon;
    const isActive = isItemActive(pathname, item, activeItem);

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
      <aside className={`hidden min-h-dvh w-[232px] shrink-0 border-r px-5 py-5 lg:flex lg:flex-col ${panelClass}`}>
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
              {categories.map((category) => (
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
