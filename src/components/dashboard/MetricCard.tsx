"use client";

import { motion } from "framer-motion";
import type { DashboardMetric } from "@/src/features/dashboard/types";
import type { PayDeskTheme } from "@/src/lib/theme";

type MetricCardProps = {
  metric: DashboardMetric;
  theme: PayDeskTheme;
  index: number;
};

export function MetricCard({ metric, theme, index }: MetricCardProps) {
  const Icon = metric.icon;
  const isDark = theme === "dark";
  const isWarning = metric.tone === "warning";

  return (
    <motion.article
      className={`group min-h-[104px] rounded-[8px] border p-4 transition duration-200 hover:-translate-y-0.5 ${
        isDark
          ? isWarning
            ? "border-red-400/20 bg-[#131326] shadow-black/10"
            : "border-slate-400/15 bg-[#0f172a]"
          : isWarning
            ? "border-red-200 bg-white shadow-[0_12px_26px_rgba(15,23,42,0.06)]"
            : "border-[#ded8f3] bg-white shadow-[0_12px_26px_rgba(15,23,42,0.05)]"
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.045, ease: "easeOut" }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={`text-xs font-bold leading-none ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {metric.label}
        </p>
        {Icon ? (
          <Icon
            className={`size-4 ${isWarning ? "text-red-400" : isDark ? "text-[#b9afff]" : "text-[#4f2df2]"}`}
            aria-hidden="true"
          />
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1">
        <strong className={`text-2xl font-bold leading-none tracking-normal ${isDark ? "text-[#f4f1ff]" : "text-slate-950"}`}>
          {metric.value}
        </strong>
        <span
          className={`text-xs font-extrabold leading-5 ${
            isWarning ? "text-red-400" : isDark ? "text-emerald-300" : "text-emerald-600"
          }`}
        >
          {metric.change}
        </span>
      </div>
    </motion.article>
  );
}

