"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { RoleSelector } from "@/src/components/auth/RoleSelector";
import {
  getLoginAccount,
  getLoginToken,
  login,
} from "@/src/features/auth/api";
import type { AuthRole } from "@/src/features/auth/types";
import { saveAuth } from "@/src/lib/authStorage";
import { getStoredTheme, type PayDeskTheme } from "@/src/lib/theme";

type LoginThemeStyles = {
  screen: string;
  glow: string;
  card: string;
  logoShadow: string;
  title: string;
  subtitle: string;
  label: string;
  input: string;
  icon: string;
  checkbox: string;
  checkboxChecked: string;
  checkboxFocus: string;
  helper: string;
  footer: string;
  footerLink: string;
  error: string;
};

const themeStyles: Record<PayDeskTheme, LoginThemeStyles> = {
  light: {
    screen:
      "bg-[radial-gradient(circle_at_50%_42%,rgba(124,92,255,0.09)_0%,rgba(124,92,255,0.04)_34%,rgba(255,255,255,0)_58%),linear-gradient(180deg,#ffffff_0%,#fbfaff_48%,#f4f1ff_100%)]",
    glow:
      "bg-[radial-gradient(circle,rgba(124,92,255,0.2)_0%,rgba(99,102,241,0.09)_42%,rgba(255,255,255,0)_72%)]",
    card: "border border-slate-200/70 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.11)]",
    logoShadow: "drop-shadow-[0_14px_26px_rgba(79,70,229,0.16)]",
    title: "text-slate-950",
    subtitle: "text-slate-500",
    label: "text-slate-600",
    input:
      "border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 focus:border-[#7c5cff] focus:ring-[#7c5cff]/20",
    icon: "text-slate-400",
    checkbox: "border-slate-300 bg-white",
    checkboxChecked: "border-[#4f2df2] bg-[#4f2df2]",
    checkboxFocus: "peer-focus-visible:ring-[#7c5cff]/35",
    helper: "text-slate-400",
    footer: "text-slate-500",
    footerLink: "text-slate-500 hover:text-[#4f2df2]",
    error: "border-red-200 bg-red-50 text-red-700",
  },
  dark: {
    screen:
      "bg-[radial-gradient(circle_at_50%_42%,rgba(124,92,255,0.12)_0%,rgba(37,99,235,0.055)_36%,rgba(2,6,23,0)_58%),linear-gradient(180deg,#020617_0%,#030817_48%,#071126_100%)]",
    glow:
      "bg-[radial-gradient(circle,rgba(124,92,255,0.18)_0%,rgba(59,130,246,0.08)_42%,rgba(2,6,23,0)_72%)]",
    card: "border border-indigo-200/10 bg-[#070d22]/82 shadow-[0_28px_90px_rgba(0,0,0,0.36)] backdrop-blur-xl",
    logoShadow: "drop-shadow-[0_14px_30px_rgba(124,92,255,0.24)]",
    title: "text-[#eceaff]",
    subtitle: "text-slate-400",
    label: "text-slate-400",
    input:
      "border-indigo-200/10 bg-[#050a19] text-[#f3f1ff] placeholder:text-slate-600 focus:border-[#7c5cff] focus:ring-[#7c5cff]/20",
    icon: "text-slate-500",
    checkbox:
      "border-indigo-200/20 bg-[#050a19]",
    checkboxChecked:
      "border-[#4f2df2] bg-[#4f2df2] shadow-[0_0_16px_rgba(124,92,255,0.28)]",
    checkboxFocus: "peer-focus-visible:ring-[#9b8cff]/35",
    helper: "text-slate-500",
    footer: "text-slate-400",
    footerLink: "text-slate-500 hover:text-[#b7a9ff]",
    error: "border-red-400/20 bg-red-950/30 text-red-200",
  },
};

function getReadableError(error: unknown) {
  if (error instanceof Error) {
    return error.message.length > 180
      ? "Sign in failed. Please check your details and try again."
      : error.message;
  }

  return "Sign in failed. Please check your details and try again.";
}

export function LoginForm() {
  const router = useRouter();
  const [theme, setTheme] = useState<PayDeskTheme>("light");
  const [role, setRole] = useState<AuthRole>("owner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const styles = useMemo(() => themeStyles[theme], [theme]);

  useEffect(() => {
    queueMicrotask(() => {
      setTheme(getStoredTheme());
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await login(role, {
        email: email.trim(),
        password,
      });
      const token = getLoginToken(response);

      if (!token) {
        throw new Error("Sign in succeeded, but no access token was returned.");
      }

      saveAuth(token, getLoginAccount(response, role), remember);
      router.replace("/store-select");
    } catch (loginError) {
      setError(getReadableError(loginError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main
      className={`relative flex min-h-dvh w-full items-center justify-center overflow-hidden px-5 py-8 ${styles.screen}`}
    >
      <div
        aria-hidden="true"
        className={`absolute left-1/2 top-1/2 h-[min(94vw,680px)] w-[min(94vw,680px)] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${styles.glow}`}
      />

      <motion.section
        className="relative z-10 w-full max-w-[420px]"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
        aria-labelledby="login-title"
      >
        <div className={`rounded-[18px] px-8 py-9 sm:px-10 ${styles.card}`}>
          <div className="flex flex-col items-center text-center">
            <Image
              src="/paydesk-logo-transparent.png"
              alt="PayDesk"
              width={120}
              height={120}
              priority
              className={`h-auto w-16 ${styles.logoShadow}`}
            />
            <h1
              id="login-title"
              className={`mt-8 text-[2rem] font-semibold leading-tight tracking-normal ${styles.title}`}
            >
              Back Office Login
            </h1>
            <p className={`mt-4 max-w-[310px] text-base font-medium leading-7 ${styles.subtitle}`}>
              Manage your stores, products, inventory, employees, permissions,
              and reports.
            </p>
          </div>

          <motion.form
            className="mt-9 space-y-5"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease: "easeOut" }}
          >
            <div>
              <label className={`text-sm font-semibold ${styles.label}`}>
                Account Role
              </label>
              <div className="mt-2">
                <RoleSelector value={role} onChange={setRole} theme={theme} />
              </div>
            </div>

            <label className="relative block">
              <Mail
                className={`pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 ${styles.icon}`}
                aria-hidden="true"
              />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                className={`h-14 w-full rounded-[8px] border pl-12 pr-4 text-base font-medium outline-none transition focus:ring-4 ${styles.input}`}
              />
            </label>

            <label className="relative block">
              <Lock
                className={`pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 ${styles.icon}`}
                aria-hidden="true"
              />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                className={`h-14 w-full rounded-[8px] border px-12 text-base font-medium outline-none transition focus:ring-4 ${styles.input}`}
              />
              <button
                type="button"
                className={`absolute right-4 top-1/2 -translate-y-1/2 ${styles.icon}`}
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-5" aria-hidden="true" />
                ) : (
                  <Eye className="size-5" aria-hidden="true" />
                )}
              </button>
            </label>

            <div className="flex items-center justify-between gap-4">
              <label className={`flex cursor-pointer items-center gap-2 text-sm font-semibold ${styles.label}`}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="peer sr-only"
                />
                <span
                  className={`grid size-5 place-items-center rounded-[5px] border transition duration-200 peer-focus-visible:ring-4 ${
                    remember
                      ? styles.checkboxChecked
                      : styles.checkbox
                  } ${styles.checkboxFocus}`}
                  aria-hidden="true"
                >
                  <motion.span
                    initial={false}
                    animate={{
                      opacity: remember ? 1 : 0,
                      scale: remember ? 1 : 0.72,
                    }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <Check className="size-3.5 text-white" strokeWidth={3} />
                  </motion.span>
                </span>
                Remember device
              </label>
              <a
                href="#"
                className="text-sm font-semibold text-[#6d5dfc] transition hover:text-[#4f2df2]"
              >
                Forgot password?
              </a>
            </div>

            {error ? (
              <div className={`rounded-[8px] border px-4 py-3 text-sm font-medium ${styles.error}`}>
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-[7px] bg-[#4f2df2] px-4 text-sm font-bold uppercase tracking-[0.08em] text-white shadow-[0_12px_24px_rgba(79,45,242,0.32)] transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              {isLoading ? "Signing In" : "Sign In"}
            </button>

            <p className={`text-center text-sm font-semibold italic leading-6 ${styles.helper}`}>
              Your dashboard will adjust based on your permissions.
            </p>
          </motion.form>
        </div>

        <div className={`mt-8 text-center ${styles.footer}`}>
          <p className="flex items-center justify-center gap-2 text-sm font-semibold">
            <Building2 className="size-4" aria-hidden="true" />
            Cashier access is available in the PayDesk POS app.
          </p>
          <nav className="mt-7 flex items-center justify-center gap-8 text-xs font-semibold">
            <a className={styles.footerLink} href="#">
              Privacy Policy
            </a>
            <a className={styles.footerLink} href="#">
              Terms
            </a>
            <a className={styles.footerLink} href="#">
              Help Center
            </a>
          </nav>
          <p className="mt-6 text-xs font-semibold">
            © 2026 PayDesk. All rights reserved.
          </p>
        </div>
      </motion.section>
    </main>
  );
}
