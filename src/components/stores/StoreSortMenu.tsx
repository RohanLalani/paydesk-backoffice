"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ListFilter } from "lucide-react";
import type { PayDeskTheme } from "@/src/lib/theme";

export const STORE_SORT_KEY = "paydesk-store-sort";

export type StoreSortOption =
  | "recently_added"
  | "oldest_added"
  | "name_az"
  | "name_za"
  | "active_first"
  | "store_type";

export const STORE_SORT_OPTIONS: Array<{
  value: StoreSortOption;
  label: string;
}> = [
  { value: "recently_added", label: "Recently Added" },
  { value: "oldest_added", label: "Oldest Added" },
  { value: "name_az", label: "Store Name A-Z" },
  { value: "name_za", label: "Store Name Z-A" },
  { value: "active_first", label: "Active First" },
  { value: "store_type", label: "Store Type" },
];

export function isStoreSortOption(value: string | null): value is StoreSortOption {
  return STORE_SORT_OPTIONS.some((option) => option.value === value);
}

type StoreSortMenuProps = {
  theme: PayDeskTheme;
  value: StoreSortOption;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onChange: (value: StoreSortOption) => void;
};

const styles = {
  light: {
    button:
      "border-[#d8d2ee] bg-white text-slate-700 hover:border-[#7c5cff]/50 hover:text-[#4f2df2]",
    menu: "border-[#ddd6fe] bg-white text-slate-800 shadow-[0_18px_42px_rgba(15,23,42,0.14)]",
    item: "hover:bg-[#f1efff]",
    selected: "bg-[#f1efff] text-[#4f2df2]",
    muted: "text-slate-500",
  },
  dark: {
    button:
      "border-indigo-200/10 bg-[#0b1026] text-slate-300 hover:border-[#7c5cff]/60 hover:text-[#c8c1ff]",
    menu: "border-indigo-200/10 bg-[#0b1026] text-slate-200 shadow-[0_22px_48px_rgba(0,0,0,0.36)]",
    item: "hover:bg-[#4f2df2]/14",
    selected: "bg-[#4f2df2]/18 text-[#c8c1ff]",
    muted: "text-slate-400",
  },
} satisfies Record<PayDeskTheme, Record<string, string>>;

export function StoreSortMenu({
  theme,
  value,
  isOpen,
  onToggle,
  onClose,
  onChange,
}: StoreSortMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const themeStyles = styles[theme];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`grid size-12 shrink-0 place-items-center rounded-[8px] border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35 ${themeStyles.button}`}
        aria-label="Sort stores"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title="Sort stores"
        onClick={onToggle}
      >
        <ListFilter className="size-5" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            className={`absolute right-0 top-[calc(100%+0.5rem)] z-30 w-58 overflow-hidden rounded-[8px] border p-1 ${themeStyles.menu}`}
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            role="menu"
            aria-label="Sort stores"
          >
            <div className={`px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] ${themeStyles.muted}`}>
              Sort Stores
            </div>
            {STORE_SORT_OPTIONS.map((option) => {
              const selected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  className={`flex w-full items-center justify-between gap-3 rounded-[6px] px-3 py-2.5 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c5cff]/40 ${
                    selected ? themeStyles.selected : themeStyles.item
                  }`}
                  onClick={() => {
                    onChange(option.value);
                    onClose();
                  }}
                >
                  {option.label}
                  {selected ? <Check className="size-4" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
