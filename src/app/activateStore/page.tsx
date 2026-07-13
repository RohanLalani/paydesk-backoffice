"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  Store,
} from "lucide-react";
import { createStoreCheckoutSession } from "@/src/features/billing/api";
import type { CheckoutPlan } from "@/src/features/billing/types";
import { fetchMyStores, normalizeStoreResponse } from "@/src/features/stores/api";
import type { Store as StoreRecord } from "@/src/features/stores/types";
import { ApiClientError } from "@/src/lib/apiClient";
import { getAccount, getToken } from "@/src/lib/authStorage";
import { getStoredTheme, type PayDeskTheme } from "@/src/lib/theme";

const PLANS = {
  PLUS: {
    name: "Plus",
    price: 50,
    description: "Core PayDesk backoffice and POS tools for a new store.",
  },
  ADVANCED: {
    name: "Advanced",
    price: 80,
    description: "Advanced tools for growing teams and larger store operations.",
  },
} satisfies Record<CheckoutPlan, { name: string; price: number; description: string }>;

const pageStyles = {
  light: {
    screen:
      "bg-[radial-gradient(circle_at_50%_0%,rgba(124,92,255,0.09)_0%,rgba(124,92,255,0.035)_36%,rgba(255,255,255,0)_62%),linear-gradient(180deg,#f8f7ff_0%,#f4f3fb_100%)] text-slate-950",
    frame: "border-[#d7d1ec] bg-[#f7f6fe]/95 shadow-[0_24px_80px_rgba(15,23,42,0.12)]",
    border: "border-[#d8d2ee]",
    panel: "border-[#d8d2ee] bg-white",
    selected: "border-[#4f2df2] bg-[#f0edff]",
    title: "text-slate-950",
    subtitle: "text-slate-700",
    logo: "text-[#4f2df2]",
    muted: "text-slate-600",
    control:
      "border-[#d8d2ee] bg-white text-slate-700 hover:border-[#7c5cff]/50 hover:text-[#4f2df2]",
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  dark: {
    screen:
      "bg-[radial-gradient(circle_at_50%_0%,rgba(124,92,255,0.12)_0%,rgba(37,99,235,0.05)_35%,rgba(2,6,23,0)_63%),linear-gradient(180deg,#050a19_0%,#071126_100%)] text-[#eceaff]",
    frame: "border-indigo-200/12 bg-[#071126]/94 shadow-[0_28px_90px_rgba(0,0,0,0.36)]",
    border: "border-indigo-200/10",
    panel: "border-indigo-200/10 bg-[#0b1026]/88",
    selected: "border-[#7c5cff] bg-[#4f2df2]/20",
    title: "text-[#f3f1ff]",
    subtitle: "text-slate-300",
    logo: "text-[#c8c1ff]",
    muted: "text-slate-300",
    control:
      "border-indigo-200/10 bg-[#0b1026] text-slate-300 hover:border-[#7c5cff]/60 hover:text-[#c8c1ff]",
    error: "border-red-400/20 bg-red-950/30 text-red-200",
    success: "border-emerald-400/20 bg-emerald-950/30 text-emerald-200",
  },
} satisfies Record<PayDeskTheme, Record<string, string>>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "";
}

function getCheckoutError(error: unknown) {
  console.error("Store checkout session creation failed", error);

  const message = getErrorMessage(error);
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("store already has an active or pending subscription")) {
    return "This store already has an active subscription.";
  }

  if (normalizedMessage.includes("store is already active")) {
    return "This store is already active.";
  }

  if (error instanceof ApiClientError && error.status === 404) {
    return "Store not found.";
  }

  if (
    error instanceof ApiClientError &&
    error.status === 403 &&
    (normalizedMessage.includes("access") ||
      normalizedMessage.includes("permission") ||
      normalizedMessage.includes("owner"))
  ) {
    return "You do not have permission to activate this store.";
  }

  if (normalizedMessage.includes("internal server error")) {
    return "Stripe payment setup is unavailable. Please try again.";
  }

  if (error instanceof ApiClientError && error.status === 400 && message) {
    return message;
  }

  if (error instanceof ApiClientError && error.status === 0) {
    return "PayDesk is unavailable right now. Please check your connection and try again.";
  }

  return "Could not start Stripe Checkout. Please try again.";
}

function ActivateStoreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = searchParams.get("storeId")?.trim() ?? "";
  const [theme, setTheme] = useState<PayDeskTheme>("light");
  const [isReady, setIsReady] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [store, setStore] = useState<StoreRecord | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<CheckoutPlan>("PLUS");
  const [error, setError] = useState("");
  const [isLoadingStore, setIsLoadingStore] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const styles = useMemo(() => pageStyles[theme], [theme]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    queueMicrotask(() => {
      const account = getAccount();
      setTheme(getStoredTheme());
      setIsOwner(account?.role === "owner");
      setIsReady(true);
    });
  }, [router]);

  useEffect(() => {
    if (!isReady || !storeId || !isOwner) {
      return;
    }

    let isMounted = true;

    async function loadStore() {
      setIsLoadingStore(true);
      setError("");

      try {
        const response = await fetchMyStores({ includeInactive: true });
        const stores = normalizeStoreResponse(response);
        const matchingStore = stores.find((item) => item.id === storeId) ?? null;

        if (isMounted) {
          setStore(matchingStore);
          if (!matchingStore) {
            setError("Store not found.");
          }
        }
      } catch (loadError) {
        console.error("Store lookup failed", loadError);
        if (isMounted) {
          setError("Store not found.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingStore(false);
        }
      }
    }

    void loadStore();

    return () => {
      isMounted = false;
    };
  }, [isOwner, isReady, storeId]);

  async function handleContinueToPayment() {
    if (isSavingPlan) {
      return;
    }

    if (!storeId || !store) {
      setError("Store not found.");
      return;
    }

    if (!selectedPlan) {
      setError("Choose a plan to continue.");
      return;
    }

    if (store.isActive) {
      setError("This store is already active.");
      return;
    }

    setError("");
    setIsSavingPlan(true);

    try {
      const session = await createStoreCheckoutSession({
        storeId,
        plan: selectedPlan,
      });
      window.location.assign(session.checkoutUrl);
    } catch (checkoutError) {
      setError(getCheckoutError(checkoutError));
      setIsSavingPlan(false);
    }
  }

  if (!isReady) {
    return (
      <main className={`grid min-h-dvh place-items-center ${styles.screen}`}>
        <div className={`rounded-[8px] border px-5 py-4 text-sm font-bold ${styles.panel}`}>
          Opening PayDesk...
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-dvh w-full px-4 py-6 sm:px-6 lg:px-8 ${styles.screen}`}>
      <motion.section
        className={`mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[960px] flex-col rounded-[14px] border backdrop-blur-xl ${styles.frame}`}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <header className={`flex items-center justify-between border-b px-5 py-4 sm:px-7 ${styles.border}`}>
          <div className="flex items-center gap-3">
            <Image
              src="/paydesk-logo-transparent.png"
              alt=""
              width={34}
              height={34}
              priority
              className="size-8"
            />
            <span className={`text-2xl font-bold tracking-normal ${styles.logo}`}>PayDesk</span>
          </div>

          <Link
            href="/createStore"
            className={`inline-flex h-10 items-center gap-2 rounded-[8px] border px-4 text-sm font-bold transition ${styles.control}`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Create Store
          </Link>
        </header>

        <div className="flex flex-1 flex-col px-5 py-8 sm:px-7 lg:px-9">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-[8px] bg-[#4f2df2] text-white">
              <CreditCard className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#7c5cff]">Activation setup</p>
              <h1 className={`mt-1 text-3xl font-bold leading-tight tracking-normal ${styles.title}`}>
                Activate Store
              </h1>
              <p className={`mt-3 max-w-[620px] text-base font-medium leading-6 ${styles.subtitle}`}>
                Select the subscription plan for this store. The store remains
                inactive until payment succeeds.
              </p>
            </div>
          </div>

          {!storeId ? (
            <div className={`mt-7 rounded-[8px] border p-5 text-sm font-semibold ${styles.error}`}>
              Store not found.
            </div>
          ) : !isOwner ? (
            <div className={`mt-7 rounded-[8px] border p-5 text-sm font-semibold ${styles.error}`}>
              Only owners can activate stores.
            </div>
          ) : (
            <div className="mt-7 grid gap-5 lg:grid-cols-[320px_1fr]">
              <section className={`h-fit rounded-[10px] border p-5 ${styles.panel}`}>
                <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-normal">
                  <Store className="size-5 text-[#4f2df2]" aria-hidden="true" />
                  Store summary
                </h2>

                {isLoadingStore ? (
                  <div className="mt-5 flex items-center gap-2 text-sm font-bold">
                    <Loader2 className="size-4 animate-spin text-[#4f2df2]" aria-hidden="true" />
                    Loading store...
                  </div>
                ) : store ? (
                  <div className="mt-5 space-y-4">
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-[0.08em] ${styles.muted}`}>
                        Store name
                      </p>
                      <p className="mt-1 text-xl font-extrabold">{store.name}</p>
                    </div>
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-[0.08em] ${styles.muted}`}>
                        Address
                      </p>
                      <p className="mt-1 flex gap-2 text-sm font-semibold leading-6">
                        <MapPin className="mt-1 size-4 shrink-0 text-[#4f2df2]" aria-hidden="true" />
                        {store.address || "Address not set"}
                      </p>
                    </div>
                    <div className={`rounded-[8px] border p-3 text-sm font-bold ${styles.border}`}>
                      Status: <span className="text-[#4f2df2]">Draft / inactive</span>
                    </div>
                  </div>
                ) : (
                  <p className={`mt-5 rounded-[8px] border p-3 text-sm font-semibold ${styles.error}`}>
                    Store not found.
                  </p>
                )}
              </section>

              <section className={`rounded-[10px] border p-5 ${styles.panel}`}>
                <h2 className="text-xl font-extrabold tracking-normal">Choose a plan</h2>
                <p className={`mt-2 text-sm font-semibold leading-6 ${styles.muted}`}>
                  Billing starts after payment is completed and the store is activated.
                </p>

                {error ? (
                  <div className={`mt-5 flex gap-2 rounded-[8px] border p-4 text-sm font-semibold ${styles.error}`}>
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                ) : null}

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {(["PLUS", "ADVANCED"] as const).map((plan) => {
                    const details = PLANS[plan];
                    const isSelected = selectedPlan === plan;

                    return (
                      <button
                        key={plan}
                        type="button"
                        onClick={() => setSelectedPlan(plan)}
                        className={`rounded-[8px] border p-5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35 ${
                          isSelected ? styles.selected : styles.control
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-extrabold tracking-normal">{details.name}</h3>
                            <p className={`mt-2 text-sm font-semibold leading-6 ${styles.muted}`}>
                              {details.description}
                            </p>
                          </div>
                          {isSelected ? (
                            <CheckCircle2 className="size-5 shrink-0 text-[#4f2df2]" aria-hidden="true" />
                          ) : null}
                        </div>
                        <p className="mt-6 text-3xl font-extrabold tracking-normal">
                          {formatCurrency(details.price)}
                          <span className={`text-sm font-bold ${styles.muted}`}> / store / month</span>
                        </p>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => void handleContinueToPayment()}
                  disabled={!store || isSavingPlan || isLoadingStore}
                  className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[7px] bg-[#4f2df2] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(79,45,242,0.28)] transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isSavingPlan ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                  {isSavingPlan ? "Redirecting to payment..." : "Continue to Payment"}
                </button>
              </section>
            </div>
          )}
        </div>
      </motion.section>
    </main>
  );
}

export default function ActivateStorePage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-dvh place-items-center bg-[#071126] text-[#eceaff]">
          <div className="rounded-[8px] border border-indigo-200/10 bg-[#0b1026]/88 px-5 py-4 text-sm font-bold">
            Opening PayDesk...
          </div>
        </main>
      }
    >
      <ActivateStoreContent />
    </Suspense>
  );
}
