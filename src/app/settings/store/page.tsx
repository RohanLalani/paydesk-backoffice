"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { BackOfficeShell, type BackOfficeShellContext } from "@/src/components/layout/BackOfficeShell";
import { PayDeskSwitch } from "@/src/components/ui/Switch";
import { STORE_CAPABILITIES_UPDATED_EVENT } from "@/src/features/stores/capabilities";
import { updateStore, updateStoreFeatures } from "@/src/features/stores/api";

function StoreSettingsForm({ selectedStore, capabilities, theme }: BackOfficeShellContext) {
  const isDark = theme === "dark";
  const [name, setName] = useState(selectedStore.name);
  const [address, setAddress] = useState(selectedStore.address ?? "");
  const [lottery, setLottery] = useState(capabilities.lottery.available);
  const [recipeSuite, setRecipeSuite] = useState(capabilities.recipeSuite.available);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      setName(selectedStore.name);
      setAddress(selectedStore.address ?? "");
    });
  }, [selectedStore]);

  useEffect(() => {
    queueMicrotask(() => {
      setLottery(capabilities.lottery.available);
      setRecipeSuite(capabilities.recipeSuite.available);
    });
  }, [capabilities]);

  async function handleSave() {
    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      await updateStore(selectedStore.id, {
        name: name.trim(),
        address: address.trim() || null,
      });
      await updateStoreFeatures(selectedStore.id, {
        lottery,
        recipeSuite,
      });
      window.dispatchEvent(new Event(STORE_CAPABILITIES_UPDATED_EVENT));
      setMessage("Store settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save store settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={`rounded-[8px] border p-6 ${isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white"}`}>
      <h1 className="text-2xl font-bold tracking-normal">General</h1>
      <p className={`mt-2 max-w-[720px] text-sm font-semibold leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        Manage store details and included feature availability.
      </p>

      <div className="mt-7 grid gap-5">
        <label className="grid gap-2 text-sm font-bold">
          Store name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={`h-11 rounded-[8px] border px-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-[#7c5cff]/25 ${isDark ? "border-slate-400/15 bg-[#0b1224]" : "border-[#ded8f3] bg-white"}`}
          />
        </label>

        <label className="grid gap-2 text-sm font-bold">
          Address
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className={`h-11 rounded-[8px] border px-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-[#7c5cff]/25 ${isDark ? "border-slate-400/15 bg-[#0b1224]" : "border-[#ded8f3] bg-white"}`}
          />
        </label>

        <div className="grid gap-3">
          <p className="text-sm font-bold">Included store features</p>
          <PayDeskSwitch
            label="Lottery"
            checked={lottery}
            onChange={setLottery}
            className={`flex-row-reverse items-center justify-between rounded-[8px] border p-4 ${isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]"}`}
          />
          <PayDeskSwitch
            label="Recipe Suite"
            checked={recipeSuite}
            onChange={setRecipeSuite}
            className={`flex-row-reverse items-center justify-between rounded-[8px] border p-4 ${isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]"}`}
          />
        </div>
      </div>

      {message ? <p className="mt-4 text-sm font-bold text-emerald-500">{message}</p> : null}
      {error ? <p className="mt-4 text-sm font-bold text-red-500">{error}</p> : null}

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving || !name.trim()}
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-[7px] bg-[#4f2df2] px-5 text-sm font-bold text-white transition hover:bg-[#4322dd] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
        Save settings
      </button>
    </section>
  );
}

export default function StoreSettingsPage() {
  return (
    <BackOfficeShell activeItem="storeSettings" requiredPermission="edit_store">
      {(context) => <StoreSettingsForm {...context} />}
    </BackOfficeShell>
  );
}
