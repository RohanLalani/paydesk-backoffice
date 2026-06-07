"use client";

import { BackOfficeShell } from "@/src/components/layout/BackOfficeShell";

export default function InventoryPage() {
  return (
    <BackOfficeShell activeItem="inventory">
      {({ theme }) => (
        <section className={`rounded-[8px] border p-6 ${theme === "dark" ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white"}`}>
          <h1 className="text-2xl font-bold tracking-normal">Inventory</h1>
          <p className={`mt-2 text-sm font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
            Inventory receiving and stock controls will be available here soon.
          </p>
        </section>
      )}
    </BackOfficeShell>
  );
}
