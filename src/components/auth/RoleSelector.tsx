"use client";

import { motion } from "framer-motion";
import type { AuthRole } from "@/src/features/auth/types";
import type { PayDeskTheme } from "@/src/lib/theme";

type RoleSelectorProps = {
  value: AuthRole;
  onChange: (role: AuthRole) => void;
  theme?: PayDeskTheme;
};

const roles: Array<{ label: string; value: AuthRole }> = [
  { label: "Owner", value: "owner" },
  { label: "Partner", value: "partner" },
  { label: "Manager", value: "manager" },
];

const themeStyles = {
  light: {
    container: "border-indigo-100 bg-slate-100/80 shadow-inner shadow-indigo-950/[0.03]",
    hover: "hover:bg-white/70",
    activeIndicator:
      "bg-[#4f2df2] shadow-[0_9px_20px_rgba(79,45,242,0.34)]",
    focus: "focus-visible:ring-[#7c5cff]/35",
    text: "#334155",
    hoverText: "#0f172a",
  },
  dark: {
    container:
      "border-indigo-200/10 bg-slate-950/70 shadow-inner shadow-black/20",
    hover: "hover:bg-white/[0.045]",
    activeIndicator:
      "bg-[#4f2df2] shadow-[0_0_22px_rgba(124,92,255,0.3)]",
    focus: "focus-visible:ring-[#9b8cff]/35",
    text: "#cbd5e1",
    hoverText: "#ffffff",
  },
} satisfies Record<
  PayDeskTheme,
  {
    container: string;
    hover: string;
    activeIndicator: string;
    focus: string;
    text: string;
    hoverText: string;
  }
>;

export function RoleSelector({
  value,
  onChange,
  theme = "light",
}: RoleSelectorProps) {
  const styles = themeStyles[theme];
  const selectedIndex = roles.findIndex((role) => role.value === value);

  return (
    <div
      className={`relative grid grid-cols-3 overflow-hidden rounded-[10px] border p-1 ${styles.container}`}
      role="group"
      aria-label="Account role"
    >
      <motion.div
        className={`absolute bottom-1 left-1 top-1 rounded-[7px] ${styles.activeIndicator}`}
        style={{ width: "calc((100% - 0.5rem) / 3)" }}
        animate={{ x: `${Math.max(selectedIndex, 0) * 100}%` }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        aria-hidden="true"
      />
      {roles.map((role) => {
        const isSelected = value === role.value;

        return (
          <motion.button
            key={role.value}
            type="button"
            aria-pressed={isSelected}
            className={`relative z-10 h-11 rounded-[7px] bg-transparent px-2 text-sm font-semibold outline-none transition-colors duration-150 focus-visible:ring-4 ${
              isSelected ? "" : styles.hover
            } ${styles.focus}`}
            onClick={() => onChange(role.value)}
            whileTap={{ scale: 0.97 }}
          >
            <motion.span
              className="block"
              animate={{ color: isSelected ? "#ffffff" : styles.text }}
              whileHover={{ color: isSelected ? "#ffffff" : styles.hoverText }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              {role.label}
            </motion.span>
          </motion.button>
        );
      })}
    </div>
  );
}
