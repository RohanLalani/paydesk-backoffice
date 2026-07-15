"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { productNavigation } from "@/src/features/products/navigation";
import type { PayDeskTheme } from "@/src/lib/theme";

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ProductsSidebar({ theme }: { theme: PayDeskTheme }) {
  const pathname = usePathname();
  const isDark = theme === "dark";

  const panelClass = isDark
    ? "border-slate-400/15 bg-[#090f20] text-[#f4f1ff]"
    : "border-[#ded8f3] bg-[#fbfaff] text-slate-950";
  const eyebrowClass = isDark ? "text-slate-500" : "text-slate-500";
  const inactiveClass = isDark
    ? "text-slate-300 hover:bg-white/[0.05] hover:text-white focus-visible:ring-[#7c5cff]/40"
    : "text-slate-600 hover:bg-[#f0edff] hover:text-[#4f2df2] focus-visible:ring-[#7c5cff]/30";

  return (
    <>
      <aside className={`hidden w-[248px] shrink-0 border-r px-4 py-5 lg:block ${panelClass}`}>
        <p className={`px-2 text-[10px] font-extrabold uppercase tracking-[0.08em] ${eyebrowClass}`}>
          Product Management
        </p>
        <nav className="mt-4 space-y-1" aria-label="Products">
          {productNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
                className={`flex h-10 items-center gap-3 rounded-[8px] px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 ${
                  isActive
                    ? "bg-[#f0edff] text-[#4f2df2] shadow-[inset_3px_0_0_#4f2df2]"
                    : inactiveClass
                }`}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <section className={`border-b px-4 py-3 lg:hidden ${panelClass}`} aria-label="Products section menu">
        <p className={`text-[10px] font-extrabold uppercase tracking-[0.08em] ${eyebrowClass}`}>
          Product Management
        </p>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Products">
          {productNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-[8px] px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 ${
                  isActive ? "bg-[#4f2df2] text-white" : inactiveClass
                }`}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </section>
    </>
  );
}
