"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { RecentActivity } from "@/src/features/dashboard/types";
import type { InventoryAlert, TopProduct } from "@/src/features/dashboard/types";
import type { PayDeskTheme } from "@/src/lib/theme";
import { formatDashboardCurrency } from "@/src/features/dashboard/api";

type RecentActivityCardProps = {
  activities: RecentActivity[];
  inventoryAlerts: InventoryAlert[];
  topProducts: TopProduct[];
  theme: PayDeskTheme;
};

export function RecentActivityCard({ activities, inventoryAlerts, topProducts, theme }: RecentActivityCardProps) {
  const isDark = theme === "dark";

  return (
    <motion.aside
      className={`rounded-[8px] border p-4 sm:p-5 ${
        isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white shadow-[0_14px_30px_rgba(15,23,42,0.05)]"
      }`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: 0.18, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between">
        <h2 className={`text-sm font-bold ${isDark ? "text-[#f4f1ff]" : "text-slate-950"}`}>Recent Activity</h2>
        <Link href="/reports" className={`text-xs font-extrabold transition ${isDark ? "text-[#c8c1ff] hover:text-white" : "text-[#4f2df2] hover:text-[#3517c6]"}`}>
          View All
        </Link>
      </div>

      <div className="mt-5 space-y-4">
        {activities.length ? activities.map((activity) => {
          const Icon = activity.icon;

          return (
            <div key={activity.id} className="flex items-center gap-3">
              <span className={`grid size-10 shrink-0 place-items-center rounded-[8px] ${isDark ? "bg-[#343653] text-[#c8c1ff]" : "bg-[#edeaff] text-[#4f2df2]"}`}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-bold ${isDark ? "text-[#f4f1ff]" : "text-slate-950"}`}>{activity.title}</p>
                <p className={`mt-1 truncate text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>{activity.subtitle}</p>
              </div>
              <strong className={`shrink-0 text-sm font-bold ${isDark ? "text-[#f4f1ff]" : "text-slate-900"}`}>{formatDashboardCurrency(activity.amount)}</strong>
            </div>
          );
        }) : (
          <p className={`rounded-[8px] border px-4 py-5 text-sm font-semibold ${isDark ? "border-slate-400/10 text-slate-400" : "border-[#ded8f3] text-slate-500"}`}>
            No recent activity
          </p>
        )}
      </div>

      <div className={`mt-6 rounded-[8px] border p-4 ${isDark ? "border-[#7c5cff]/35 bg-[#261b62]/50" : "border-[#c9c1ff] bg-[#f0edff]"}`}>
        <p className={`text-xs font-extrabold ${isDark ? "text-[#e7e2ff]" : "text-[#3517c6]"}`}>Inventory Alerts</p>
        {inventoryAlerts.length ? (
          <div className="mt-3 space-y-3">
            {inventoryAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between gap-3 text-sm font-semibold">
                <span className={`min-w-0 truncate ${isDark ? "text-[#c8c1ff]" : "text-[#473a8f]"}`}>{alert.name}</span>
                <span className={isDark ? "text-red-200" : "text-red-600"}>
                  {alert.currentQuantity}/{alert.minInventory}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className={`mt-2 text-sm font-semibold leading-6 ${isDark ? "text-[#c8c1ff]" : "text-[#473a8f]"}`}>
            No inventory alerts
          </p>
        )}
      </div>

      <div className={`mt-4 rounded-[8px] border p-4 ${isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-white"}`}>
        <p className={`text-xs font-extrabold ${isDark ? "text-[#f4f1ff]" : "text-slate-950"}`}>Top Products</p>
        {topProducts.length ? (
          <div className="mt-3 space-y-3">
            {topProducts.map((product) => (
              <div key={product.productId} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className={`truncate text-sm font-bold ${isDark ? "text-[#f4f1ff]" : "text-slate-950"}`}>{product.name}</p>
                  <p className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>{product.unitsSold} sold</p>
                </div>
                <strong className={`shrink-0 text-sm font-bold ${isDark ? "text-[#c8c1ff]" : "text-[#4f2df2]"}`}>
                  {formatDashboardCurrency(product.revenue)}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <p className={`mt-2 text-sm font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>No product sales yet</p>
        )}
      </div>
    </motion.aside>
  );
}
