"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, PackageSearch, Search, Save } from "lucide-react";
import { BackOfficeShell } from "@/src/components/layout/BackOfficeShell";
import { getInventoryAdjustmentReasons, type InventoryAdjustmentReason } from "@/src/features/product-setup/api";
import {
  applyInventoryAdjustment,
  getInventoryAdjustmentLogs,
  lookupProductByBarcode,
  type InventoryAdjustmentLog,
  type ProductRecord,
} from "@/src/features/products/api";
import { validateBarcodeInput } from "@/src/features/products/barcodeValidation";
import { ApiClientError } from "@/src/lib/apiClient";

export function InventoryAdjustmentsWorkspace() {
  return (
    <BackOfficeShell activeItem="inventory" requiredPermission="manage_inventory">
      {({ theme, selectedStore, account }) => (
        <InventoryAdjustmentsContent
          theme={theme}
          storeId={selectedStore.id}
          canEdit={account?.role === "owner" || account?.role === "partner" || account?.permissions?.includes("manage_inventory") === true}
        />
      )}
    </BackOfficeShell>
  );
}

function InventoryAdjustmentsContent({
  theme,
  storeId,
  canEdit,
}: {
  theme: "light" | "dark";
  storeId: string;
  canEdit: boolean;
}) {
  const isDark = theme === "dark";
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [barcode, setBarcode] = useState("");
  const [adjustment, setAdjustment] = useState("");
  const [reasonId, setReasonId] = useState("");
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [reasons, setReasons] = useState<InventoryAdjustmentReason[]>([]);
  const [logs, setLogs] = useState<InventoryAdjustmentLog[]>([]);
  const [search, setSearch] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"barcode" | "adjustment" | "reasonId", string>>>({});
  const [pageError, setPageError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const cardClass = isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white";
  const nestedClass = isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]";
  const inputClass = isDark
    ? "border-slate-400/15 bg-white/[0.04] text-[#f4f1ff] placeholder:text-slate-500 disabled:bg-white/[0.02] disabled:text-slate-500"
    : "border-[#ded8f3] bg-white text-slate-950 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const [reasonResponse, logResponse] = await Promise.all([
        getInventoryAdjustmentReasons(storeId),
        getInventoryAdjustmentLogs(storeId),
      ]);
      setReasons(reasonResponse.items.filter((reason) => reason.isActive));
      setLogs(logResponse.items);
    } catch (error) {
      console.error("Failed to load inventory adjustment data", error);
      setLoadError("Inventory adjustment data could not be loaded. Please refresh and try again.");
      setReasons([]);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshData();
    });
  }, [refreshData]);

  const visibleLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return logs;

    return logs.filter((log) => {
      const productName = log.productName ?? log.product?.name ?? "";
      const barcodeValue = log.productBarcode ?? log.product?.barcode ?? "";
      const productNumber = String(log.productNumber ?? log.product?.productNumber ?? "");
      const reason = log.inventoryAdjustmentReason?.name ?? log.reason;

      return (
        productName.toLowerCase().includes(normalizedSearch) ||
        barcodeValue.toLowerCase().includes(normalizedSearch) ||
        productNumber.includes(normalizedSearch) ||
        reason.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [logs, search]);

  async function handleLookup(rawBarcode = barcode) {
    if (isLookingUp) return;
    const validation = validateBarcodeInput(rawBarcode);
    setSuccessMessage("");
    setPageError("");
    setFieldErrors((current) => ({ ...current, barcode: undefined }));

    if (!validation.ok) {
      setProduct(null);
      setFieldErrors((current) => ({ ...current, barcode: validation.message }));
      return;
    }

    setIsLookingUp(true);

    try {
      const result = await lookupProductByBarcode(storeId, validation.barcode);
      setBarcode(validation.barcode);

      if (result.found) {
        setProduct(result.product);
      } else {
        setProduct(null);
        setFieldErrors((current) => ({ ...current, barcode: "No product was found with this barcode." }));
      }
    } catch (error) {
      console.error("Inventory adjustment barcode lookup failed", error);
      setProduct(null);
      setPageError(error instanceof ApiClientError ? error.message : "Barcode lookup failed.");
    } finally {
      setIsLookingUp(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canEdit || isSaving) return;

    const errors: Partial<Record<"barcode" | "adjustment" | "reasonId", string>> = {};
    const parsedAdjustment = Number(adjustment);

    setFieldErrors({});
    setPageError("");
    setSuccessMessage("");

    if (!product) {
      errors.barcode = "Load a valid product before applying an adjustment.";
    }

    if (!/^-?\d+$/.test(adjustment.trim()) || !Number.isInteger(parsedAdjustment)) {
      errors.adjustment = "Adjustment must be a whole number.";
    } else if (parsedAdjustment === 0) {
      errors.adjustment = "Adjustment cannot be zero.";
    }

    if (!reasonId) {
      errors.reasonId = "Select an adjustment reason.";
    }

    if (Object.keys(errors).length || !product) {
      setFieldErrors(errors);
      return;
    }

    setIsSaving(true);

    try {
      const updated = await applyInventoryAdjustment({
        storeId,
        productId: product.id,
        quantityChanged: parsedAdjustment,
        inventoryAdjustmentReasonId: reasonId,
      });
      setProduct(updated);
      setAdjustment("");
      setReasonId("");
      setSuccessMessage(`Inventory adjusted. New quantity is ${updated.currentQuantity}.`);
      const refreshedLogs = await getInventoryAdjustmentLogs(storeId);
      setLogs(refreshedLogs.items);
    } catch (error) {
      console.error("Inventory adjustment failed", error);
      setPageError(error instanceof ApiClientError ? error.message : "Inventory adjustment could not be applied.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[1320px] space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-normal">Inventory Adjustments</h1>
        <p className={`mt-2 max-w-[760px] text-sm font-semibold leading-6 ${mutedClass}`}>
          Record product stock corrections and adjustment history.
        </p>
      </header>

      <div className="space-y-3" aria-live="polite">
        {successMessage ? <Alert tone="success" title={successMessage} /> : null}
        {pageError ? <Alert tone="error" title={pageError} /> : null}
        {loadError ? <Alert tone="error" title={loadError} /> : null}
        {!canEdit ? <Alert tone="warning" title="You do not have permission to manage inventory adjustments." /> : null}
      </div>

      <form onSubmit={handleSubmit} className={`rounded-[8px] border p-6 ${cardClass}`}>
        <div>
          <h2 className="text-lg font-bold tracking-normal">Apply Adjustment</h2>
          <p className={`mt-1.5 text-sm font-semibold leading-6 ${mutedClass}`}>
            Scan a product, enter a positive or negative quantity, and choose the adjustment reason.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_minmax(220px,0.5fr)]">
          <Field label="Barcode" error={fieldErrors.barcode}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                ref={barcodeRef}
                value={barcode}
                onChange={(event) => {
                  setBarcode(event.target.value);
                  setProduct(null);
                  setFieldErrors((current) => ({ ...current, barcode: undefined }));
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleLookup();
                  }
                }}
                disabled={!canEdit || isSaving || isLookingUp}
                placeholder="Scan, type, or paste barcode"
                className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 disabled:cursor-not-allowed ${inputClass}`}
              />
              <button
                type="button"
                onClick={() => void handleLookup()}
                disabled={!canEdit || isSaving || isLookingUp}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35"
              >
                {isLookingUp ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <PackageSearch className="size-4" aria-hidden="true" />}
                Lookup
              </button>
            </div>
          </Field>

          <Field label="Adjustment" error={fieldErrors.adjustment}>
            <input
              value={adjustment}
              onChange={(event) => {
                setAdjustment(event.target.value);
                setFieldErrors((current) => ({ ...current, adjustment: undefined }));
              }}
              disabled={!canEdit || isSaving}
              inputMode="numeric"
              placeholder="-3"
              className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 disabled:cursor-not-allowed ${inputClass}`}
            />
          </Field>

          <Field label="Adjustment Reason" error={fieldErrors.reasonId}>
            <select
              value={reasonId}
              onChange={(event) => {
                setReasonId(event.target.value);
                setFieldErrors((current) => ({ ...current, reasonId: undefined }));
              }}
              disabled={!canEdit || isSaving || !reasons.length}
              className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 disabled:cursor-not-allowed ${inputClass}`}
            >
              <option value="">{reasons.length ? "Select reason" : "No active reasons"}</option>
              {reasons.map((reason) => (
                <option key={reason.id} value={reason.id}>{reason.name}</option>
              ))}
            </select>
          </Field>
        </div>

        {product ? (
          <div className={`mt-5 rounded-[8px] border p-4 ${nestedClass}`}>
            <h3 className="text-sm font-extrabold uppercase tracking-[0.06em] text-slate-500">Loaded Product</h3>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <SummaryItem label="Product" value={product.name} mutedClass={mutedClass} />
              <SummaryItem label="Product #" value={String(product.productNumber)} mutedClass={mutedClass} />
              <SummaryItem label="Barcode" value={product.barcode} mutedClass={mutedClass} />
              <SummaryItem label="Current quantity" value={String(product.currentQuantity)} mutedClass={mutedClass} />
            </dl>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={!canEdit || isSaving || !product || !reasonId || !/^-?\d+$/.test(adjustment.trim()) || Number(adjustment) === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35"
          >
            {isSaving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
            {isSaving ? "Applying..." : "Apply Adjustment"}
          </button>
        </div>
      </form>

      <div className={`rounded-[8px] border p-6 ${cardClass}`}>
        <div>
          <h2 className="text-lg font-bold tracking-normal">Adjustment History</h2>
          <p className={`mt-1 text-sm font-semibold leading-6 ${mutedClass}`}>
            Manual inventory adjustment logs for the selected store.
          </p>
        </div>

        <label className="relative mt-5 block">
          <span className="sr-only">Search inventory adjustments</span>
          <Search className={`pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 ${mutedClass}`} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search product, barcode, product #, or reason"
            className={`h-11 w-full rounded-[8px] border py-2 pl-10 pr-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`}
          />
        </label>

        <div className={`mt-5 overflow-hidden rounded-[8px] border ${nestedClass}`}>
          {isLoading ? (
            <div className="flex min-h-44 items-center justify-center gap-2 text-sm font-bold">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Loading adjustments...
            </div>
          ) : visibleLogs.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-[1040px] text-left text-sm">
                <thead className={isDark ? "bg-white/[0.04] text-slate-400" : "bg-[#f0edff] text-slate-600"}>
                  <tr>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Product</TableHeader>
                    <TableHeader>Barcode</TableHeader>
                    <TableHeader>Previous Qty</TableHeader>
                    <TableHeader>Adjustment</TableHeader>
                    <TableHeader>New Qty</TableHeader>
                    <TableHeader>Reason</TableHeader>
                    <TableHeader>Adjusted By</TableHeader>
                  </tr>
                </thead>
                <tbody>
                  {visibleLogs.map((log) => (
                    <tr key={log.id} className={`border-t ${isDark ? "border-slate-400/10" : "border-[#ded8f3]"}`}>
                      <td className={`px-4 py-3 font-semibold ${mutedClass}`}>{formatDateTime(log.createdAt)}</td>
                      <td className="px-4 py-3 font-bold">
                        <div>{log.productName ?? log.product?.name ?? "Unknown product"}</div>
                        <div className={`mt-1 text-xs font-semibold ${mutedClass}`}>#{log.productNumber ?? log.product?.productNumber ?? "-"}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold">{log.productBarcode ?? log.product?.barcode ?? "-"}</td>
                      <td className="px-4 py-3 font-semibold">{log.quantityBefore}</td>
                      <td className={`px-4 py-3 font-extrabold ${log.quantityChanged > 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {formatAdjustment(log.quantityChanged)}
                      </td>
                      <td className="px-4 py-3 font-semibold">{log.quantityAfter}</td>
                      <td className="px-4 py-3 font-semibold">{log.inventoryAdjustmentReason?.name ?? log.reason}</td>
                      <td className="px-4 py-3 font-semibold">{log.staff?.name ?? log.staff?.email ?? "Unknown"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="min-h-44 p-6">
              <h3 className="text-base font-bold tracking-normal">
                {search.trim() ? "No inventory adjustments match your search." : "No inventory adjustments have been recorded yet."}
              </h3>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <span className="mt-2 block">{children}</span>
      {error ? <span className="mt-2 block text-xs font-bold text-red-500">{error}</span> : null}
    </label>
  );
}

function SummaryItem({ label, value, mutedClass }: { label: string; value: string; mutedClass: string }) {
  return (
    <div>
      <dt className={`text-xs font-extrabold uppercase tracking-[0.06em] ${mutedClass}`}>{label}</dt>
      <dd className="mt-1 text-base font-extrabold">{value}</dd>
    </div>
  );
}

function Alert({ tone, title }: { tone: "success" | "warning" | "error"; title: string }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  const toneClass = {
    success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-600",
    error: "border-red-500/20 bg-red-500/10 text-red-600",
  }[tone];

  return (
    <div className={`flex items-start gap-2 rounded-[8px] border p-3 text-sm font-bold ${toneClass}`} role={tone === "error" ? "alert" : "status"}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {title}
    </div>
  );
}

function TableHeader({ children }: { children: string }) {
  return <th className="px-4 py-3 text-xs font-extrabold uppercase tracking-[0.06em]">{children}</th>;
}

function formatAdjustment(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}
