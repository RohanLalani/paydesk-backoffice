"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const SPLASH_DURATION_MS = 3500;
const THEME_STORAGE_KEY = "paydesk-theme";
const LOGO_SRC = "/paydesk-logo-transparent.png";

type PayDeskTheme = "light" | "dark";

type SplashThemeStyles = {
  background: string;
  glow: string;
  logoShadow: string;
  fallbackLogo: string;
  wordmark: string;
  wordmarkGlow: string;
  loadingTrack: string;
  loadingBar: string;
};

const themeStyles: Record<PayDeskTheme, SplashThemeStyles> = {
  light: {
    background:
      "bg-[radial-gradient(circle_at_50%_52%,rgba(124,92,255,0.1)_0%,rgba(124,92,255,0.055)_26%,rgba(255,255,255,0)_50%),linear-gradient(180deg,#ffffff_0%,#fbfaff_48%,#f6f3ff_100%)]",
    glow:
      "bg-[radial-gradient(circle,rgba(124,92,255,0.22)_0%,rgba(99,102,241,0.12)_34%,rgba(124,92,255,0.045)_58%,rgba(255,255,255,0)_74%)]",
    logoShadow: "drop-shadow-[0_20px_48px_rgba(76,29,149,0.16)]",
    fallbackLogo:
      "bg-[linear-gradient(135deg,#32158d_0%,#4f2cd5_48%,#7c5cff_100%)] text-transparent bg-clip-text",
    wordmark:
      "bg-[linear-gradient(135deg,#4338ca_0%,#5b4bea_46%,#7c5cff_100%)] text-transparent bg-clip-text",
    wordmarkGlow: "drop-shadow-[0_14px_30px_rgba(99,102,241,0.18)]",
    loadingTrack: "bg-indigo-950/10",
    loadingBar:
      "bg-[linear-gradient(90deg,rgba(67,56,202,0)_0%,#4338ca_18%,#7c5cff_62%,rgba(167,139,250,0)_100%)] shadow-[0_0_18px_rgba(124,92,255,0.36)]",
  },
  dark: {
    background:
      "bg-[radial-gradient(circle_at_50%_52%,rgba(79,70,229,0.14)_0%,rgba(37,99,235,0.065)_30%,rgba(2,6,23,0)_55%),linear-gradient(180deg,#020617_0%,#030817_46%,#050b1f_100%)]",
    glow:
      "bg-[radial-gradient(circle,rgba(124,92,255,0.22)_0%,rgba(37,99,235,0.1)_35%,rgba(99,102,241,0.04)_60%,rgba(2,6,23,0)_76%)]",
    logoShadow: "drop-shadow-[0_22px_54px_rgba(124,92,255,0.26)]",
    fallbackLogo:
      "bg-[linear-gradient(135deg,#4f46e5_0%,#6d5dfc_50%,#8b7cff_100%)] text-transparent bg-clip-text",
    wordmark:
      "bg-[linear-gradient(135deg,#ffffff_0%,#d9d6ff_45%,#b7a9ff_100%)] text-transparent bg-clip-text",
    wordmarkGlow: "drop-shadow-[0_16px_34px_rgba(183,169,255,0.24)]",
    loadingTrack: "bg-white/[0.075]",
    loadingBar:
      "bg-[linear-gradient(90deg,rgba(183,169,255,0)_0%,#a5b4fc_18%,#7c5cff_58%,rgba(124,92,255,0)_100%)] shadow-[0_0_18px_rgba(124,92,255,0.34)]",
  },
};

function getSavedTheme(): PayDeskTheme {
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  return "light";
}

export function PayDeskSplash() {
  const router = useRouter();
  const [theme, setTheme] = useState<PayDeskTheme>("light");
  const [isLogoAvailable, setIsLogoAvailable] = useState(true);
  const styles = useMemo(() => themeStyles[theme], [theme]);

  useEffect(() => {
    queueMicrotask(() => {
      setTheme(getSavedTheme());
    });
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      router.replace("/login");
    }, SPLASH_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [router]);

  return (
    <motion.main
      className={`relative grid min-h-dvh w-full place-items-center overflow-hidden px-6 ${styles.background}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <motion.div
        aria-hidden="true"
        className={`absolute left-1/2 top-1/2 h-[min(92vw,680px)] w-[min(92vw,680px)] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${styles.glow}`}
        initial={{ opacity: 0.7, scale: 0.92 }}
        animate={{ opacity: [0.7, 1, 0.7], scale: [0.92, 1.05, 0.92] }}
        transition={{
          duration: 3.2,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />

      <motion.section
        className="relative z-10 flex -translate-y-3 flex-col items-center justify-center sm:-translate-y-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        aria-label="PayDesk is loading"
      >
        {isLogoAvailable ? (
          <Image
            src={LOGO_SRC}
            alt=""
            width={180}
            height={180}
            priority
            className={`h-auto w-[clamp(5.5rem,17vw,8.25rem)] ${styles.logoShadow}`}
            onError={() => setIsLogoAvailable(false)}
          />
        ) : (
          <div
            className={`text-[clamp(3.25rem,10vw,5.2rem)] font-black leading-none tracking-normal ${styles.fallbackLogo}`}
            aria-hidden="true"
          >
            PD
          </div>
        )}

        <motion.h1
          className={`mt-8 text-[clamp(2.05rem,8vw,3rem)] font-semibold leading-none tracking-normal ${styles.wordmark} ${styles.wordmarkGlow}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.62, delay: 0.22, ease: "easeOut" }}
        >
          PayDesk
        </motion.h1>
      </motion.section>

      <div
        className={`absolute bottom-[max(4.4rem,calc(env(safe-area-inset-bottom)+3.5rem))] left-1/2 z-10 h-px w-[min(34vw,148px)] -translate-x-1/2 overflow-hidden rounded-full ${styles.loadingTrack}`}
      >
        <motion.div
          className={`h-full w-full rounded-full ${styles.loadingBar}`}
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: SPLASH_DURATION_MS / 1000, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
    </motion.main>
  );
}
