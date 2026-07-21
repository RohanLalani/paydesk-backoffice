"use client";

import { BackOfficeShell } from "@/src/components/layout/BackOfficeShell";
import { productSections } from "@/src/features/products/navigation";
import type { PayDeskTheme } from "@/src/lib/theme";

export function ProductSectionContent({
  href,
  theme,
}: {
  href: string;
  theme: PayDeskTheme;
}) {
  const item = productSections.find((entry) => entry.href === href) ?? productSections[0];
  const Icon = item.icon;
  const isDark = theme === "dark";

  return (
    <section className={`rounded-[8px] border p-6 ${isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white"}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-normal">{item.label}</h1>
          <p className={`mt-2 max-w-[680px] text-sm font-semibold leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {item.description}
          </p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-[8px] bg-[#4f2df2] text-white shadow-[0_12px_24px_rgba(79,45,242,0.22)]">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>

      <div className={`mt-8 rounded-[8px] border p-5 ${isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]"}`}>
        <h2 className="text-base font-bold tracking-normal">Coming soon</h2>
        <p className={`mt-2 text-sm font-semibold leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          This workspace is ready for the {item.label.toLowerCase()} tools, but no backend business logic is wired up yet.
        </p>
      </div>
    </section>
  );
}

export function ProductSectionPage({ href }: { href: string }) {
  return (
    <BackOfficeShell
      activeItem="products"
      requiredPermission="manage_products"
    >
      {({ theme }) => <ProductSectionContent href={href} theme={theme} />}
    </BackOfficeShell>
  );
}
