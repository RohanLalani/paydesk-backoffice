"use client";

import { motion } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";
import { StoreTypeIcon } from "@/src/components/stores/StoreTypeIcon";
import type { Store, StoreStaffMember, StoreStatus } from "@/src/features/stores/types";
import { getStoreTypeConfig } from "@/src/lib/storeTypeConfig";
import type { PayDeskTheme } from "@/src/lib/theme";

type StoreCardProps = {
  store: Store;
  index: number;
  theme: PayDeskTheme;
  onOpen: (store: Store) => void;
};

const statusStyles: Record<
  StoreStatus,
  {
    light: string;
    dark: string;
    dot: string;
  }
> = {
  active: {
    light: "bg-[#D1FAE5] text-[#047857]",
    dark: "bg-[rgba(16,185,129,0.16)] text-[#A7F3D0]",
    dot: "bg-[#10B981] dark:bg-[#34D399]",
  },
  inactive: {
    light: "bg-gray-200 text-gray-700",
    dark: "bg-gray-700/40 text-gray-300",
    dot: "bg-gray-500",
  },
  maintenance: {
    light: "bg-slate-200 text-slate-700",
    dark: "bg-slate-700/40 text-slate-300",
    dot: "bg-slate-500",
  },
  disabled: {
    light: "bg-red-100 text-red-700",
    dark: "bg-red-900/30 text-red-300",
    dot: "bg-red-500",
  },
};

function getStatus(store: Store): StoreStatus {
  const value = String(store.status ?? "").toLowerCase();

  if (value.includes("maintenance")) {
    return "maintenance";
  }

  if (value.includes("revoked") || value.includes("disabled")) {
    return "disabled";
  }

  if (value.includes("inactive")) {
    return "inactive";
  }

  if (store.isActive === false) {
    return "inactive";
  }

  return "active";
}

function getStatusLabel(status: StoreStatus) {
  if (status === "disabled") {
    return "Disabled";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getStaff(store: Store) {
  return store.staff ?? store.users ?? store.employees ?? store.assignedUsers ?? [];
}

function getInitials(member: StoreStaffMember) {
  if (member.initials) {
    return member.initials.slice(0, 3).toUpperCase();
  }

  const name = member.name?.trim();

  if (!name) {
    return "";
  }

  const parts = name.split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export function StoreCard({ store, index, theme, onOpen }: StoreCardProps) {
  const status = getStatus(store);
  const staff = getStaff(store).slice(0, 3);
  const extraStaffCount = Math.max(0, getStaff(store).length - staff.length);
  const isDark = theme === "dark";
  const badgeStyle = statusStyles[status];
  const typeConfig = getStoreTypeConfig({
    businessType: store.businessType,
    type: store.type,
    name: store.name,
    address: store.address,
  });
  const accentAlpha = isDark ? "66" : "40";
  const cardBackground = isDark
    ? `linear-gradient(135deg, ${typeConfig.darkModeBackground} 0%, #0b1026 48%, #0b1026 100%)`
    : `linear-gradient(135deg, ${typeConfig.lightModeBackground} 0%, #ffffff 54%, #ffffff 100%)`;
  const iconBackground = isDark
    ? `linear-gradient(135deg, ${typeConfig.accentColor} 0%, ${typeConfig.accentColor}cc 100%)`
    : `linear-gradient(135deg, ${typeConfig.accentColor} 0%, ${typeConfig.accentColor}dd 100%)`;

  return (
    <motion.article
      className={`group relative overflow-hidden rounded-[8px] border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 ${
        isDark
          ? "text-[#eceaff] shadow-black/10 hover:shadow-[0_18px_38px_rgba(0,0,0,0.28)]"
          : "text-slate-950 hover:shadow-[0_18px_36px_rgba(15,23,42,0.12)]"
      }`}
      style={{
        background: cardBackground,
        borderColor: `${typeConfig.accentColor}${accentAlpha}`,
        boxShadow: isDark
          ? `0 1px 0 ${typeConfig.accentColor}22, 0 18px 34px rgba(0,0,0,0.16)`
          : `0 1px 0 ${typeConfig.accentColor}16, 0 10px 24px rgba(15,23,42,0.06)`,
      }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: index * 0.055, ease: "easeOut" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[8px] border opacity-0 transition duration-200 group-hover:opacity-100"
        style={{ borderColor: typeConfig.accentColor }}
      />
      <div
        aria-hidden="true"
        className={`absolute -right-8 -top-10 size-28 rounded-full ${
          isDark ? "opacity-20 blur-sm" : "opacity-35"
        }`}
        style={{ backgroundColor: typeConfig.accentColor }}
      />

      <div className="relative flex gap-4">
        <div
          className="grid size-[62px] shrink-0 place-items-center rounded-[8px] text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)] transition duration-200 group-hover:scale-105"
          style={{
            background: iconBackground,
            boxShadow: `0 14px 28px ${typeConfig.accentColor}33`,
          }}
        >
          <StoreTypeIcon
            businessType={store.businessType}
            type={store.type}
            name={store.name}
            address={store.address}
            className="size-7"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2
              className={`text-xl font-bold leading-6 tracking-normal ${
                isDark ? "text-[#c8c1ff]" : "text-[#4f46d8]"
              }`}
            >
              {store.name}
            </h2>
            <span
              className={`relative z-10 inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold leading-none tracking-normal ${
                isDark ? badgeStyle.dark : badgeStyle.light
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  status === "active" && isDark ? "bg-[#34D399]" : badgeStyle.dot
                }`}
                aria-hidden="true"
              />
              {getStatusLabel(status)}
            </span>
          </div>

          <p
            className="mt-1 text-xs font-bold uppercase tracking-[0.08em]"
            style={{ color: typeConfig.accentColor }}
          >
            {typeConfig.label}
          </p>

          <p
            className={`mt-2 flex items-start gap-1.5 text-sm font-medium leading-5 ${
              isDark ? "text-slate-300" : "text-slate-700"
            }`}
          >
            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0">{store.address || "Address unavailable"}</span>
          </p>

          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="flex min-h-7 items-center -space-x-1.5">
              {staff.length ? (
                staff.map((member, memberIndex) => {
                  const initials = getInitials(member);

                  return (
                    <span
                      key={member.id ?? `${initials}-${memberIndex}`}
                      className={`grid size-7 place-items-center rounded-full border text-[10px] font-bold ${
                        isDark
                          ? "border-[#0b1026] bg-slate-700 text-slate-100"
                          : "border-white bg-blue-50 text-blue-800"
                      }`}
                    >
                      {initials || memberIndex + 1}
                    </span>
                  );
                })
              ) : (
                <span
                  className={`size-7 rounded-full ${
                    isDark ? "bg-slate-700/70" : "bg-blue-50"
                  }`}
                  aria-label="No assigned staff"
                />
              )}
              {extraStaffCount ? (
                <span className="grid size-7 place-items-center rounded-full border border-white bg-[#dcd9ff] text-[10px] font-bold text-[#4f2df2]">
                  +{extraStaffCount}
                </span>
              ) : null}
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onOpen(store)}
              className={`inline-flex h-10 min-w-[136px] items-center justify-center gap-2 rounded-[6px] border px-4 text-sm font-semibold transition ${
                isDark
                  ? "bg-white/[0.04] hover:bg-white/[0.08] group-hover:brightness-110"
                  : "bg-white/70 hover:bg-white group-hover:brightness-105"
              }`}
              style={{
                borderColor: `${typeConfig.accentColor}55`,
                color: isDark ? "#f8fafc" : typeConfig.accentColor,
              }}
            >
              Open Store
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
