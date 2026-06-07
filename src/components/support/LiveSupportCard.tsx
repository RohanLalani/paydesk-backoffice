"use client";

import { Headphones } from "lucide-react";
import type { PayDeskTheme } from "@/src/lib/theme";

export const ENABLE_LIVE_SUPPORT = false;

export function LiveSupportCard({ theme }: { theme: PayDeskTheme }) {
  const isDark = theme === "dark";

  return (
    <div className={`rounded-[8px] border p-4 ${isDark ? "border-slate-400/10 bg-[#0b1224]" : "border-[#ded8f3] bg-white"}`}>
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-[8px] bg-emerald-500 text-white">
          <Headphones className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className={`text-sm font-bold ${isDark ? "text-[#f4f1ff]" : "text-slate-950"}`}>Live Help</p>
          <p className={`text-[11px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Available now</p>
        </div>
      </div>
      <button
        type="button"
        className="mt-4 h-10 w-full rounded-[7px] bg-[#4f2df2] text-sm font-bold text-white transition hover:bg-[#4322dd]"
      >
        Get Support
      </button>
    </div>
  );
}

