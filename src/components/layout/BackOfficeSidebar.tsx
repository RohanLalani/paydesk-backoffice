"use client";

import Link from "next/link";
import {
  BarChart3,
  Boxes,
  Gauge,
  Package,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  UsersRound,
} from "lucide-react";
import type { AuthAccount } from "@/src/features/auth/types";
import type { PayDeskTheme } from "@/src/lib/theme";

export type BackOfficeNavKey =
  | "dashboard"
  | "products"
  | "inventory"
  | "analytics"
  | "customers"
  | "employees"
  | "permissions"
  | "settings";

type SidebarItem = {
  key: BackOfficeNavKey;
  label: string;
  href: string;
  icon: typeof Gauge;
  permission?: string;
};

const sidebarItems: SidebarItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: Gauge },
  { key: "products", label: "Products", href: "/products", icon: Package, permission: "manage_products" },
  { key: "inventory", label: "Inventory", href: "/inventory", icon: Boxes, permission: "manage_inventory" },
  { key: "analytics", label: "Analytics", href: "/analytics", icon: BarChart3, permission: "view_analytics" },
  { key: "customers", label: "Customers", href: "/customers", icon: Users, permission: "manage_customers" },
  { key: "employees", label: "Employees", href: "/employees", icon: UsersRound, permission: "manage_employees" },
  { key: "permissions", label: "Permissions", href: "/permissions", icon: ShieldCheck, permission: "manage_permissions" },
  { key: "settings", label: "Settings", href: "/settings/account", icon: Settings },
];

function canShowItem(account: AuthAccount | null, item: SidebarItem) {
  if (!item.permission || !account || account.role === "owner" || account.role === "partner") {
    return true;
  }

  return account.permissions?.includes(item.permission) === true;
}

export function BackOfficeSidebar({
  activeItem = "dashboard",
  account,
  theme,
}: {
  activeItem?: BackOfficeNavKey;
  account: AuthAccount | null;
  theme: PayDeskTheme;
}) {
  const isDark = theme === "dark";
  const visibleItems = sidebarItems.filter((item) => canShowItem(account, item));

  return (
    <>
      <aside
        className={`hidden min-h-dvh w-[232px] shrink-0 border-r px-5 py-5 lg:flex lg:flex-col ${
          isDark ? "border-slate-400/15 bg-[#0b1224]" : "border-[#ded8f3] bg-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-[8px] bg-[#4f2df2] text-white">
            <SlidersHorizontal className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className={`text-lg font-extrabold leading-none ${isDark ? "text-[#f4f1ff]" : "text-slate-950"}`}>PayDesk</p>
            <p className={`mt-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${isDark ? "text-slate-500" : "text-slate-500"}`}>
              Back Office
            </p>
          </div>
        </div>

        <nav className="mt-8 space-y-1" aria-label="Back office">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === activeItem;

            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`group flex h-11 items-center gap-3 rounded-[8px] px-3 text-sm font-bold transition ${
                  isActive
                    ? "bg-[#4f2df2] text-white shadow-[0_14px_26px_rgba(79,45,242,0.28)]"
                    : isDark
                      ? "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                      : "text-slate-600 hover:bg-[#f0edff] hover:text-[#4f2df2]"
                }`}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav
        className={`fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 gap-1 border-t px-2 py-2 lg:hidden ${
          isDark ? "border-slate-400/15 bg-[#0b1224]/95" : "border-[#ded8f3] bg-white/95"
        }`}
        aria-label="Back office mobile"
      >
        {visibleItems.slice(0, 8).map((item) => {
          const Icon = item.icon;
          const isActive = item.key === activeItem;

          return (
            <Link
              key={item.key}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`grid h-12 place-items-center rounded-[8px] transition ${
                isActive
                  ? "bg-[#4f2df2] text-white"
                  : isDark
                    ? "text-slate-400 hover:bg-white/[0.05]"
                    : "text-slate-500 hover:bg-[#f0edff] hover:text-[#4f2df2]"
              }`}
            >
              <Icon className="size-5" aria-hidden="true" />
            </Link>
          );
        })}
      </nav>
    </>
  );
}

