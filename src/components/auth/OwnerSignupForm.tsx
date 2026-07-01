"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { signupOwner } from "@/src/features/auth/api";
import { ApiClientError } from "@/src/lib/apiClient";
import { getStoredTheme, type PayDeskTheme } from "@/src/lib/theme";

const MIN_PASSWORD_LENGTH = 8;

type SignupThemeStyles = {
  screen: string;
  glow: string;
  card: string;
  logoShadow: string;
  title: string;
  subtitle: string;
  label: string;
  input: string;
  icon: string;
  helper: string;
  footer: string;
  footerLink: string;
  error: string;
  success: string;
  secondaryButton: string;
};

const themeStyles: Record<PayDeskTheme, SignupThemeStyles> = {
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
    helper: "text-slate-400",
    footer: "text-slate-500",
    footerLink: "text-slate-500 hover:text-[#4f2df2]",
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    secondaryButton:
      "border-slate-200 bg-white text-[#4f2df2] hover:border-[#7c5cff]/60 hover:bg-[#f7f5ff] focus-visible:ring-[#7c5cff]/35",
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
    helper: "text-slate-500",
    footer: "text-slate-400",
    footerLink: "text-slate-500 hover:text-[#b7a9ff]",
    error: "border-red-400/20 bg-red-950/30 text-red-200",
    success: "border-emerald-400/20 bg-emerald-950/30 text-emerald-200",
    secondaryButton:
      "border-indigo-200/10 bg-[#050a19] text-[#c8c1ff] hover:border-[#7c5cff]/60 hover:text-white focus-visible:ring-[#9b8cff]/35",
  },
};

function getReadableError(error: unknown) {
  if (error instanceof Error) {
    if (
      error instanceof ApiClientError &&
      error.status === 404 &&
      error.message.toLowerCase().includes("cannot post")
    ) {
      return "Owner signup is not available yet. Backend endpoint needs to be added.";
    }

    return error.message.length > 180
      ? "Owner sign up failed. Please check your details and try again."
      : error.message;
  }

  return "Owner sign up failed. Please check your details and try again.";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isBackendCompatiblePassword(password: string) {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export function OwnerSignupForm() {
  const [theme, setTheme] = useState<PayDeskTheme>("light");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const styles = useMemo(() => themeStyles[theme], [theme]);

  useEffect(() => {
    queueMicrotask(() => {
      setTheme(getStoredTheme());
    });
  }, []);

  function validateForm() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
      return "Complete all fields to create the owner account.";
    }

    if (!isValidEmail(email.trim())) {
      return "Enter a valid email address.";
    }

    if (!isBackendCompatiblePassword(password)) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters and include uppercase, lowercase, number, and special character.`;
    }

    if (password !== confirmPassword) {
      return "Password and confirm password must match.";
    }

    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await signupOwner({
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        email: email.trim(),
        password,
      });
      setSuccess(
        response.message ??
          "Owner account created. Please verify your email before logging in.",
      );
    } catch (signupError) {
      setError(getReadableError(signupError));
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
        className={`absolute left-1/2 top-1/2 h-[min(94vw,720px)] w-[min(94vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${styles.glow}`}
      />

      <motion.section
        className="relative z-10 w-full max-w-[460px]"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
        aria-labelledby="signup-title"
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
              id="signup-title"
              className={`mt-8 text-[2rem] font-semibold leading-tight tracking-normal ${styles.title}`}
            >
              Owner Sign Up
            </h1>
            <p className={`mt-4 max-w-[330px] text-base font-medium leading-7 ${styles.subtitle}`}>
              Create the main owner account for your PayDesk back office.
            </p>
          </div>

          <motion.form
            className="mt-9 space-y-5"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease: "easeOut" }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="relative block">
                <User
                  className={`pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 ${styles.icon}`}
                  aria-hidden="true"
                />
                <input
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="First name"
                  className={`h-14 w-full rounded-[8px] border pl-12 pr-4 text-base font-medium outline-none transition focus:ring-4 ${styles.input}`}
                />
              </label>

              <label className="relative block">
                <User
                  className={`pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 ${styles.icon}`}
                  aria-hidden="true"
                />
                <input
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Last name"
                  className={`h-14 w-full rounded-[8px] border pl-12 pr-4 text-base font-medium outline-none transition focus:ring-4 ${styles.input}`}
                />
              </label>
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
                autoComplete="new-password"
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

            <label className="relative block">
              <Lock
                className={`pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 ${styles.icon}`}
                aria-hidden="true"
              />
              <input
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
                className={`h-14 w-full rounded-[8px] border px-12 text-base font-medium outline-none transition focus:ring-4 ${styles.input}`}
              />
              <button
                type="button"
                className={`absolute right-4 top-1/2 -translate-y-1/2 ${styles.icon}`}
                onClick={() => setShowConfirmPassword((value) => !value)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-5" aria-hidden="true" />
                ) : (
                  <Eye className="size-5" aria-hidden="true" />
                )}
              </button>
            </label>

            {error ? (
              <div className={`rounded-[8px] border px-4 py-3 text-sm font-medium ${styles.error}`}>
                {error}
              </div>
            ) : null}

            {success ? (
              <div className={`flex items-center gap-2 rounded-[8px] border px-4 py-3 text-sm font-medium ${styles.success}`}>
                <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                {success}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-[7px] bg-[#4f2df2] px-4 text-sm font-bold uppercase tracking-[0.08em] text-white shadow-[0_12px_24px_rgba(79,45,242,0.32)] transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              {isLoading ? "Creating Owner" : "Create Owner Account"}
            </button>

            <Link
              href="/login"
              className={`flex h-12 w-full items-center justify-center gap-2 rounded-[7px] border text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 ${styles.secondaryButton}`}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Return to Login
            </Link>

            <p className={`text-center text-sm font-semibold italic leading-6 ${styles.helper}`}>
              Partner, manager, and employee accounts are created later by the owner.
            </p>
          </motion.form>
        </div>

        <div className={`mt-8 text-center ${styles.footer}`}>
          <p className="flex items-center justify-center gap-2 text-sm font-semibold">
            <Building2 className="size-4" aria-hidden="true" />
            This creates the primary PayDesk owner account.
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
        </div>
      </motion.section>
    </main>
  );
}
