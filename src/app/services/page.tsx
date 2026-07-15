"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { BackOfficeShell, type BackOfficeShellContext } from "@/src/components/layout/BackOfficeShell";
import { addLoyaltyService, getStoreServices, removeLoyaltyService, type LoyaltyService } from "@/src/features/billing/api";
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

function ServicesContent({ selectedStore, capabilities, theme }: BackOfficeShellContext) {
  const isDark = theme === "dark";
  const [lottery, setLottery] = useState(capabilities.lottery.available);
  const [recipeSuite, setRecipeSuite] = useState(capabilities.recipeSuite.available);
  const [loyalty, setLoyalty] = useState<LoyaltyService | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingFeature, setIsSavingFeature] = useState(false);
  const [isSavingService, setIsSavingService] = useState(false);
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

    getStoreServices(selectedStore.id)
      .then((response) => {
        if (mounted) {
          setLoyalty(response.services.loyalty);
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

  async function handleAddLoyalty() {
    setIsSavingService(true);
    setError("");

    try {
      const response = await addLoyaltyService(selectedStore.id);
      setLoyalty(response.service);
      window.dispatchEvent(new Event(STORE_CAPABILITIES_UPDATED_EVENT));
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : "Could not add Loyalty.");
    } finally {
      setIsSavingService(false);
    }
  }

  async function handleRemoveLoyalty() {
    if (!window.confirm("Remove Loyalty from this store subscription? Loyalty data will be preserved.")) {
      return;
    }

    setIsSavingService(true);
    setError("");

    try {
      const response = await removeLoyaltyService(selectedStore.id);
      setLoyalty(response.service);
      window.dispatchEvent(new Event(STORE_CAPABILITIES_UPDATED_EVENT));
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : "Could not remove Loyalty.");
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

      {error ? <p className="mt-5 rounded-[8px] border border-red-500/25 bg-red-500/10 p-3 text-sm font-bold text-red-500">{error}</p> : null}

      <div className="mt-7 grid gap-5">
        <section className={`rounded-[8px] border p-5 ${isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]"}`}>
          <h2 className="text-base font-bold">Included store features</h2>
          <div className="mt-4 grid gap-3">
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-bold">Lottery</span>
                <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Included feature, no monthly add-on charge.</span>
              </span>
              <input
                type="checkbox"
                checked={lottery}
                disabled={isSavingFeature}
                onChange={(event) => {
                  setLottery(event.target.checked);
                  void saveIncludedFeatures(event.target.checked, recipeSuite);
                }}
                className="size-4 accent-[#4f2df2]"
              />
            </label>
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-bold">Recipe Suite</span>
                <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Included feature, no monthly add-on charge.</span>
              </span>
              <input
                type="checkbox"
                checked={recipeSuite}
                disabled={isSavingFeature}
                onChange={(event) => {
                  setRecipeSuite(event.target.checked);
                  void saveIncludedFeatures(lottery, event.target.checked);
                }}
                className="size-4 accent-[#4f2df2]"
              />
            </label>
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
                onClick={handleRemoveLoyalty}
                disabled={isSavingService}
                className="inline-flex h-10 items-center gap-2 rounded-[7px] border border-red-500/30 px-4 text-sm font-bold text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Remove service
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAddLoyalty}
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
