"use client";

import Link from "next/link";
import { PackagePlus, PackageSearch, UserPlus, UsersRound } from "lucide-react";
import type { AuthAccount } from "@/src/features/auth/types";
import type { QuickAction } from "@/src/features/dashboard/types";
import type { PayDeskTheme } from "@/src/lib/theme";

type QuickActionsProps = {
  account: AuthAccount | null;
  theme: PayDeskTheme;
};

export const quickActions: QuickAction[] = [
  {
    id: "add-product",
    label: "Add Product",
    href: "/products/new",
    permission: "manage_products",
    icon: PackagePlus,
  },
  {
    id: "receive-inventory",
    label: "Receive Inventory",
    href: "/inventory/overview",
    permission: "manage_inventory",
    icon: PackageSearch,
  },
  {
    id: "add-customer",
    label: "Add Customer",
    href: "/customers",
    permission: "manage_customers",
    icon: UserPlus,
  },
  {
    id: "manage-employees",
    label: "Manage Employees",
    href: "/employees",
    permission: "manage_employees",
    icon: UsersRound,
  },
];

function canUseAction(account: AuthAccount | null, action: QuickAction) {
  if (!account || account.role === "owner" || account.role === "partner") {
    return true;
  }

  return account.permissions?.includes(action.permission) === true;
}

export function QuickActions({ account, theme }: QuickActionsProps) {
  const isDark = theme === "dark";
  const visibleActions = quickActions.filter((action) => canUseAction(account, action));

  return (
    <div className="flex flex-wrap gap-3">
      {visibleActions.map((action, index) => {
        const Icon = action.icon;
        const isPrimary = index === 0;

        return (
          <Link
            key={action.id}
            href={action.href}
            className={`inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-[7px] border px-4 text-sm font-bold transition active:scale-[0.98] ${
              isPrimary
                ? "border-[#7c5cff] bg-[#c8c1ff] text-[#3517c6] shadow-[0_14px_28px_rgba(79,45,242,0.18)] hover:bg-[#b8afff]"
                : isDark
                  ? "border-slate-400/15 bg-[#171d31] text-[#f4f1ff] hover:border-[#7c5cff]/60 hover:bg-[#1d2440]"
                  : "border-[#ded8f3] bg-white text-slate-800 shadow-[0_10px_22px_rgba(15,23,42,0.04)] hover:border-[#7c5cff]/60 hover:text-[#4f2df2]"
            }`}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

