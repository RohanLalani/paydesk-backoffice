"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuthAccount } from "@/src/features/auth/types";
import {
  buildDashboardMetrics,
  fetchDashboardOverview,
  mapRecentActivity,
} from "@/src/features/dashboard/api";
import type { DashboardRange, DashboardSummary } from "@/src/features/dashboard/types";
import type { PayDeskTheme } from "@/src/lib/theme";
import { MetricCard } from "@/src/components/dashboard/MetricCard";
import { QuickActions } from "@/src/components/dashboard/QuickActions";
import { RecentActivityCard } from "@/src/components/dashboard/RecentActivityCard";
import { SalesTrendCard } from "@/src/components/dashboard/SalesTrendCard";

type DashboardOverviewProps = {
  account: AuthAccount | null;
  storeId: string;
  theme: PayDeskTheme;
};

export function DashboardOverview({ account, storeId, theme }: DashboardOverviewProps) {
  const [range, setRange] = useState<DashboardRange>("today");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const isDark = theme === "dark";

  const loadDashboard = useCallback((nextRange: DashboardRange) => {
    setLoadState("loading");

    void fetchDashboardOverview(storeId, nextRange)
      .then((overview) => {
        setSummary(overview);
        setLoadState("ready");
      })
      .catch(() => {
        setLoadState("error");
      });
  }, [storeId]);

  useEffect(() => {
    queueMicrotask(() => loadDashboard(range));
  }, [loadDashboard, range]);

  const metrics = summary ? buildDashboardMetrics(summary) : [];

  return (
    <div>
      <p className={`text-sm font-bold ${isDark ? "text-[#d8d3ff]" : "text-[#4f2df2]"}`}>
        Quick overview of your store performance.
      </p>

      <div className="mt-5">
        <QuickActions account={account} theme={theme} />
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {loadState === "loading"
          ? Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className={`min-h-[104px] animate-pulse rounded-[8px] border ${
                  isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white"
                }`}
              />
            ))
          : null}

        {loadState === "ready" ? metrics.map((metric, index) => (
          <div key={metric.id} className={index < 4 ? "xl:col-span-1" : "xl:col-span-1"}>
            <MetricCard metric={metric} theme={theme} index={index} />
          </div>
        )) : null}
      </section>

      {loadState === "error" ? (
        <div className={`mt-7 rounded-[8px] border p-5 ${isDark ? "border-red-400/20 bg-red-950/20 text-red-100" : "border-red-200 bg-red-50 text-red-700"}`}>
          <p className="text-sm font-bold">Could not load dashboard analytics</p>
          <button
            type="button"
            onClick={() => loadDashboard(range)}
            className="mt-4 h-10 rounded-[7px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd]"
          >
            Retry
          </button>
        </div>
      ) : null}

      {loadState === "ready" && summary ? (
        <section className="mt-7 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <SalesTrendCard
            data={summary.salesTrend}
            theme={theme}
            rangeLabel={range}
            onRangeChange={setRange}
          />
          <RecentActivityCard
            activities={mapRecentActivity(summary)}
            inventoryAlerts={summary.inventoryAlerts}
            topProducts={summary.topProducts}
            theme={theme}
          />
        </section>
      ) : null}
    </div>
  );
}
