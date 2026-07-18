"use client";

import { BackOfficeShell } from "@/src/components/layout/BackOfficeShell";
import type { BackOfficeNavKey } from "@/src/components/layout/BackOfficeSidebar";
import type { StoreCapabilities } from "@/src/features/stores/types";

export function FeatureGatePage({
  activeItem,
  capability,
  title,
  description,
  unavailable,
}: {
  activeItem: BackOfficeNavKey;
  capability: keyof Pick<StoreCapabilities, "lottery" | "recipeSuite" | "loyalty">;
  title: string;
  description: string;
  unavailable: string;
}) {
  return (
    <BackOfficeShell activeItem={activeItem}>
      {({ capabilities, theme }) => {
        const isDark = theme === "dark";

        if (!capabilities[capability].available) {
          return (
            <section className={`rounded-[8px] border p-6 ${isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white"}`}>
              <h1 className="text-2xl font-bold tracking-normal">{title}</h1>
              <p className={`mt-2 max-w-[720px] text-sm font-semibold leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {description}
              </p>
              <div className={`mt-8 rounded-[8px] border p-5 ${isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]"}`}>
                <h2 className="text-base font-bold tracking-normal">Feature unavailable</h2>
                <p className={`mt-2 text-sm font-semibold leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {unavailable}
                </p>
                <a
                  href="/settings/store/services"
                  className="mt-4 inline-flex h-10 items-center rounded-[7px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35"
                >
                  Manage services
                </a>
              </div>
            </section>
          );
        }

        return (
          <section className={`rounded-[8px] border p-6 ${isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white"}`}>
            <h1 className="text-2xl font-bold tracking-normal">{title}</h1>
            <p className={`mt-2 max-w-[720px] text-sm font-semibold leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {description}
            </p>
            <div className={`mt-8 rounded-[8px] border p-5 ${isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]"}`}>
              <h2 className="text-base font-bold tracking-normal">Coming soon</h2>
              <p className={`mt-2 text-sm font-semibold leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                This feature is enabled for the selected store. The detailed workflow will be added here.
              </p>
            </div>
          </section>
        );
      }}
    </BackOfficeShell>
  );
}
