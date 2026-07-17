"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Camera, PackagePlus, Search, X } from "lucide-react";
import { BackOfficeShell } from "@/src/components/layout/BackOfficeShell";
import { getSelectedStore } from "@/src/context/StoreContext";
import { ApiClientError } from "@/src/lib/apiClient";
import { validateBarcodeInput } from "@/src/features/products/barcodeValidation";
import { lookupProductByBarcode, type ProductRecord } from "@/src/features/products/api";
import {
  formatMultiPackType,
  getMultiPackProposal,
  listProductMultiPacks,
  submitMultiPackProposal,
  updateMultiPackProposal,
  type MultiPackType,
  type ProductMultiPack,
  type SubmitMultiPackProposalInput,
} from "@/src/features/multi-pack/api";

type FormState = {
  type: MultiPackType;
  unitsPerPack: string;
  caseBarcode: string;
  multiPackRetail: string;
  targetMultiPackId: string;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

const initialForm: FormState = {
  type: "MULTIPACK_DEAL",
  unitsPerPack: "",
  caseBarcode: "",
  multiPackRetail: "",
  targetMultiPackId: "",
};

function currency(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return "-";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount);
}

function resolveUnitCost(product: ProductRecord | null) {
  if (!product) return null;
  if (product.unitCostAfterDiscountAndRebate !== null) return product.unitCostAfterDiscountAndRebate;
  if (product.unitCost !== null) return product.unitCost;
  if (product.caseCost !== null && product.unitsPerCase && product.unitsPerCase > 0) {
    return product.caseCost / product.unitsPerCase;
  }
  return null;
}

function getFriendlyError(error: unknown, fallback: string) {
  console.error("Multi-pack pricing request failed", error);
  if (error instanceof ApiClientError) {
    if (error.status === 0) return "We couldn't connect to PayDesk. Please check your internet connection and try again.";
    if (error.status === 401) return "Your session has expired. Please sign in again.";
    if (error.status === 403) return "You don't have permission to manage multi-pack pricing.";
    if (error.status === 409) return "A pending or active multi-pack already uses those details.";
    if (error.status >= 500) return "Something went wrong while saving multi-pack pricing. Please try again.";
  }
  return fallback;
}

export function MultiPackPricingWorkspace() {
  const barcodeRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanLoopRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [activePacks, setActivePacks] = useState<ProductMultiPack[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [preloadingProposal, setPreloadingProposal] = useState(false);

  const units = /^\d+$/.test(form.unitsPerPack) ? Number(form.unitsPerPack) : 0;
  const retail = /^\d+(\.\d{1,2})?$/.test(form.multiPackRetail) ? Number(form.multiPackRetail) : 0;
  const unitCost = resolveUnitCost(product);
  const aggregateCost = unitCost !== null && units > 0 ? unitCost * units : null;
  const margin = aggregateCost !== null && retail > 0 ? ((retail - aggregateCost) / retail) * 100 : null;
  const isNegativeMargin = margin !== null && margin < 0;

  const loadedProductDetails = useMemo(
    () => [
      ["Product Number", product?.productNumber],
      ["Barcode", product?.barcode],
      ["Department", product?.department?.name ?? "-"],
      ["Category", product?.productCategory?.name ?? "-"],
      ["Unit Retail", currency(product?.unitRetail)],
      ["Unit Cost", unitCost === null ? "-" : currency(unitCost)],
      ["Units per Case", product?.unitsPerCase ?? "-"],
    ],
    [product, unitCost],
  );

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("productId");
    const proposalId = params.get("proposalId");
    const selectedStore = getSelectedStore();

    if (!productId || !proposalId || !selectedStore) return;

    queueMicrotask(() => {
      setPreloadingProposal(true);
      setError("");
      setMessage("");

      getMultiPackProposal(selectedStore.id, proposalId)
        .then(async (proposal) => {
          if (proposal.productId !== productId || proposal.status !== "PENDING") {
            throw new Error("The pending proposal could not be matched to this product.");
          }

          setEditingProposalId(proposal.id);
          setBarcode(proposal.product.barcode);
          setProduct(proposal.product);
          setForm({
            type: proposal.proposedType,
            unitsPerPack: String(proposal.proposedUnitsPerPack),
            caseBarcode: proposal.proposedCaseBarcode ?? "",
            multiPackRetail: proposal.proposedMultiPackRetail,
            targetMultiPackId: proposal.targetMultiPackId ?? "",
          });
          setActivePacks(await listProductMultiPacks(selectedStore.id, proposal.productId));
          setMessage("Editing a pending multi-pack review request.");
        })
        .catch((preloadError) => {
          setError(getFriendlyError(preloadError, "We couldn't load this pending multi-pack request. Please return to review and try again."));
        })
        .finally(() => setPreloadingProposal(false));
    });
  }, []);

  async function handleLookup(storeId: string, rawBarcode = barcode) {
    setError("");
    setMessage("");
    const validation = validateBarcodeInput(rawBarcode);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    setLoading(true);
    try {
      const result = await lookupProductByBarcode(storeId, validation.barcode);
      if (!result.found) {
        setProduct(null);
        setActivePacks([]);
        setError("Item not found. Create the item before adding multi-pack pricing.");
        return;
      }

      setBarcode(validation.barcode);
      setProduct(result.product);
      setForm((current) => ({
        ...current,
        unitsPerPack:
          current.unitsPerPack || (result.product.unitsPerCase && result.product.unitsPerCase > 1
            ? String(result.product.unitsPerCase)
            : ""),
      }));
      setActivePacks(await listProductMultiPacks(storeId, result.product.id));
    } catch (lookupError) {
      setError(getFriendlyError(lookupError, "We couldn't load this item right now. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function openCamera(storeId: string) {
    setCameraError("");
    setCameraOpen(true);

    if (!window.BarcodeDetector) {
      setCameraError("Camera barcode scanning is not supported by this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      setIsScanning(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new window.BarcodeDetector({
        formats: ["upc_a", "upc_e", "ean_8", "ean_13", "code_128"],
      });

      const scan = async () => {
        if (!videoRef.current || !streamRef.current) return;
        const results = await detector.detect(videoRef.current).catch(() => []);
        const rawValue = results[0]?.rawValue;

        if (rawValue) {
          const validation = validateBarcodeInput(rawValue);

          if (validation.ok) {
            setBarcode(validation.barcode);
            closeCamera();
            await handleLookup(storeId, validation.barcode);
            return;
          }
        }

        scanLoopRef.current = window.requestAnimationFrame(scan);
      };

      scanLoopRef.current = window.requestAnimationFrame(scan);
    } catch (cameraFailure) {
      setCameraError(
        cameraFailure instanceof DOMException && cameraFailure.name === "NotAllowedError"
          ? "Camera permission was denied."
          : "Camera is unavailable on this device.",
      );
      stopCamera();
    }
  }

  function stopCamera() {
    if (scanLoopRef.current) {
      window.cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsScanning(false);
  }

  function closeCamera() {
    stopCamera();
    setCameraOpen(false);
    setCameraError("");
  }

  async function handleSubmit(storeId: string) {
    if (!product) return;
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const payload: SubmitMultiPackProposalInput = {
        productId: product.id,
        targetMultiPackId: form.targetMultiPackId || null,
        action: form.targetMultiPackId ? "UPDATE" : "CREATE",
        type: form.type,
        unitsPerPack: form.unitsPerPack,
        caseBarcode: form.type === "CASE_SALE" ? form.caseBarcode : null,
        multiPackRetail: form.multiPackRetail,
      };

      if (editingProposalId) {
        await updateMultiPackProposal(storeId, editingProposalId, payload);
        setMessage("Pending multi-pack review request updated.");
      } else {
        await submitMultiPackProposal(storeId, payload);
        setMessage("Multi-pack pricing submitted for review.");
        setBarcode("");
        setProduct(null);
        setActivePacks([]);
        setForm(initialForm);
        queueMicrotask(() => barcodeRef.current?.focus({ preventScroll: true }));
      }
    } catch (submitError) {
      setError(getFriendlyError(submitError, "The multi-pack proposal could not be submitted. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  function loadActivePack(pack: ProductMultiPack) {
    setForm({
      type: pack.type,
      unitsPerPack: String(pack.unitsPerPack),
      caseBarcode: pack.caseBarcode ?? "",
      multiPackRetail: pack.multiPackRetail,
      targetMultiPackId: pack.id,
    });
  }

  return (
    <BackOfficeShell activeItem="products" requiredPermission="manage_multi_pack_pricing">
      {({ theme, selectedStore }) => {
        const isDark = theme === "dark";
        const panel = isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white";
        const nested = isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]";
        const muted = isDark ? "text-slate-400" : "text-slate-500";
        const input = isDark ? "border-slate-400/15 bg-white/[0.04] text-white" : "border-[#ded8f3] bg-white text-slate-950";

        return (
          <section className="space-y-5">
            <div className={`rounded-[8px] border p-6 ${panel}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-normal">Multi Pack Pricing</h1>
                  <p className={`mt-2 max-w-[760px] text-sm font-semibold leading-6 ${muted}`}>
                    Create alternate pack sizes and quantity-based pricing for products.
                  </p>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-[8px] bg-[#4f2df2] text-white">
                  <PackagePlus className="size-5" aria-hidden="true" />
                </span>
              </div>
            </div>

            {message ? <div className="rounded-[8px] border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">{message}</div> : null}
            {error ? (
              <div className="rounded-[8px] border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-300">
                {error} {error.startsWith("Item not found") ? <Link href="/products/items" className="underline">Go to Items</Link> : null}
              </div>
            ) : null}
            {preloadingProposal ? <div className={`rounded-[8px] border p-4 text-sm font-bold ${nested}`}>Loading pending review request...</div> : null}

            <div className={`rounded-[8px] border p-5 ${panel}`}>
              <h2 className="text-base font-extrabold">Barcode Lookup</h2>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  ref={barcodeRef}
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && void handleLookup(selectedStore.id)}
                  placeholder="Scan, type, or paste barcode"
                  className={`h-11 min-w-0 flex-1 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`}
                />
                <button type="button" onClick={() => void handleLookup(selectedStore.id)} className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-extrabold text-white">
                  <Search className="size-4" aria-hidden="true" />
                  Look Up
                </button>
                <button type="button" onClick={() => void openCamera(selectedStore.id)} className={`inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-extrabold ${input}`}>
                  <Camera className="size-4" aria-hidden="true" />
                  Scan
                </button>
              </div>
              {loading ? <p className={`mt-3 text-sm font-bold ${muted}`}>Loading item...</p> : null}
            </div>

            {product ? (
              <>
                <div className={`rounded-[8px] border p-5 ${panel}`}>
                  <h2 className="text-lg font-extrabold">{product.name}</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {loadedProductDetails.map(([label, value]) => (
                      <div key={label} className={`rounded-[8px] border p-3 ${nested}`}>
                        <p className={`text-[11px] font-extrabold uppercase ${muted}`}>{label}</p>
                        <p className="mt-1 text-sm font-bold">{value ?? "-"}</p>
                      </div>
                    ))}
                  </div>
                  {activePacks.length ? (
                    <div className="mt-5 space-y-2">
                      <h3 className="text-sm font-extrabold">Current active multi-packs</h3>
                      {activePacks.map((pack) => (
                        <button key={pack.id} type="button" onClick={() => loadActivePack(pack)} className={`block w-full rounded-[8px] border p-3 text-left text-sm font-bold ${nested}`}>
                          {formatMultiPackType(pack.type)} / {pack.unitsPerPack} units / {currency(pack.multiPackRetail)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className={`rounded-[8px] border p-5 ${panel}`}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-base font-extrabold">Multi-pack configuration</h2>
                    {editingProposalId ? (
                      <span className="rounded-[4px] bg-[#4f2df2]/15 px-2 py-1 text-xs font-extrabold text-[#7c5cff]">
                        Editing pending review request
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <label className="text-sm font-bold">
                      Number of units in pack
                      <input value={form.unitsPerPack} onChange={(event) => setForm({ ...form, unitsPerPack: event.target.value })} className={`mt-2 h-11 w-full rounded-[8px] border px-3 outline-none ${input}`} />
                    </label>
                    <label className="text-sm font-bold">
                      Multi-Pack Type
                      <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as MultiPackType, caseBarcode: event.target.value === "CASE_SALE" ? form.caseBarcode : "" })} className={`mt-2 h-11 w-full rounded-[8px] border px-3 outline-none ${input}`}>
                        <option value="MULTIPACK_DEAL">Multi Pack Deal</option>
                        <option value="CASE_SALE">Case Sale</option>
                      </select>
                    </label>
                    {form.type === "CASE_SALE" ? (
                      <label className="text-sm font-bold">
                        Case Barcode
                        <input value={form.caseBarcode} onChange={(event) => setForm({ ...form, caseBarcode: event.target.value })} className={`mt-2 h-11 w-full rounded-[8px] border px-3 outline-none ${input}`} />
                      </label>
                    ) : null}
                    <label className="text-sm font-bold">
                      Multi-Pack Retail
                      <input value={form.multiPackRetail} onChange={(event) => setForm({ ...form, multiPackRetail: event.target.value })} className={`mt-2 h-11 w-full rounded-[8px] border px-3 outline-none ${input}`} placeholder="0.00" />
                    </label>
                    <div className={`rounded-[8px] border p-4 ${nested}`}>
                      <p className={`text-xs font-extrabold uppercase ${muted}`}>Aggregate Cost</p>
                      <p className="mt-1 text-xl font-extrabold">{aggregateCost === null ? "-" : currency(aggregateCost)}</p>
                    </div>
                    <div className={`rounded-[8px] border p-4 ${nested}`}>
                      <p className={`text-xs font-extrabold uppercase ${muted}`}>Multi-Pack Margin</p>
                      <p className={`mt-1 text-xl font-extrabold ${isNegativeMargin ? "text-red-300" : ""}`}>{margin === null ? "-" : `${margin.toFixed(2)}%`}</p>
                      {isNegativeMargin ? <p className="mt-2 text-sm font-bold text-red-300">This price produces a negative margin.</p> : null}
                    </div>
                  </div>
                  <button type="button" disabled={submitting} onClick={() => void handleSubmit(selectedStore.id)} className="mt-5 h-11 rounded-[8px] bg-[#4f2df2] px-5 text-sm font-extrabold text-white disabled:opacity-50">
                    {editingProposalId ? "Update Review Request" : "Submit for Review"}
                  </button>
                  {editingProposalId ? (
                    <Link href="/send-to-pos/multi-pack-review" className={`ml-0 mt-3 inline-flex h-11 items-center rounded-[8px] border px-5 text-sm font-extrabold sm:ml-3 sm:mt-0 ${input}`}>
                      Return to Multi Pack Review
                    </Link>
                  ) : null}
                </div>
              </>
            ) : null}
            {cameraOpen ? (
              <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-labelledby="multi-pack-camera-title" onKeyDown={(event) => event.key === "Escape" && closeCamera()}>
                <div className={`w-full max-w-xl rounded-[8px] border p-6 shadow-2xl ${panel}`}>
                  <div className="flex items-center justify-between gap-4">
                    <h2 id="multi-pack-camera-title" className="text-lg font-extrabold">Scan barcode</h2>
                    <button type="button" onClick={closeCamera} className={`grid size-9 place-items-center rounded-[8px] border ${input}`} aria-label="Close camera">
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  <video ref={videoRef} className="mt-4 aspect-video w-full rounded-[8px] bg-black object-cover" muted playsInline />
                  <p className={`mt-3 text-sm font-semibold ${cameraError ? "text-rose-500" : muted}`}>
                    {cameraError || (isScanning ? "Point the camera at a barcode." : "Preparing camera...")}
                  </p>
                </div>
              </div>
            ) : null}
          </section>
        );
      }}
    </BackOfficeShell>
  );
}
