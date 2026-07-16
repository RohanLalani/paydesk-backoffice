"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, MapPin, Store, X } from "lucide-react";
import { FormSelect } from "@/src/components/ui/FormSelect";
import { createStore } from "@/src/features/stores/api";
import { BUSINESS_TYPE_GROUPS } from "@/src/features/stores/businessTypes";
import type { StoreBusinessType } from "@/src/features/stores/types";
import { ApiClientError } from "@/src/lib/apiClient";
import type { PayDeskTheme } from "@/src/lib/theme";

const PENDING_STORE_KEY = "paydesk-pending-store-create";

type CreateStoreModalProps = {
  theme: PayDeskTheme;
  canCreate: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
};

const modalStyles = {
  light: {
    overlay: "bg-[rgba(15,23,42,0.20)] backdrop-blur-sm",
    panel: "border-[#DDD6FE] bg-white text-[#0F172A] shadow-[0_26px_80px_rgba(15,23,42,0.18)]",
    inner: "border-[#E2E8F0] bg-[#F8FAFC]",
    title: "text-[#0F172A]",
    body: "text-[#475569]",
    label: "text-[#334155]",
    helper: "text-[#64748B]",
    input:
      "border-[#CBD5E1] bg-white text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#4F22F2] focus:ring-[#4F22F2]/20",
    select:
      "border-[#CBD5E1] bg-white text-[#0F172A] focus:border-[#4F22F2] focus:ring-[#4F22F2]/20",
    icon: "text-[#64748B]",
    close: "border-[#DDD6FE] bg-white text-slate-600 hover:border-[#4F22F2]/50 hover:text-[#4F22F2]",
    cancel: "border-[#DDD6FE] bg-white text-slate-700 hover:border-[#4F22F2]/50 hover:text-[#4F22F2]",
    error: "border-red-200 bg-red-50 text-red-700",
  },
  dark: {
    overlay: "bg-[rgba(0,0,0,0.55)] backdrop-blur-sm",
    panel: "border-[rgba(148,163,184,0.18)] bg-[#020617] text-[#F8FAFC] shadow-[0_26px_90px_rgba(0,0,0,0.48)]",
    inner: "border-[rgba(148,163,184,0.18)] bg-[#0B1020]",
    title: "text-[#F8FAFC]",
    body: "text-[#CBD5E1]",
    label: "text-[#E2E8F0]",
    helper: "text-[#94A3B8]",
    input:
      "border-[#1E293B] bg-[#111827] text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#7C5CFF] focus:ring-[#7C5CFF]/20",
    select:
      "border-[#1E293B] bg-[#111827] text-[#F8FAFC] focus:border-[#7C5CFF] focus:ring-[#7C5CFF]/20",
    icon: "text-[#94A3B8]",
    close: "border-[rgba(148,163,184,0.18)] bg-transparent text-slate-300 hover:border-[#7C5CFF]/60 hover:text-white",
    cancel: "border-[rgba(148,163,184,0.18)] bg-transparent text-slate-200 hover:border-[#7C5CFF]/60 hover:text-white",
    error: "border-red-400/20 bg-red-950/30 text-red-200",
  },
} satisfies Record<PayDeskTheme, Record<string, string>>;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "We could not create this store. Please try again.";
}

function isBillingError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    (error instanceof ApiClientError && error.status === 402) ||
    message.includes("subscription store limit reached") ||
    message.includes("active or trial subscription is required") ||
    message.includes("payment required")
  );
}

function isPermissionError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    (error instanceof ApiClientError && error.status === 403) ||
    message.includes("forbidden") ||
    message.includes("permission")
  );
}

export function CreateStoreModal({
  theme,
  canCreate,
  onClose,
  onCreated,
}: CreateStoreModalProps) {
  const router = useRouter();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [businessType, setBusinessType] = useState<StoreBusinessType | "">("");
  const [lotteryEnabled, setLotteryEnabled] = useState(false);
  const [recipeSuiteEnabled, setRecipeSuiteEnabled] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const styles = useMemo(() => modalStyles[theme], [theme]);

  useEffect(() => {
    nameInputRef.current?.focus();

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isSubmitting, onClose]);

  function handleFocusTrap(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") {
      return;
    }

    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );

    if (!focusable?.length) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();

    if (!canCreate) {
      setError("You do not have permission to create stores.");
      return;
    }

    if (!trimmedName) {
      setError("Store Name is required.");
      nameInputRef.current?.focus();
      return;
    }

    if (!businessType) {
      setError("Business Type is required.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await createStore({
        name: trimmedName,
        address: trimmedAddress || null,
        businessType,
        lotteryEnabled,
        recipeSuiteEnabled,
      });
      await onCreated();
      onClose();
    } catch (createError) {
      if (isBillingError(createError)) {
        window.localStorage.setItem(
          PENDING_STORE_KEY,
          JSON.stringify({
            name: trimmedName,
            address: trimmedAddress || null,
            businessType,
            lotteryEnabled,
            recipeSuiteEnabled,
          }),
        );
        router.push("/billing");
        return;
      }

      if (isPermissionError(createError)) {
        setError("You do not have permission to create stores.");
      } else {
        setError(getErrorMessage(createError));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function requestClose() {
    if (!isSubmitting) {
      onClose();
    }
  }

  return (
    <motion.div
      className={`fixed inset-0 z-50 flex items-end justify-center px-4 py-0 sm:items-center sm:py-6 ${styles.overlay}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
    >
      <motion.div
        ref={panelRef}
        className={`w-full max-w-[520px] rounded-t-[18px] border p-5 sm:rounded-[14px] sm:p-6 ${styles.panel}`}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-store-modal-title"
        aria-describedby="create-store-modal-description"
        onKeyDown={handleFocusTrap}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[#4F22F2]">Create Store</p>
            <h2
              id="create-store-modal-title"
              className={`mt-2 text-2xl font-bold leading-tight tracking-normal ${styles.title}`}
            >
              Add a New Location
            </h2>
            <p
              id="create-store-modal-description"
              className={`mt-3 text-sm font-medium leading-6 ${styles.body}`}
            >
              Add a new location to manage in PayDesk. You can configure inventory
              and staff specifically for this site.
            </p>
          </div>

          <button
            type="button"
            onClick={requestClose}
            disabled={isSubmitting}
            className={`grid size-10 shrink-0 place-items-center rounded-[8px] border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F22F2]/30 disabled:cursor-not-allowed disabled:opacity-60 ${styles.close}`}
            aria-label="Close create store modal"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={`mt-6 rounded-[10px] border p-4 ${styles.inner}`}>
          <motion.div
            className="space-y-5"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.08, ease: "easeOut" }}
          >
            <div>
              <label htmlFor="store-name" className={`text-sm font-bold ${styles.label}`}>
                Store Name *
              </label>
              <div className="relative mt-2">
                <Store
                  className={`pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 ${styles.icon}`}
                  aria-hidden="true"
                />
                <input
                  ref={nameInputRef}
                  id="store-name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (error) {
                      setError("");
                    }
                  }}
                  placeholder="Example: Downtown Store"
                  disabled={isSubmitting}
                  className={`h-12 w-full rounded-[8px] border pl-11 pr-4 text-sm font-semibold outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70 ${styles.input}`}
                />
              </div>
              <p className={`mt-2 text-xs font-medium ${styles.helper}`}>
                This name will appear in Back Office and POS.
              </p>
            </div>

            <div>
              <label htmlFor="store-address" className={`text-sm font-bold ${styles.label}`}>
                Store Address
              </label>
              <div className="relative mt-2">
                <MapPin
                  className={`pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 ${styles.icon}`}
                  aria-hidden="true"
                />
                <input
                  id="store-address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Example: 123 Main Street, Beaumont, TX"
                  disabled={isSubmitting}
                  className={`h-12 w-full rounded-[8px] border pl-11 pr-4 text-sm font-semibold outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70 ${styles.input}`}
                />
              </div>
              <p className={`mt-2 text-xs font-medium ${styles.helper}`}>
                Optional. You can add or update this later.
              </p>
            </div>

            <div>
              <label htmlFor="store-business-type" className={`text-sm font-bold ${styles.label}`}>
                Business Type *
              </label>
              <div className="relative mt-2">
                <Store
                  className={`pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 ${styles.icon}`}
                  aria-hidden="true"
                />
                <FormSelect
                  id="store-business-type"
                  value={businessType}
                  onChange={(event) => {
                    setBusinessType(event.target.value as StoreBusinessType | "");
                    if (error) {
                      setError("");
                    }
                  }}
                  disabled={isSubmitting}
                  selectClassName={`h-12 appearance-none pl-11 pr-4 font-semibold focus:ring-4 ${styles.select}`}
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
                </FormSelect>
              </div>
            </div>

            <fieldset className="grid gap-3">
              <legend className={`text-sm font-bold ${styles.label}`}>
                Included Store Features
              </legend>
              {[
                {
                  id: "store-feature-lottery",
                  label: "Lottery",
                  description: "Show lottery tools for this store.",
                  checked: lotteryEnabled,
                  onChange: setLotteryEnabled,
                },
                {
                  id: "store-feature-recipe-suite",
                  label: "Recipe Suite",
                  description: "Show recipe and production tools for this store.",
                  checked: recipeSuiteEnabled,
                  onChange: setRecipeSuiteEnabled,
                },
              ].map((feature) => (
                <label
                  key={feature.id}
                  htmlFor={feature.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-[8px] border p-3 text-sm transition ${
                    feature.checked
                      ? "border-[#4F22F2] bg-[#4F22F2]/10"
                      : theme === "dark"
                        ? "border-[rgba(148,163,184,0.18)] bg-[#111827]"
                        : "border-[#CBD5E1] bg-white"
                  }`}
                >
                  <input
                    id={feature.id}
                    type="checkbox"
                    checked={feature.checked}
                    onChange={(event) => feature.onChange(event.target.checked)}
                    disabled={isSubmitting}
                    className="mt-1 size-4 accent-[#4F22F2]"
                  />
                  <span>
                    <span className={`block font-bold ${styles.label}`}>{feature.label}</span>
                    <span className={`mt-1 block text-xs font-medium leading-5 ${styles.helper}`}>
                      {feature.description}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>

            {error ? (
              <div className={`flex gap-2 rounded-[8px] border px-3 py-3 text-sm font-semibold ${styles.error}`}>
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {error}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={requestClose}
                disabled={isSubmitting}
                className={`h-11 rounded-[7px] border px-5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F22F2]/30 disabled:cursor-not-allowed disabled:opacity-60 ${styles.cancel}`}
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={isSubmitting || !name.trim() || !businessType}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[7px] bg-[#4F22F2] px-5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(79,34,242,0.28)] transition hover:bg-[#4320d4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F22F2]/35 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {isSubmitting ? "Creating..." : "Create Store"}
              </motion.button>
            </div>
          </motion.div>
        </form>
      </motion.div>
    </motion.div>
  );
}
