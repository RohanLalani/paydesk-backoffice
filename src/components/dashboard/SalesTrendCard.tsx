"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { SalesTrendPoint } from "@/src/features/dashboard/types";
import type { PayDeskTheme } from "@/src/lib/theme";

type SalesTrendCardProps = {
  data: SalesTrendPoint[];
  theme: PayDeskTheme;
  rangeLabel: string;
  onRangeChange: (range: "today" | "week" | "month") => void;
};

function buildPath(points: SalesTrendPoint[]) {
  if (points.length < 2) {
    return "M 0 158 L 640 158";
  }

  const width = 640;
  const height = 190;
  const max = Math.max(...points.map((point) => point.value));
  const min = Math.min(...points.map((point) => point.value));
  const range = Math.max(1, max - min);

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point.value - min) / range) * 118 - 32;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function getPointX(index: number, length: number) {
  return length <= 1 ? 0 : (index / (length - 1)) * 620 + 10;
}

export function SalesTrendCard({ data, theme, rangeLabel, onRangeChange }: SalesTrendCardProps) {
  const isDark = theme === "dark";
  const chartData = data.length ? data : [{ label: "NOW", value: 0 }];
  const linePath = buildPath(chartData);
  const areaPath = `${linePath} L 640 190 L 0 190 Z`;

  return (
    <motion.section
      className={`rounded-[8px] border p-4 sm:p-5 ${
        isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white shadow-[0_14px_30px_rgba(15,23,42,0.05)]"
      }`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: 0.12, ease: "easeOut" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className={`text-sm font-bold ${isDark ? "text-[#f4f1ff]" : "text-slate-950"}`}>Sales Trend</h2>
          <p className={`mt-1 text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Revenue performance over the last 24 hours
          </p>
        </div>
        <select
          value={rangeLabel.toLowerCase()}
          onChange={(event) => onRangeChange(event.target.value as "today" | "week" | "month")}
          className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-[6px] border px-3 text-xs font-bold transition ${
            isDark
              ? "border-slate-400/15 bg-white/[0.03] text-slate-300 hover:border-[#7c5cff]/60"
              : "border-[#ded8f3] bg-white text-slate-600 hover:border-[#7c5cff]/60"
          }`}
        >
          <option value="today">Today</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </select>
        <ChevronDown className="-ml-8 mt-2 size-3.5 pointer-events-none" aria-hidden="true" />
      </div>

      <div className="mt-5">
        <svg viewBox="0 0 640 240" className="h-[230px] w-full overflow-visible" role="img" aria-label="Sales trend area chart">
          <defs>
            <linearGradient id="salesAreaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#a99dff" stopOpacity={isDark ? "0.42" : "0.28"} />
              <stop offset="100%" stopColor="#7c5cff" stopOpacity="0" />
            </linearGradient>
            <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {[48, 96, 144].map((y) => (
            <line key={y} x1="0" x2="640" y1={y} y2={y} stroke={isDark ? "#334155" : "#e7e2f4"} strokeOpacity="0.55" />
          ))}
          <path d={areaPath} fill="url(#salesAreaGradient)" />
          <path d={linePath} fill="none" stroke="#b8afff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" filter="url(#lineGlow)" />
          {chartData.filter((_, index) => index % Math.max(1, Math.ceil(chartData.length / 6)) === 0 || index === chartData.length - 1).map((point, index, labels) => (
            <text
              key={point.label}
              x={getPointX(index, labels.length)}
              y="226"
              textAnchor={index === labels.length - 1 ? "end" : "middle"}
              fill={isDark ? "#94a3b8" : "#64748b"}
              fontSize="12"
              fontWeight="700"
            >
              {point.label}
            </text>
          ))}
        </svg>
      </div>
    </motion.section>
  );
}
