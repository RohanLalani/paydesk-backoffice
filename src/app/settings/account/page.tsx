"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  KeyRound,
  LogOut,
  MonitorCog,
  ShieldCheck,
  Store,
  User,
} from "lucide-react";
import packageJson from "@/package.json";
import type { AuthAccount } from "@/src/features/auth/types";
import { getSelectedStore, clearSelectedStoreStorage } from "@/src/context/StoreContext";
import type { Store as StoreType } from "@/src/features/stores/types";
import { clearAuth, getAccount, getToken } from "@/src/lib/authStorage";
import { getStoredTheme, setStoredTheme, type PayDeskTheme } from "@/src/lib/theme";

const styles = {
  light: {
    screen:
      "bg-[radial-gradient(circle_at_50%_0%,rgba(124,92,255,0.09)_0%,rgba(124,92,255,0.035)_36%,rgba(255,255,255,0)_62%),linear-gradient(180deg,#f8f7ff_0%,#f4f3fb_100%)] text-slate-950",
    frame: "border-[#d7d1ec] bg-[#f7f6fe]/95 shadow-[0_24px_80px_rgba(15,23,42,0.12)]",
    card: "border-[#d8d2ee] bg-white",
    muted: "text-slate-600",
    title: "text-slate-950",
    control: "border-[#d8d2ee] bg-white text-slate-700 hover:border-[#7c5cff]/60 hover:text-[#4f2df2]",
    selected: "border-[#4f2df2] bg-[#edeaff] text-[#4f2df2]",
  },
  dark: {
    screen:
      "bg-[radial-gradient(circle_at_50%_0%,rgba(124,92,255,0.12)_0%,rgba(37,99,235,0.05)_35%,rgba(2,6,23,0)_63%),linear-gradient(180deg,#050a19_0%,#071126_100%)] text-[#eceaff]",
    frame: "border-indigo-200/12 bg-[#071126]/94 shadow-[0_28px_90px_rgba(0,0,0,0.36)]",
    card: "border-indigo-200/10 bg-[#0b1026]/88",
    muted: "text-slate-300",
    title: "text-[#f3f1ff]",
    control: "border-indigo-200/10 bg-[#0b1026] text-slate-300 hover:border-[#7c5cff]/60 hover:text-[#c8c1ff]",
    selected: "border-[#7c5cff] bg-[#4f2df2]/20 text-[#c8c1ff]",
  },
} satisfies Record<PayDeskTheme, Record<string, string>>;

function displayValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : "Not available";
}

function formatRole(role?: string) {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "Not available";
}

function SettingsSection({
  title,
  icon,
  children,
  theme,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  theme: PayDeskTheme;
}) {
  const themeStyles = styles[theme];

  return (
    <section className={`rounded-[8px] border p-5 ${themeStyles.card}`}>
      <h2 className={`flex items-center gap-2 text-lg font-bold ${themeStyles.title}`}>
        {icon}
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<PayDeskTheme>("light");
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);
  const themeStyles = useMemo(() => styles[theme], [theme]);

  useEffect(() => {
    queueMicrotask(() => {
      setTheme(getStoredTheme());
      setAccount(getAccount());
      setSelectedStore(getSelectedStore());
    });

    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  function handleThemeChange(nextTheme: PayDeskTheme) {
    setTheme(nextTheme);
    setStoredTheme(nextTheme);
  }

  function handleLogout() {
    clearSelectedStoreStorage();
    clearAuth();
    router.replace("/login");
  }

  return (
    <main className={`min-h-dvh w-full px-4 py-6 sm:px-6 lg:px-8 ${themeStyles.screen}`}>
      <motion.section
        className={`mx-auto min-h-[calc(100dvh-3rem)] w-full max-w-[900px] rounded-[14px] border p-5 backdrop-blur-xl sm:p-7 lg:p-9 ${themeStyles.frame}`}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push("/store-select")}
              className={`inline-flex h-10 items-center gap-2 rounded-[8px] border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35 ${themeStyles.control}`}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Stores
            </button>
            <h1 className={`mt-5 text-3xl font-bold leading-tight tracking-normal ${themeStyles.title}`}>
              Account Settings
            </h1>
          </div>
        </header>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <SettingsSection
            title="Profile Information"
            icon={<User className="size-5" aria-hidden="true" />}
            theme={theme}
          >
            <dl className="grid gap-4">
              <div>
                <dt className={`text-xs font-bold uppercase tracking-[0.08em] ${themeStyles.muted}`}>
                  Name
                </dt>
                <dd className="mt-1 text-base font-semibold">{displayValue(account?.name)}</dd>
              </div>
              <div>
                <dt className={`text-xs font-bold uppercase tracking-[0.08em] ${themeStyles.muted}`}>
                  Email
                </dt>
                <dd className="mt-1 text-base font-semibold">{displayValue(account?.email)}</dd>
              </div>
              <div>
                <dt className={`text-xs font-bold uppercase tracking-[0.08em] ${themeStyles.muted}`}>
                  Role
                </dt>
                <dd className="mt-1 text-base font-semibold">{formatRole(account?.role)}</dd>
              </div>
            </dl>
          </SettingsSection>

          <SettingsSection
            title="Security"
            icon={<ShieldCheck className="size-5" aria-hidden="true" />}
            theme={theme}
          >
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-[7px] bg-[#4f2df2] px-4 text-sm font-bold text-white shadow-[0_12px_24px_rgba(79,45,242,0.24)] transition hover:bg-[#4322dd] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35"
            >
              <KeyRound className="size-4" aria-hidden="true" />
              Change Password
            </button>
            <p className={`mt-4 text-sm font-medium leading-6 ${themeStyles.muted}`}>
              Two Factor Authentication placeholder
            </p>
          </SettingsSection>

          <SettingsSection
            title="Preferences"
            icon={<MonitorCog className="size-5" aria-hidden="true" />}
            theme={theme}
          >
            <div className="inline-grid grid-cols-2 rounded-[8px] border border-[#7c5cff]/20 p-1">
              {(["light", "dark"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleThemeChange(option)}
                  className={`h-10 rounded-[6px] px-5 text-sm font-bold capitalize transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35 ${
                    theme === option ? themeStyles.selected : "text-inherit hover:bg-[#7c5cff]/10"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </SettingsSection>

          <SettingsSection
            title="Session"
            icon={<LogOut className="size-5" aria-hidden="true" />}
            theme={theme}
          >
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-11 items-center gap-2 rounded-[7px] bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/35"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Logout
            </button>
          </SettingsSection>

          <SettingsSection
            title="Application Info"
            icon={<Store className="size-5" aria-hidden="true" />}
            theme={theme}
          >
            <dl className="grid gap-4">
              <div>
                <dt className={`text-xs font-bold uppercase tracking-[0.08em] ${themeStyles.muted}`}>
                  PayDesk version
                </dt>
                <dd className="mt-1 text-base font-semibold">{packageJson.version}</dd>
              </div>
              <div>
                <dt className={`text-xs font-bold uppercase tracking-[0.08em] ${themeStyles.muted}`}>
                  Current selected store
                </dt>
                <dd className="mt-1 text-base font-semibold">
                  {selectedStore?.name ?? "No store selected"}
                </dd>
              </div>
            </dl>
          </SettingsSection>
        </div>
      </motion.section>
    </main>
  );
}
