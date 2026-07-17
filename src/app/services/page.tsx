"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { BackOfficeShell, type BackOfficeShellContext } from "@/src/components/layout/BackOfficeShell";
import { PayDeskSwitch } from "@/src/components/ui/Switch";
import {
  addLoyaltyService,
  getStoreBillingSummary,
  getStoreServices,
  removeLoyaltyService,
  type LoyaltyService,
  type StoreBillingSummary,
} from "@/src/features/billing/api";
import { STORE_CAPABILITIES_UPDATED_EVENT } from "@/src/features/stores/capabilities";
import { updateStoreFeatures } from "@/src/features/stores/api";

function statusLabel(status?: string) {
  switch (status) {
    case "active":
      return "Active";
    case "pending":
    case "incomplete":
      return "Pending";
    case "past_due":
      return "Past due";
    case "canceled":
      return "Canceled";
    default:
      return "Not added";
  }
}

function LoyaltyConfirmationDialog({
  theme,
  title = "Add Loyalty Service?",
  description = "Loyalty will be added to this store's existing Stripe subscription for $49 per month.",
  storeName,
  basePlan,
  mode = "add",
  isProcessing,
  error,
  onCancel,
  onConfirm,
}: {
  theme: BackOfficeShellContext["theme"];
  title?: string;
  description?: string;
  storeName: string;
  basePlan?: string | null;
  mode?: "add" | "remove";
  isProcessing: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isDark = theme === "dark";
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      cancelButtonRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && !isProcessing) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProcessing, onCancel]);

  function handleFocusTrap(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") {
      return;
    }

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-0 backdrop-blur-sm sm:items-center sm:py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isProcessing) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-loyalty-title"
        aria-describedby="add-loyalty-description"
        onKeyDown={handleFocusTrap}
        className={`w-full max-w-[560px] rounded-t-[18px] border p-5 shadow-[0_28px_90px_rgba(15,23,42,0.24)] sm:rounded-[14px] sm:p-6 ${
          isDark ? "border-slate-400/15 bg-[#0b1224] text-[#f4f1ff]" : "border-[#ded8f3] bg-white text-slate-950"
        }`}
      >
        <h2 id="add-loyalty-title" className="text-2xl font-bold tracking-normal">
          {title}
        </h2>
        <p id="add-loyalty-description" className={`mt-3 text-sm font-semibold leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
          {description}
        </p>

        <dl className={`mt-5 grid gap-3 rounded-[8px] border p-4 ${isDark ? "border-slate-400/15 bg-white/[0.04]" : "border-[#ded8f3] bg-[#fbfaff]"}`}>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-xs font-bold uppercase text-slate-500">Store</dt>
            <dd className="text-sm font-bold">{storeName}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-xs font-bold uppercase text-slate-500">Current base plan</dt>
            <dd className="text-sm font-bold capitalize">{basePlan ?? "Unavailable"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-xs font-bold uppercase text-slate-500">Loyalty price</dt>
            <dd className="text-sm font-bold text-[#4f2df2]">$49/month</dd>
          </div>
        </dl>

        {mode === "add" ? (
          <div className={`mt-5 space-y-3 text-sm font-semibold leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            <p>The charge will be added to your Stripe subscription and may appear on your next invoice depending on the current billing cycle.</p>
            <p>The service remains active until removed.</p>
            <p>Removing Loyalty does not cancel the store&apos;s base Plus or Advanced plan.</p>
          </div>
        ) : (
          <div className={`mt-5 space-y-3 text-sm font-semibold leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            <p>Loyalty data will be preserved after the service is removed.</p>
            <p>Removing Loyalty does not cancel the store&apos;s base Plus or Advanced plan.</p>
          </div>
        )}

        {error ? (
          <p className="mt-5 rounded-[8px] border border-red-500/25 bg-red-500/10 p-3 text-sm font-bold text-red-500">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className={`h-11 rounded-[7px] border px-5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35 disabled:cursor-not-allowed disabled:opacity-60 ${
              isDark ? "border-slate-400/15 bg-transparent text-slate-200 hover:border-[#7c5cff]/60" : "border-[#ded8f3] bg-white text-slate-700 hover:border-[#7c5cff]/60 hover:text-[#4f2df2]"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[7px] bg-[#4f2df2] px-5 text-sm font-bold text-white transition hover:bg-[#4322dd] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProcessing ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {isProcessing ? (mode === "add" ? "Adding..." : "Removing...") : mode === "add" ? "Confirm and Add" : "Confirm and Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ServicesContent({ selectedStore, capabilities, theme }: BackOfficeShellContext) {
  const isDark = theme === "dark";
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [lottery, setLottery] = useState(capabilities.lottery.available);
  const [recipeSuite, setRecipeSuite] = useState(capabilities.recipeSuite.available);
  const [loyalty, setLoyalty] = useState<LoyaltyService | null>(null);
  const [billingSummary, setBillingSummary] = useState<StoreBillingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingFeature, setIsSavingFeature] = useState(false);
  const [isSavingService, setIsSavingService] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [addDialogError, setAddDialogError] = useState("");
  const [removeDialogError, setRemoveDialogError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      setLottery(capabilities.lottery.available);
      setRecipeSuite(capabilities.recipeSuite.available);
    });
  }, [capabilities]);

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      setIsLoading(true);
      setError("");
    });

    Promise.all([getStoreServices(selectedStore.id), getStoreBillingSummary(selectedStore.id)])
      .then(([servicesResponse, billingResponse]) => {
        if (mounted) {
          setLoyalty(servicesResponse.services.loyalty);
          setBillingSummary(billingResponse);
        }
      })
      .catch((servicesError) => {
        if (mounted) {
          setError(servicesError instanceof Error ? servicesError.message : "Could not load services.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [selectedStore.id]);

  async function saveIncludedFeatures(nextLottery = lottery, nextRecipeSuite = recipeSuite) {
    setIsSavingFeature(true);
    setError("");

    try {
      await updateStoreFeatures(selectedStore.id, {
        lottery: nextLottery,
        recipeSuite: nextRecipeSuite,
      });
      window.dispatchEvent(new Event(STORE_CAPABILITIES_UPDATED_EVENT));
    } catch (featureError) {
      setError(featureError instanceof Error ? featureError.message : "Could not update included features.");
    } finally {
      setIsSavingFeature(false);
    }
  }

  function closeAddDialog() {
    setShowAddDialog(false);
    setAddDialogError("");
    queueMicrotask(() => {
      addButtonRef.current?.focus();
    });
  }

  async function refreshServicesAndBilling() {
    const [servicesResponse, billingResponse] = await Promise.all([
      getStoreServices(selectedStore.id),
      getStoreBillingSummary(selectedStore.id),
    ]);
    setLoyalty(servicesResponse.services.loyalty);
    setBillingSummary(billingResponse);
  }

  async function handleConfirmAddLoyalty() {
    if (isSavingService) {
      return;
    }

    setIsSavingService(true);
    setAddDialogError("");
    setSuccessMessage("");

    try {
      const response = await addLoyaltyService(selectedStore.id);
      setLoyalty(response.service);
      await refreshServicesAndBilling();
      window.dispatchEvent(new Event(STORE_CAPABILITIES_UPDATED_EVENT));
      setSuccessMessage("Loyalty has been added to this store.");
      closeAddDialog();
    } catch (serviceError) {
      setAddDialogError(serviceError instanceof Error ? serviceError.message : "Could not add Loyalty.");
    } finally {
      setIsSavingService(false);
    }
  }

  function closeRemoveDialog() {
    setShowRemoveDialog(false);
    setRemoveDialogError("");
  }

  async function handleRemoveLoyalty() {
    setIsSavingService(true);
    setRemoveDialogError("");

    try {
      const response = await removeLoyaltyService(selectedStore.id);
      setLoyalty(response.service);
      await refreshServicesAndBilling();
      window.dispatchEvent(new Event(STORE_CAPABILITIES_UPDATED_EVENT));
      closeRemoveDialog();
    } catch (serviceError) {
      setRemoveDialogError(serviceError instanceof Error ? serviceError.message : "Could not remove Loyalty.");
    } finally {
      setIsSavingService(false);
    }
  }

  return (
    <section className={`rounded-[8px] border p-6 ${isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white"}`}>
      <h1 className="text-2xl font-bold tracking-normal">Services</h1>
      <p className={`mt-2 max-w-[720px] text-sm font-semibold leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        Manage included store features and optional paid services.
      </p>

      {successMessage ? <p className="mt-5 rounded-[8px] border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-500">{successMessage}</p> : null}
      {error ? <p className="mt-5 rounded-[8px] border border-red-500/25 bg-red-500/10 p-3 text-sm font-bold text-red-500">{error}</p> : null}

      <div className="mt-7 grid gap-5">
        <section className={`rounded-[8px] border p-5 ${isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]"}`}>
          <h2 className="text-base font-bold">Included store features</h2>
          <div className="mt-4 grid gap-3">
            <PayDeskSwitch
              label="Lottery"
              helper="Included feature, no monthly add-on charge."
              checked={lottery}
              disabled={isSavingFeature}
              onChange={(checked) => {
                setLottery(checked);
                void saveIncludedFeatures(checked, recipeSuite);
              }}
              className="flex-row-reverse items-center justify-between gap-4"
            />
            <PayDeskSwitch
              label="Recipe Suite"
              helper="Included feature, no monthly add-on charge."
              checked={recipeSuite}
              disabled={isSavingFeature}
              onChange={(checked) => {
                setRecipeSuite(checked);
                void saveIncludedFeatures(lottery, checked);
              }}
              className="flex-row-reverse items-center justify-between gap-4"
            />
          </div>
        </section>

        <section className={`rounded-[8px] border p-5 ${isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]"}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-bold">Loyalty</h2>
              <p className={`mt-2 text-sm font-semibold leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Customer loyalty tools and rewards for this store.
              </p>
              <p className="mt-3 text-sm font-extrabold text-[#4f2df2]">$49 / store / month</p>
              <p className={`mt-1 text-xs font-bold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Status: {isLoading ? "Loading" : statusLabel(loyalty?.status)}
              </p>
            </div>

            {isLoading ? (
              <Loader2 className="size-5 animate-spin text-[#4f2df2]" aria-hidden="true" />
            ) : loyalty?.active ? (
              <button
                type="button"
                onClick={() => {
                  setRemoveDialogError("");
                  setShowRemoveDialog(true);
                }}
                disabled={isSavingService}
                className="inline-flex h-10 items-center gap-2 rounded-[7px] border border-red-500/30 px-4 text-sm font-bold text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Remove service
              </button>
            ) : (
              <button
                ref={addButtonRef}
                type="button"
                onClick={() => {
                  setAddDialogError("");
                  setShowAddDialog(true);
                }}
                disabled={isSavingService}
                className="inline-flex h-10 items-center gap-2 rounded-[7px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingService ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
                Add service
              </button>
            )}
          </div>
        </section>
      </div>

      {showAddDialog ? (
        <LoyaltyConfirmationDialog
          theme={theme}
          storeName={selectedStore.name}
          basePlan={billingSummary?.basePlan}
          isProcessing={isSavingService}
          error={addDialogError}
          onCancel={closeAddDialog}
          onConfirm={handleConfirmAddLoyalty}
        />
      ) : null}
      {showRemoveDialog ? (
        <LoyaltyConfirmationDialog
          theme={theme}
          title="Remove Loyalty Service?"
          description="Loyalty will be removed from this store's Stripe subscription."
          storeName={selectedStore.name}
          basePlan={billingSummary?.basePlan}
          mode="remove"
          isProcessing={isSavingService}
          error={removeDialogError}
          onCancel={closeRemoveDialog}
          onConfirm={handleRemoveLoyalty}
        />
      ) : null}
    </section>
  );
}

export default function ServicesPage() {
  return (
    <BackOfficeShell activeItem="services">
      {(context) => <ServicesContent {...context} />}
    </BackOfficeShell>
  );
}
