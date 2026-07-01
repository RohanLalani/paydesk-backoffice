"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MailCheck,
} from "lucide-react";
import {
  isAuthVerificationType,
  verifyEmail,
} from "@/src/features/auth/api";
import type { AuthVerificationType } from "@/src/features/auth/types";
import { ApiClientError } from "@/src/lib/apiClient";
import { getStoredTheme, type PayDeskTheme } from "@/src/lib/theme";

type VerificationState = "verifying" | "success" | "invalid" | "failure";

type VerifyEmailScreenProps = {
  token?: string;
  type?: string;
};

type VerifyThemeStyles = {
  screen: string;
  glow: string;
  card: string;
  logoShadow: string;
  title: string;
  subtitle: string;
  statusPanel: string;
  success: string;
  error: string;
  iconPanel: string;
  secondaryButton: string;
  footer: string;
  footerLink: string;
};

const themeStyles: Record<PayDeskTheme, VerifyThemeStyles> = {
  light: {
    screen:
      "bg-[radial-gradient(circle_at_50%_42%,rgba(124,92,255,0.09)_0%,rgba(124,92,255,0.04)_34%,rgba(255,255,255,0)_58%),linear-gradient(180deg,#ffffff_0%,#fbfaff_48%,#f4f1ff_100%)]",
    glow:
      "bg-[radial-gradient(circle,rgba(124,92,255,0.2)_0%,rgba(99,102,241,0.09)_42%,rgba(255,255,255,0)_72%)]",
    card: "border border-slate-200/70 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.11)]",
    logoShadow: "drop-shadow-[0_14px_26px_rgba(79,70,229,0.16)]",
    title: "text-slate-950",
    subtitle: "text-slate-500",
    statusPanel: "border-slate-200 bg-slate-50 text-slate-600",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    error: "border-red-200 bg-red-50 text-red-700",
    iconPanel: "bg-[#edeaff] text-[#4f2df2]",
    secondaryButton:
      "border-slate-200 bg-white text-[#4f2df2] hover:border-[#7c5cff]/60 hover:bg-[#f7f5ff] focus-visible:ring-[#7c5cff]/35",
    footer: "text-slate-500",
    footerLink: "text-slate-500 hover:text-[#4f2df2]",
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
    statusPanel: "border-indigo-200/10 bg-[#050a19] text-slate-400",
    success: "border-emerald-400/20 bg-emerald-950/30 text-emerald-200",
    error: "border-red-400/20 bg-red-950/30 text-red-200",
    iconPanel: "bg-[#261b62]/70 text-[#c8c1ff]",
    secondaryButton:
      "border-indigo-200/10 bg-[#050a19] text-[#c8c1ff] hover:border-[#7c5cff]/60 hover:text-white focus-visible:ring-[#9b8cff]/35",
    footer: "text-slate-400",
    footerLink: "text-slate-500 hover:text-[#b7a9ff]",
  },
};

function getFailureState(error: unknown): VerificationState {
  if (!(error instanceof ApiClientError)) {
    return "failure";
  }

  const message = error.message.toLowerCase();

  if (
    error.status === 400 &&
    (message.includes("invalid") || message.includes("expired"))
  ) {
    return "invalid";
  }

  return "failure";
}

function getFailureMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    const message = error.message.toLowerCase();

    if (
      error.status === 400 &&
      (message.includes("invalid") || message.includes("expired"))
    ) {
      return "This verification link is invalid or has expired.";
    }
  }

  return "We could not verify your email right now. Please try again later.";
}

export function VerifyEmailScreen({ token, type }: VerifyEmailScreenProps) {
  const [theme, setTheme] = useState<PayDeskTheme>("light");
  const [state, setState] = useState<VerificationState>("verifying");
  const [message, setMessage] = useState("Verifying your email address...");
  const styles = useMemo(() => themeStyles[theme], [theme]);

  useEffect(() => {
    queueMicrotask(() => {
      setTheme(getStoredTheme());
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function runVerification() {
      const candidateType = type ?? null;
      let verificationType: AuthVerificationType | null = null;

      if (isAuthVerificationType(candidateType)) {
        verificationType = candidateType;
      }

      if (!token || !verificationType) {
        setState("invalid");
        setMessage("This verification link is missing required details.");
        return;
      }

      setState("verifying");
      setMessage("Verifying your email address...");

      try {
        const response = await verifyEmail(verificationType, token);

        if (!isMounted) {
          return;
        }

        setState("success");
        setMessage(response.message ?? "Email verified successfully.");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setState(getFailureState(error));
        setMessage(getFailureMessage(error));
      }
    }

    void runVerification();

    return () => {
      isMounted = false;
    };
  }, [token, type]);

  const isSuccess = state === "success";
  const isVerifying = state === "verifying";
  const statusStyle = isSuccess
    ? styles.success
    : state === "invalid" || state === "failure"
      ? styles.error
      : styles.statusPanel;

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
        aria-labelledby="verify-email-title"
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

            <div className={`mt-8 grid size-14 place-items-center rounded-[14px] ${styles.iconPanel}`}>
              {isSuccess ? (
                <CheckCircle2 className="size-7" aria-hidden="true" />
              ) : state === "invalid" || state === "failure" ? (
                <AlertCircle className="size-7" aria-hidden="true" />
              ) : (
                <MailCheck className="size-7" aria-hidden="true" />
              )}
            </div>

            <h1
              id="verify-email-title"
              className={`mt-6 text-[2rem] font-semibold leading-tight tracking-normal ${styles.title}`}
            >
              Verify Email
            </h1>
            <p className={`mt-4 max-w-[310px] text-base font-medium leading-7 ${styles.subtitle}`}>
              Confirm your PayDesk email address before signing in.
            </p>
          </div>

          <motion.div
            className="mt-9 space-y-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease: "easeOut" }}
          >
            <div className={`flex items-center gap-3 rounded-[8px] border px-4 py-3 text-sm font-medium ${statusStyle}`}>
              {isVerifying ? (
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
              ) : isSuccess ? (
                <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              ) : (
                <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              )}
              <span>{message}</span>
            </div>

            {isSuccess ? (
              <Link
                href="/login"
                className="flex h-13 w-full items-center justify-center gap-2 rounded-[7px] bg-[#4f2df2] px-4 text-sm font-bold uppercase tracking-[0.08em] text-white shadow-[0_12px_24px_rgba(79,45,242,0.32)] transition hover:bg-[#4322dd]"
              >
                Continue to Login
              </Link>
            ) : null}

            {!isSuccess ? (
              <Link
                href="/login"
                className={`flex h-12 w-full items-center justify-center gap-2 rounded-[7px] border text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 ${styles.secondaryButton}`}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Return to Login
              </Link>
            ) : null}
          </motion.div>
        </div>

        <div className={`mt-8 text-center ${styles.footer}`}>
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
