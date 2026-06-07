"use client";

import { DashboardOverview } from "@/src/components/dashboard/DashboardOverview";
import { BackOfficeShell } from "@/src/components/layout/BackOfficeShell";

export default function DashboardPage() {
  return (
    <BackOfficeShell activeItem="dashboard">
      {({ account, selectedStore, theme }) => (
        <DashboardOverview account={account} storeId={selectedStore.id} theme={theme} />
      )}
    </BackOfficeShell>
  );
}
