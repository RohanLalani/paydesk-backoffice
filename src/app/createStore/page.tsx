"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MapPin,
  Power,
  Store,
} from "lucide-react";
import { getBillingSubscription } from "@/src/features/billing/api";
import {
  activateStore,
  createStore,
  fetchMyStores,
  normalizeCreateStoreResponse,
  normalizeStoreResponse,
} from "@/src/features/stores/api";
import { BUSINESS_TYPE_GROUPS } from "@/src/features/stores/businessTypes";
import type { Store as StoreRecord, StoreBusinessType } from "@/src/features/stores/types";
import { ApiClientError } from "@/src/lib/apiClient";
import { getAccount, getToken } from "@/src/lib/authStorage";
import { getStoredTheme, type PayDeskTheme } from "@/src/lib/theme";

type FormStatus = "idle" | "creating" | "activating";

const pageStyles = {
  light: {
    screen:
      "bg-[radial-gradient(circle_at_50%_0%,rgba(124,92,255,0.09)_0%,rgba(124,92,255,0.035)_36%,rgba(255,255,255,0)_62%),linear-gradient(180deg,#f8f7ff_0%,#f4f3fb_100%)] text-slate-950",
    frame: "border-[#d7d1ec] bg-[#f7f6fe]/95 shadow-[0_24px_80px_rgba(15,23,42,0.12)]",
    border: "border-[#d8d2ee]",
    title: "text-slate-950",
    subtitle: "text-slate-700",
    logo: "text-[#4f2df2]",
    panel: "border-[#d8d2ee] bg-white",
    muted: "text-slate-600",
    input:
      "border-[#d8d2ee] bg-white text-slate-900 placeholder:text-slate-500 focus:border-[#7c5cff] focus:ring-[#7c5cff]/20",
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    control:
      "border-[#d8d2ee] bg-white text-slate-700 hover:border-[#7c5cff]/50 hover:text-[#4f2df2]",
  },
  dark: {
    screen:
      "bg-[radial-gradient(circle_at_50%_0%,rgba(124,92,255,0.12)_0%,rgba(37,99,235,0.05)_35%,rgba(2,6,23,0)_63%),linear-gradient(180deg,#050a19_0%,#071126_100%)] text-[#eceaff]",
    frame: "border-indigo-200/12 bg-[#071126]/94 shadow-[0_28px_90px_rgba(0,0,0,0.36)]",
    border: "border-indigo-200/10",
    title: "text-[#f3f1ff]",
    subtitle: "text-slate-300",
    logo: "text-[#c8c1ff]",
    panel: "border-indigo-200/10 bg-[#0b1026]/88",
    muted: "text-slate-300",
    input:
      "border-indigo-200/10 bg-[#050a19] text-[#f3f1ff] placeholder:text-slate-500 focus:border-[#7c5cff] focus:ring-[#7c5cff]/20",
    error: "border-red-400/20 bg-red-950/30 text-red-200",
    success: "border-emerald-400/20 bg-emerald-950/30 text-emerald-200",
    control:
      "border-indigo-200/10 bg-[#0b1026] text-slate-300 hover:border-[#7c5cff]/60 hover:text-[#c8c1ff]",
  },
} satisfies Record<PayDeskTheme, Record<string, string>>;

function getRawMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

function isInternalServerError(error: unknown) {
  return getRawMessage(error).toLowerCase().includes("internal server error");
}

function mapCreateError(error: unknown) {
  console.error("Create store failed", error);

  const message = getRawMessage(error);
  const normalizedMessage = message.toLowerCase();

  if (error instanceof ApiClientError && error.status === 400 && !isInternalServerError(error)) {
    return message;
  }

  if (
    error instanceof ApiClientError &&
    error.status === 403 &&
    (normalizedMessage.includes("only owners") || normalizedMessage.includes("permission"))
  ) {
    return "Only owners can create stores.";
  }

  return "Could not create store. Please try again.";
}

function mapActivationError(error: unknown) {
  console.error("Activate store failed", error);

  const message = getRawMessage(error);
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("subscription store limit reached")) {
    return {
      message: "Your subscription store limit has been reached.",
      showBillingLink: true,
    };
  }

  if (
    normalizedMessage.includes("active subscription") ||
    normalizedMessage.includes("active or trial") ||
    isInternalServerError(error)
  ) {
    return {
      message: "You need an active subscription before activating this store.",
      showBillingLink: true,
    };
  }

  if (
    error instanceof ApiClientError &&
    error.status === 403 &&
    (normalizedMessage.includes("only owners") || normalizedMessage.includes("permission"))
  ) {
    return {
      message: "Only owners can activate stores.",
      showBillingLink: false,
    };
  }

  if (error instanceof ApiClientError && error.status === 400 && !isInternalServerError(error)) {
    return {
      message,
      showBillingLink: false,
    };
  }

  return {
    message: "Could not activate store. Please try again.",
    showBillingLink: false,
  };
}

function mapBillingCheckError(error: unknown) {
  console.debug("Billing subscription lookup failed", error);

  const message = getRawMessage(error).toLowerCase();

  if (
    error instanceof ApiClientError &&
    (error.status === 403 ||
      error.status === 404 ||
      message.includes("active or trial") ||
      isInternalServerError(error))
  ) {
    return "You need an active subscription before activating this store.";
  }

  return "Could not check billing. Please try again.";
}

export default function CreateStorePage() {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState<PayDeskTheme>("light");
  const [isOwner, setIsOwner] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [businessType, setBusinessType] = useState<StoreBusinessType | "">("");
  const [createdStore, setCreatedStore] = useState<StoreRecord | null>(null);
  const [draftStores, setDraftStores] = useState<StoreRecord[]>([]);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [error, setError] = useState("");
  const [showBillingLink, setShowBillingLink] = useState(false);
  const [success, setSuccess] = useState("");
  const styles = useMemo(() => pageStyles[theme], [theme]);

  async function loadDraftStores() {
    try {
      const response = await fetchMyStores({ includeInactive: true });
      const stores = normalizeStoreResponse(response);
      setDraftStores(stores.filter((store) => store.isActive === false));
    } catch (loadError) {
      console.debug("Draft store lookup failed", loadError);
    }
  }

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
      void loadDraftStores();
    });
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();

    if (!isOwner) {
      setError("Only owners can create stores.");
      setShowBillingLink(false);
      return;
    }

    if (!trimmedName) {
      setError("Store Name is required.");
      setShowBillingLink(false);
      nameRef.current?.focus();
      return;
    }

    if (!businessType) {
      setError("Business Type is required.");
      setShowBillingLink(false);
      return;
    }

    setStatus("creating");
    setError("");
    setShowBillingLink(false);
    setSuccess("");

    try {
      const response = await createStore({
        name: trimmedName,
        address: trimmedAddress || null,
        businessType,
      });
      const store = normalizeCreateStoreResponse(response);
      setCreatedStore(store);
      setSuccess("Store created. Activate it when you're ready to use it.");
      await loadDraftStores();
    } catch (createError) {
      setError(mapCreateError(createError));
    } finally {
      setStatus("idle");
    }
  }

  async function handleActivateStore(store: StoreRecord) {
    if (!isOwner) {
      setError("Only owners can activate stores.");
      setShowBillingLink(false);
      return;
    }

    setStatus("activating");
    setError("");
    setShowBillingLink(false);
    setSuccess("");

    try {
      await getBillingSubscription();
    } catch (billingError) {
      setError(mapBillingCheckError(billingError));
      setShowBillingLink(true);
      setStatus("idle");
      return;
    }

    try {
      const response = await activateStore(store.id);
      const activatedStore = normalizeCreateStoreResponse(response);
      setCreatedStore(activatedStore);
      setSuccess("Store activated successfully.");
      await Promise.all([loadDraftStores(), getBillingSubscription().catch(() => null)]);
    } catch (activationError) {
      const normalizedError = mapActivationError(activationError);
      setError(normalizedError.message);
      setShowBillingLink(normalizedError.showBillingLink);
    } finally {
      setStatus("idle");
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
        className={`mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[920px] flex-col rounded-[14px] border backdrop-blur-xl ${styles.frame}`}
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
            href="/store-select"
            className={`inline-flex h-10 items-center gap-2 rounded-[8px] border px-4 text-sm font-bold transition ${styles.control}`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Store Select
          </Link>
        </header>

        <div className="grid flex-1 gap-6 px-5 py-8 sm:px-7 lg:grid-cols-[1fr_320px] lg:px-9">
          <section>
            <div>
              <p className="text-sm font-bold text-[#7c5cff]">Owner setup</p>
              <h1 className={`mt-2 text-3xl font-bold leading-tight tracking-normal ${styles.title}`}>
                Create Store
              </h1>
              <p className={`mt-3 max-w-[560px] text-base font-medium leading-6 ${styles.subtitle}`}>
                Create the store as a draft first. Activation happens separately
                when billing is ready.
              </p>
            </div>

            {!isOwner ? (
              <div className={`mt-7 rounded-[8px] border p-5 text-sm font-semibold ${styles.error}`}>
                <div className="flex gap-2">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  Only owners can create stores.
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={`mt-7 rounded-[10px] border p-5 ${styles.panel}`}>
                <div className="space-y-5">
                  <div>
                    <label htmlFor="store-name" className="text-sm font-bold">
                      Store Name *
                    </label>
                    <div className="relative mt-2">
                      <Store
                        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500"
                        aria-hidden="true"
                      />
                      <input
                        ref={nameRef}
                        id="store-name"
                        value={name}
                        onChange={(event) => {
                          setName(event.target.value);
                          setError("");
                          setShowBillingLink(false);
                        }}
                        placeholder="Example: Downtown Store"
                        disabled={status !== "idle"}
                        className={`h-12 w-full rounded-[8px] border pl-11 pr-4 text-sm font-semibold outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70 ${styles.input}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="store-address" className="text-sm font-bold">
                      Store Address
                    </label>
                    <div className="relative mt-2">
                      <MapPin
                        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500"
                        aria-hidden="true"
                      />
                      <input
                        id="store-address"
                        value={address}
                        onChange={(event) => {
                          setAddress(event.target.value);
                          setError("");
                          setShowBillingLink(false);
                        }}
                        placeholder="Example: 123 Main Street, Beaumont, TX"
                        disabled={status !== "idle"}
                        className={`h-12 w-full rounded-[8px] border pl-11 pr-4 text-sm font-semibold outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70 ${styles.input}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="store-business-type" className="text-sm font-bold">
                      Business Type *
                    </label>
                    <div className="relative mt-2">
                      <Store
                        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500"
                        aria-hidden="true"
                      />
                      <select
                        id="store-business-type"
                        value={businessType}
                        onChange={(event) => {
                          setBusinessType(event.target.value as StoreBusinessType | "");
                          setError("");
                          setShowBillingLink(false);
                        }}
                        disabled={status !== "idle"}
                        className={`h-12 w-full appearance-none rounded-[8px] border pl-11 pr-4 text-sm font-semibold outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70 ${styles.input}`}
                      >
                        <option value="">Select a business type</option>
                        {BUSINESS_TYPE_GROUPS.map((group) => (
                          <optgroup key={group.label} label={group.label}>
                            {group.options.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>

                  {error ? (
                    <div className={`rounded-[8px] border px-4 py-3 text-sm font-semibold ${styles.error}`}>
                      <div className="flex gap-2">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <span>{error}</span>
                      </div>
                      {showBillingLink ? (
                        <Link
                          href="/billing"
                          className="mt-3 inline-flex h-10 items-center rounded-[7px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd]"
                        >
                          Go to Billing
                        </Link>
                      ) : null}
                    </div>
                  ) : null}

                  {success ? (
                    <div className={`rounded-[8px] border px-4 py-3 text-sm font-semibold ${styles.success}`}>
                      <div className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <span>{success}</span>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      disabled={status !== "idle" || !name.trim() || !businessType}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-[7px] bg-[#4f2df2] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(79,45,242,0.28)] transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {status === "creating" ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : null}
                      Create Store
                    </button>

                    {createdStore ? (
                      <button
                        type="button"
                        onClick={() => void handleActivateStore(createdStore)}
                        disabled={status !== "idle" || createdStore.isActive === true}
                        className={`inline-flex h-11 items-center justify-center gap-2 rounded-[7px] border px-5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles.control}`}
                      >
                        {status === "activating" ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Power className="size-4" aria-hidden="true" />
                        )}
                        Activate Store
                      </button>
                    ) : null}

                    <Link
                      href="/store-select"
                      className={`inline-flex h-11 items-center justify-center rounded-[7px] border px-5 text-sm font-bold transition ${styles.control}`}
                    >
                      Back to Store Select
                    </Link>
                  </div>
                </div>
              </form>
            )}
          </section>

          <aside className={`h-fit rounded-[10px] border p-5 ${styles.panel}`}>
            <h2 className="text-lg font-extrabold tracking-normal">Draft stores</h2>
            <p className={`mt-2 text-sm font-semibold leading-6 ${styles.muted}`}>
              Inactive stores are not billed until activated.
            </p>

            <div className="mt-5 space-y-3">
              {draftStores.length ? (
                draftStores.map((store) => (
                  <div key={store.id} className={`rounded-[8px] border p-3 ${styles.border}`}>
                    <p className="font-bold">{store.name}</p>
                    <p className={`mt-1 text-xs font-semibold ${styles.muted}`}>
                      {store.address || "Address not set"}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleActivateStore(store)}
                      disabled={status !== "idle"}
                      className="mt-3 inline-flex h-9 items-center gap-2 rounded-[7px] bg-[#4f2df2] px-3 text-xs font-bold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Power className="size-3.5" aria-hidden="true" />
                      Activate
                    </button>
                  </div>
                ))
              ) : (
                <p className={`rounded-[8px] border p-3 text-sm font-semibold ${styles.border} ${styles.muted}`}>
                  No draft stores yet.
                </p>
              )}
            </div>
          </aside>
        </div>
      </motion.section>
    </main>
  );
}
