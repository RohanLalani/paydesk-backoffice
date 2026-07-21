"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  CheckCircle2,
  ClipboardList,
  DollarSign,
  LoaderCircle,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Truck,
} from "lucide-react";
import type { BackOfficeShellContext } from "@/src/components/layout/BackOfficeShell";
import { listStorePayees, type Payee } from "@/src/features/purchases/api";
import { listPriceBookProducts, type PriceBookProduct } from "@/src/features/products/api";
import {
  createProductVendor,
  deleteProductVendor,
  generateVendorOrders,
  listProductVendors,
  listVendorOrders,
  receiveVendorOrder,
  sendVendorOrder,
  updateProductVendor,
  updateVendorOrder,
  type ProductVendor,
  type VendorOrder,
  type VendorOrderStatus,
} from "@/src/features/vendor-orders/api";

type VendorOrdersWorkspaceProps = Pick<BackOfficeShellContext, "selectedStore" | "theme" | "account">;
type WorkspaceTab = "orders" | "vendor-pricing";
type OrderDrafts = Record<string, Record<string, number>>;
type RemovedDrafts = Record<string, Record<string, boolean>>;
type ReceiveDrafts = Record<string, Record<string, number>>;
type OrderStyles = {
  panel: string;
  nested: string;
  input: string;
  muted: string;
  border: string;
  tableHead: string;
};

const ORDER_STATUSES: Array<VendorOrderStatus | "ALL"> = [
  "ALL",
  "DRAFT",
  "READY",
  "SENT",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
];

const EMPTY_VENDOR_FORM = {
  productId: "",
  payeeId: "",
  vendorSku: "",
  unitsPerCase: "1",
  caseCost: "",
  caseDiscount: "0.00",
  minOrderQuantity: "",
  leadTimeDays: "",
  isPreferred: false,
  isActive: true,
};

function money(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number.isFinite(amount) ? amount : 0);
}

function dateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(status: VendorOrderStatus) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function buildOrderDrafts(orders: VendorOrder[]) {
  const next: OrderDrafts = {};

  for (const order of orders) {
    next[order.id] = {};
    for (const item of order.items) {
      next[order.id][item.id] = item.quantityOrdered;
    }
  }

  return next;
}

function buildReceiveDrafts(orders: VendorOrder[]) {
  const next: ReceiveDrafts = {};

  for (const order of orders) {
    next[order.id] = {};
    for (const item of order.items) {
      next[order.id][item.id] = item.quantityReceived;
    }
  }

  return next;
}

export function VendorOrdersWorkspace({ selectedStore, theme }: VendorOrdersWorkspaceProps) {
  const isDark = theme === "dark";
  const styles = useMemo(
    () => ({
      panel: isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white",
      nested: isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]",
      input: isDark
        ? "border-slate-400/15 bg-white/[0.04] text-[#f4f1ff] placeholder:text-slate-500"
        : "border-[#ded8f3] bg-white text-slate-950 placeholder:text-slate-400",
      muted: isDark ? "text-slate-400" : "text-slate-500",
      border: isDark ? "border-slate-400/15" : "border-[#ded8f3]",
      tableHead: isDark ? "bg-white/[0.04] text-slate-300" : "bg-[#f0edff] text-slate-600",
    }),
    [isDark],
  );
  const storeId = selectedStore.id;
  const [tab, setTab] = useState<WorkspaceTab>("orders");
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [productVendors, setProductVendors] = useState<ProductVendor[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [products, setProducts] = useState<PriceBookProduct[]>([]);
  const [orderStatus, setOrderStatus] = useState<VendorOrderStatus | "ALL">("ALL");
  const [orderDrafts, setOrderDrafts] = useState<OrderDrafts>({});
  const [removedDrafts, setRemovedDrafts] = useState<RemovedDrafts>({});
  const [receiveDrafts, setReceiveDrafts] = useState<ReceiveDrafts>({});
  const [vendorSearch, setVendorSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [vendorForm, setVendorForm] = useState(EMPTY_VENDOR_FORM);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [lookbackDays, setLookbackDays] = useState(30);
  const [coverageDays, setCoverageDays] = useState(14);
  const [onlyBelowMin, setOnlyBelowMin] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    const response = await listVendorOrders(storeId, { status: orderStatus });
    setOrders(response.items);
    setOrderDrafts(buildOrderDrafts(response.items));
    setReceiveDrafts(buildReceiveDrafts(response.items));
    setRemovedDrafts({});
  }, [orderStatus, storeId]);

  const loadVendorPricing = useCallback(async () => {
    const [vendorResponse, payeeResponse, productResponse] = await Promise.all([
      listProductVendors(storeId, { search: vendorSearch, active: true, limit: 100 }),
      listStorePayees(storeId, { active: true, limit: 100 }),
      listPriceBookProducts(storeId, { search: productSearch, isActive: true, trackInventory: true, limit: 25 }),
    ]);

    setProductVendors(vendorResponse.items);
    setPayees(payeeResponse.items.filter((payee) => payee.payeeType === "VENDOR"));
    setProducts(productResponse.items);
  }, [productSearch, storeId, vendorSearch]);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      await Promise.all([loadOrders(), loadVendorPricing()]);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [loadOrders, loadVendorPricing]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshAll();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshAll]);

  const handleGenerate = async () => {
    setIsSaving("generate");
    setError("");
    setMessage("");

    try {
      const result = await generateVendorOrders(storeId, { lookbackDays, coverageDays, onlyBelowMin });
      await loadOrders();
      setMessage(`${result.orders.length} draft vendor order${result.orders.length === 1 ? "" : "s"} generated. ${result.skipped.length} product${result.skipped.length === 1 ? "" : "s"} skipped.`);
    } catch (generateError) {
      setError(getErrorMessage(generateError));
    } finally {
      setIsSaving("");
    }
  };

  const handleSaveOrder = async (order: VendorOrder) => {
    setIsSaving(`order-${order.id}`);
    setError("");
    setMessage("");

    try {
      await updateVendorOrder(storeId, order.id, {
        items: order.items.map((item) => ({
          id: item.id,
          quantityOrdered: Number(orderDrafts[order.id]?.[item.id] ?? item.quantityOrdered),
          remove: removedDrafts[order.id]?.[item.id] === true,
        })),
      });
      await loadOrders();
      setMessage("Order quantities were saved.");
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving("");
    }
  };

  const handleStatus = async (order: VendorOrder, status: VendorOrderStatus) => {
    setIsSaving(`${status}-${order.id}`);
    setError("");
    setMessage("");

    try {
      await updateVendorOrder(storeId, order.id, { status });
      await loadOrders();
      setMessage(`Order marked ${statusLabel(status)}.`);
    } catch (statusError) {
      setError(getErrorMessage(statusError));
    } finally {
      setIsSaving("");
    }
  };

  const handleSend = async (order: VendorOrder) => {
    setIsSaving(`send-${order.id}`);
    setError("");
    setMessage("");

    try {
      await sendVendorOrder(storeId, order.id);
      await loadOrders();
      setMessage("Order was marked sent.");
    } catch (sendError) {
      setError(getErrorMessage(sendError));
    } finally {
      setIsSaving("");
    }
  };

  const handleReceive = async (order: VendorOrder) => {
    setIsSaving(`receive-${order.id}`);
    setError("");
    setMessage("");

    try {
      await receiveVendorOrder(storeId, order.id, {
        items: order.items.map((item) => ({
          id: item.id,
          quantityReceived: Number(receiveDrafts[order.id]?.[item.id] ?? item.quantityReceived),
        })),
      });
      await loadOrders();
      setMessage("Received quantities were posted through the purchase workflow.");
    } catch (receiveError) {
      setError(getErrorMessage(receiveError));
    } finally {
      setIsSaving("");
    }
  };

  const resetVendorForm = () => {
    setVendorForm(EMPTY_VENDOR_FORM);
    setEditingVendorId(null);
  };

  const submitVendorForm = async () => {
    setIsSaving("vendor");
    setError("");
    setMessage("");

    try {
      const payload = {
        productId: vendorForm.productId,
        payeeId: vendorForm.payeeId,
        vendorSku: vendorForm.vendorSku.trim() || null,
        unitsPerCase: Number(vendorForm.unitsPerCase),
        caseCost: vendorForm.caseCost,
        caseDiscount: vendorForm.caseDiscount || "0.00",
        minOrderQuantity: vendorForm.minOrderQuantity ? Number(vendorForm.minOrderQuantity) : null,
        leadTimeDays: vendorForm.leadTimeDays ? Number(vendorForm.leadTimeDays) : null,
        isPreferred: vendorForm.isPreferred,
        isActive: vendorForm.isActive,
      };

      if (editingVendorId) {
        await updateProductVendor(storeId, editingVendorId, payload);
        setMessage("Vendor pricing was updated.");
      } else {
        await createProductVendor(storeId, payload);
        setMessage("Vendor pricing was added.");
      }

      resetVendorForm();
      await loadVendorPricing();
    } catch (vendorError) {
      setError(getErrorMessage(vendorError));
    } finally {
      setIsSaving("");
    }
  };

  const editVendor = (item: ProductVendor) => {
    setEditingVendorId(item.id);
    setVendorForm({
      productId: item.productId,
      payeeId: item.payeeId,
      vendorSku: item.vendorSku ?? "",
      unitsPerCase: String(item.unitsPerCase),
      caseCost: item.caseCost,
      caseDiscount: item.caseDiscount,
      minOrderQuantity: item.minOrderQuantity === null ? "" : String(item.minOrderQuantity),
      leadTimeDays: item.leadTimeDays === null ? "" : String(item.leadTimeDays),
      isPreferred: item.isPreferred,
      isActive: item.isActive,
    });
    setTab("vendor-pricing");
  };

  const deactivateVendor = async (item: ProductVendor) => {
    setIsSaving(`vendor-delete-${item.id}`);
    setError("");
    setMessage("");

    try {
      await deleteProductVendor(storeId, item.id);
      await loadVendorPricing();
      setMessage("Vendor pricing was deactivated.");
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setIsSaving("");
    }
  };

  const activeVendorOptions = payees;
  const canSaveVendor = vendorForm.productId && vendorForm.payeeId && Number(vendorForm.unitsPerCase) > 0 && Number(vendorForm.caseCost) >= 0;

  return (
    <div className="space-y-5">
      <section className={`rounded-[8px] border p-5 ${styles.panel}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-[8px] bg-[#4f2df2] text-white">
                <Truck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-2xl font-extrabold tracking-normal">Inventory Orders</h1>
                <p className={`mt-1 text-sm font-semibold ${styles.muted}`}>
                  Generate Advanced-plan replenishment orders from sales velocity, inventory targets, and vendor pricing.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={isLoading}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles.input}`}
          >
            {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh
          </button>
        </div>
      </section>

      <div className={`flex flex-wrap gap-2 rounded-[8px] border p-2 ${styles.panel}`} role="tablist" aria-label="Orders workspace sections">
        {[
          { id: "orders" as const, label: "Orders", icon: ClipboardList },
          { id: "vendor-pricing" as const, label: "Vendor Pricing", icon: DollarSign },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={`inline-flex h-10 items-center gap-2 rounded-[8px] px-3 text-sm font-extrabold transition ${active ? "bg-[#4f2df2] text-white" : `${styles.muted} hover:bg-[#7c5cff]/10`}`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>

      {message ? <div className={`rounded-[8px] border p-3 text-sm font-bold text-emerald-500 ${styles.nested}`}>{message}</div> : null}
      {error ? <div className={`rounded-[8px] border p-3 text-sm font-bold text-red-500 ${styles.nested}`}>{error}</div> : null}

      {tab === "orders" ? (
        <OrdersPanel
          styles={styles}
          orders={orders}
          orderStatus={orderStatus}
          setOrderStatus={setOrderStatus}
          lookbackDays={lookbackDays}
          setLookbackDays={setLookbackDays}
          coverageDays={coverageDays}
          setCoverageDays={setCoverageDays}
          onlyBelowMin={onlyBelowMin}
          setOnlyBelowMin={setOnlyBelowMin}
          isLoading={isLoading}
          isSaving={isSaving}
          orderDrafts={orderDrafts}
          setOrderDrafts={setOrderDrafts}
          removedDrafts={removedDrafts}
          setRemovedDrafts={setRemovedDrafts}
          receiveDrafts={receiveDrafts}
          setReceiveDrafts={setReceiveDrafts}
          onGenerate={handleGenerate}
          onSaveOrder={handleSaveOrder}
          onStatus={handleStatus}
          onSend={handleSend}
          onReceive={handleReceive}
        />
      ) : (
        <VendorPricingPanel
          styles={styles}
          productVendors={productVendors}
          products={products}
          payees={activeVendorOptions}
          vendorSearch={vendorSearch}
          setVendorSearch={setVendorSearch}
          productSearch={productSearch}
          setProductSearch={setProductSearch}
          vendorForm={vendorForm}
          setVendorForm={setVendorForm}
          editingVendorId={editingVendorId}
          canSaveVendor={Boolean(canSaveVendor)}
          isSaving={isSaving}
          onSearch={() => void loadVendorPricing()}
          onSubmit={() => void submitVendorForm()}
          onCancel={resetVendorForm}
          onEdit={editVendor}
          onDelete={(item) => void deactivateVendor(item)}
        />
      )}
    </div>
  );
}

function OrdersPanel({
  styles,
  orders,
  orderStatus,
  setOrderStatus,
  lookbackDays,
  setLookbackDays,
  coverageDays,
  setCoverageDays,
  onlyBelowMin,
  setOnlyBelowMin,
  isLoading,
  isSaving,
  orderDrafts,
  setOrderDrafts,
  removedDrafts,
  setRemovedDrafts,
  receiveDrafts,
  setReceiveDrafts,
  onGenerate,
  onSaveOrder,
  onStatus,
  onSend,
  onReceive,
}: {
  styles: OrderStyles;
  orders: VendorOrder[];
  orderStatus: VendorOrderStatus | "ALL";
  setOrderStatus: (status: VendorOrderStatus | "ALL") => void;
  lookbackDays: number;
  setLookbackDays: (value: number) => void;
  coverageDays: number;
  setCoverageDays: (value: number) => void;
  onlyBelowMin: boolean;
  setOnlyBelowMin: (value: boolean) => void;
  isLoading: boolean;
  isSaving: string;
  orderDrafts: OrderDrafts;
  setOrderDrafts: Dispatch<SetStateAction<OrderDrafts>>;
  removedDrafts: RemovedDrafts;
  setRemovedDrafts: Dispatch<SetStateAction<RemovedDrafts>>;
  receiveDrafts: ReceiveDrafts;
  setReceiveDrafts: Dispatch<SetStateAction<ReceiveDrafts>>;
  onGenerate: () => void;
  onSaveOrder: (order: VendorOrder) => void;
  onStatus: (order: VendorOrder, status: VendorOrderStatus) => void;
  onSend: (order: VendorOrder) => void;
  onReceive: (order: VendorOrder) => void;
}) {
  return (
    <div className="space-y-5">
      <section className={`rounded-[8px] border p-5 ${styles.panel}`}>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          <Field label="Sales lookback" styles={styles}>
            <input type="number" min={1} max={180} value={lookbackDays} onChange={(event) => setLookbackDays(Number(event.target.value))} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none focus:ring-4 focus:ring-[#7c5cff]/20 ${styles.input}`} />
          </Field>
          <Field label="Coverage days" styles={styles}>
            <input type="number" min={1} max={90} value={coverageDays} onChange={(event) => setCoverageDays(Number(event.target.value))} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none focus:ring-4 focus:ring-[#7c5cff]/20 ${styles.input}`} />
          </Field>
          <Field label="Show status" styles={styles}>
            <select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value as VendorOrderStatus | "ALL")} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none focus:ring-4 focus:ring-[#7c5cff]/20 ${styles.input}`}>
              {ORDER_STATUSES.map((status) => <option key={status} value={status}>{status === "ALL" ? "All orders" : statusLabel(status)}</option>)}
            </select>
          </Field>
          <button type="button" onClick={onGenerate} disabled={isSaving === "generate"} className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-extrabold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60">
            {isSaving === "generate" ? <LoaderCircle className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}
            Generate
          </button>
        </div>
        <label className={`mt-3 inline-flex items-center gap-2 rounded-[8px] border px-3 py-2 text-sm font-bold ${styles.nested}`}>
          <input type="checkbox" checked={onlyBelowMin} onChange={(event) => setOnlyBelowMin(event.target.checked)} className="size-4 accent-[#4f2df2]" />
          Only products at or below minimum inventory
        </label>
      </section>

      <section className={`rounded-[8px] border ${styles.panel}`}>
        {isLoading ? (
          <div className="p-6 text-sm font-bold">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-6">
            <h2 className="text-lg font-extrabold">No vendor orders yet</h2>
            <p className={`mt-1 text-sm font-semibold ${styles.muted}`}>Add vendor pricing, then generate suggested replenishment orders.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#ded8f3] dark:divide-slate-400/15">
            {orders.map((order) => {
              const canEdit = order.status === "DRAFT" || order.status === "READY";
              const canReceive = order.status === "SENT" || order.status === "PARTIALLY_RECEIVED";
              return (
                <article key={order.id} className="p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-extrabold">{order.payee.name}</h2>
                        <span className={`rounded-[6px] px-2 py-1 text-xs font-extrabold ${statusClass(order.status)}`}>{statusLabel(order.status)}</span>
                      </div>
                      <p className={`mt-1 text-sm font-semibold ${styles.muted}`}>
                        {order.items.length} item{order.items.length === 1 ? "" : "s"} • Estimated {money(order.estimatedCost)} • Updated {dateTime(order.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canEdit ? <button type="button" onClick={() => onSaveOrder(order)} disabled={isSaving === `order-${order.id}`} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#4f2df2] px-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"><CheckCircle2 className="size-4" />Save</button> : null}
                      {order.status === "DRAFT" ? <button type="button" onClick={() => onStatus(order, "READY")} className={`h-10 rounded-[8px] border px-3 text-sm font-extrabold ${styles.input}`}>Mark Ready</button> : null}
                      {order.status === "READY" ? <button type="button" onClick={() => onStatus(order, "DRAFT")} className={`h-10 rounded-[8px] border px-3 text-sm font-extrabold ${styles.input}`}>Back to Draft</button> : null}
                      {order.status === "DRAFT" || order.status === "READY" ? <button type="button" onClick={() => onSend(order)} disabled={isSaving === `send-${order.id}`} className={`inline-flex h-10 items-center gap-2 rounded-[8px] border px-3 text-sm font-extrabold ${styles.input}`}><Send className="size-4" />Send</button> : null}
                      {canReceive ? <button type="button" onClick={() => onReceive(order)} disabled={isSaving === `receive-${order.id}`} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-emerald-600 px-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"><PackageCheck className="size-4" />Receive</button> : null}
                      {order.status !== "CANCELLED" && order.status !== "RECEIVED" ? <button type="button" onClick={() => onStatus(order, "CANCELLED")} className={`h-10 rounded-[8px] border px-3 text-sm font-extrabold text-red-500 ${styles.input}`}>Cancel</button> : null}
                    </div>
                  </div>

                  <div className={`mt-4 overflow-x-auto rounded-[8px] border ${styles.nested}`}>
                    <table className="min-w-[980px] w-full text-left text-sm">
                      <thead className={styles.tableHead}>
                        <tr>
                          <th className="px-3 py-3 font-extrabold">Product</th>
                          <th className="px-3 py-3 font-extrabold">Barcode</th>
                          <th className="px-3 py-3 text-right font-extrabold">On hand</th>
                          <th className="px-3 py-3 text-right font-extrabold">Ordered</th>
                          <th className="px-3 py-3 text-right font-extrabold">Received</th>
                          <th className="px-3 py-3 text-right font-extrabold">Case Cost</th>
                          <th className="px-3 py-3 text-right font-extrabold">Ext Cost</th>
                          <th className="px-3 py-3 font-extrabold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item) => {
                          const removed = removedDrafts[order.id]?.[item.id] === true;
                          return (
                            <tr key={item.id} className={`border-t ${styles.border} ${removed ? "opacity-50" : ""}`}>
                              <td className="px-3 py-3 font-bold">{item.productNameSnapshot ?? item.product.name}</td>
                              <td className="px-3 py-3 font-semibold">{item.barcodeSnapshot ?? item.product.barcode}</td>
                              <td className="px-3 py-3 text-right font-semibold">{item.product.currentQuantity}</td>
                              <td className="px-3 py-3 text-right">
                                {canEdit ? (
                                  <input type="number" min={1} value={orderDrafts[order.id]?.[item.id] ?? item.quantityOrdered} onChange={(event) => setOrderDrafts((current) => ({ ...current, [order.id]: { ...current[order.id], [item.id]: Number(event.target.value) } }))} className={`ml-auto h-10 w-24 rounded-[8px] border px-2 text-right text-sm font-bold outline-none ${styles.input}`} disabled={removed} />
                                ) : (
                                  <span className="font-semibold">{item.quantityOrdered}</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-right">
                                {canReceive ? (
                                  <input type="number" min={item.quantityReceived} max={item.quantityOrdered} value={receiveDrafts[order.id]?.[item.id] ?? item.quantityReceived} onChange={(event) => setReceiveDrafts((current) => ({ ...current, [order.id]: { ...current[order.id], [item.id]: Number(event.target.value) } }))} className={`ml-auto h-10 w-24 rounded-[8px] border px-2 text-right text-sm font-bold outline-none ${styles.input}`} />
                                ) : (
                                  <span className="font-semibold">{item.quantityReceived}</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-right font-semibold">{money(item.caseCost)}</td>
                              <td className="px-3 py-3 text-right font-semibold">{money(item.extendedCost)}</td>
                              <td className="px-3 py-3">
                                {canEdit ? (
                                  <button type="button" onClick={() => setRemovedDrafts((current) => ({ ...current, [order.id]: { ...current[order.id], [item.id]: !removed } }))} className={`inline-flex h-9 items-center gap-2 rounded-[8px] border px-3 text-xs font-extrabold ${styles.input}`}>
                                    <Trash2 className="size-4" />
                                    {removed ? "Undo" : "Remove"}
                                  </button>
                                ) : (
                                  <span className={styles.muted}>-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function VendorPricingPanel({
  styles,
  productVendors,
  products,
  payees,
  vendorSearch,
  setVendorSearch,
  productSearch,
  setProductSearch,
  vendorForm,
  setVendorForm,
  editingVendorId,
  canSaveVendor,
  isSaving,
  onSearch,
  onSubmit,
  onCancel,
  onEdit,
  onDelete,
}: {
  styles: OrderStyles;
  productVendors: ProductVendor[];
  products: PriceBookProduct[];
  payees: Payee[];
  vendorSearch: string;
  setVendorSearch: (value: string) => void;
  productSearch: string;
  setProductSearch: (value: string) => void;
  vendorForm: typeof EMPTY_VENDOR_FORM;
  setVendorForm: Dispatch<SetStateAction<typeof EMPTY_VENDOR_FORM>>;
  editingVendorId: string | null;
  canSaveVendor: boolean;
  isSaving: string;
  onSearch: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  onEdit: (item: ProductVendor) => void;
  onDelete: (item: ProductVendor) => void;
}) {
  return (
    <div className="space-y-5">
      <section className={`rounded-[8px] border p-5 ${styles.panel}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">Vendor Pricing</h2>
            <p className={`mt-1 text-sm font-semibold ${styles.muted}`}>Link products to vendors so generated orders can choose the cheapest valid supplier.</p>
          </div>
          {editingVendorId ? <button type="button" onClick={onCancel} className={`h-10 rounded-[8px] border px-3 text-sm font-extrabold ${styles.input}`}>New Link</button> : null}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <Field label="Product search" styles={styles}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} onBlur={onSearch} placeholder="Barcode, product number, or name" className={`h-11 w-full rounded-[8px] border py-2 pl-10 pr-3 text-sm font-bold outline-none ${styles.input}`} />
            </div>
          </Field>
          <Field label="Filter vendor pricing" styles={styles}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input value={vendorSearch} onChange={(event) => setVendorSearch(event.target.value)} onBlur={onSearch} placeholder="Product, vendor, SKU, or barcode" className={`h-11 w-full rounded-[8px] border py-2 pl-10 pr-3 text-sm font-bold outline-none ${styles.input}`} />
            </div>
          </Field>
        </div>

        <div className={`mt-4 grid gap-3 rounded-[8px] border p-4 lg:grid-cols-4 ${styles.nested}`}>
          <Field label="Product" styles={styles}>
            <select value={vendorForm.productId} onChange={(event) => setVendorForm((current) => ({ ...current, productId: event.target.value }))} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none ${styles.input}`}>
              <option value="">Select product</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.productNumber} • {product.name}</option>)}
            </select>
          </Field>
          <Field label="Vendor" styles={styles}>
            <select value={vendorForm.payeeId} onChange={(event) => setVendorForm((current) => ({ ...current, payeeId: event.target.value }))} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none ${styles.input}`}>
              <option value="">Select vendor</option>
              {payees.map((payee) => <option key={payee.id} value={payee.id}>{payee.name}</option>)}
            </select>
          </Field>
          <Field label="Vendor SKU" styles={styles}>
            <input value={vendorForm.vendorSku} onChange={(event) => setVendorForm((current) => ({ ...current, vendorSku: event.target.value }))} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none ${styles.input}`} />
          </Field>
          <Field label="Units / case" styles={styles}>
            <input type="number" min={1} value={vendorForm.unitsPerCase} onChange={(event) => setVendorForm((current) => ({ ...current, unitsPerCase: event.target.value }))} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none ${styles.input}`} />
          </Field>
          <Field label="Case cost" styles={styles}>
            <input type="number" min={0} step="0.01" value={vendorForm.caseCost} onChange={(event) => setVendorForm((current) => ({ ...current, caseCost: event.target.value }))} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none ${styles.input}`} />
          </Field>
          <Field label="Case discount" styles={styles}>
            <input type="number" min={0} step="0.01" value={vendorForm.caseDiscount} onChange={(event) => setVendorForm((current) => ({ ...current, caseDiscount: event.target.value }))} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none ${styles.input}`} />
          </Field>
          <Field label="Min order cases" styles={styles}>
            <input type="number" min={1} value={vendorForm.minOrderQuantity} onChange={(event) => setVendorForm((current) => ({ ...current, minOrderQuantity: event.target.value }))} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none ${styles.input}`} />
          </Field>
          <Field label="Lead time days" styles={styles}>
            <input type="number" min={0} value={vendorForm.leadTimeDays} onChange={(event) => setVendorForm((current) => ({ ...current, leadTimeDays: event.target.value }))} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none ${styles.input}`} />
          </Field>
          <label className={`inline-flex h-11 items-center gap-2 rounded-[8px] border px-3 text-sm font-bold ${styles.input}`}>
            <input type="checkbox" checked={vendorForm.isPreferred} onChange={(event) => setVendorForm((current) => ({ ...current, isPreferred: event.target.checked }))} className="size-4 accent-[#4f2df2]" />
            Preferred vendor
          </label>
          <label className={`inline-flex h-11 items-center gap-2 rounded-[8px] border px-3 text-sm font-bold ${styles.input}`}>
            <input type="checkbox" checked={vendorForm.isActive} onChange={(event) => setVendorForm((current) => ({ ...current, isActive: event.target.checked }))} className="size-4 accent-[#4f2df2]" />
            Active
          </label>
          <div className="flex gap-2 lg:col-span-2 lg:justify-end">
            <button type="button" onClick={onCancel} className={`h-11 rounded-[8px] border px-4 text-sm font-extrabold ${styles.input}`}>Reset</button>
            <button type="button" onClick={onSubmit} disabled={!canSaveVendor || isSaving === "vendor"} className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {isSaving === "vendor" ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {editingVendorId ? "Save Pricing" : "Add Pricing"}
            </button>
          </div>
        </div>
      </section>

      <section className={`overflow-hidden rounded-[8px] border ${styles.panel}`}>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className={styles.tableHead}>
              <tr>
                <th className="px-3 py-3 font-extrabold">Product</th>
                <th className="px-3 py-3 font-extrabold">Vendor</th>
                <th className="px-3 py-3 font-extrabold">SKU</th>
                <th className="px-3 py-3 text-right font-extrabold">Units / Case</th>
                <th className="px-3 py-3 text-right font-extrabold">Case Cost</th>
                <th className="px-3 py-3 text-right font-extrabold">Unit Cost</th>
                <th className="px-3 py-3 font-extrabold">Status</th>
                <th className="px-3 py-3 font-extrabold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {productVendors.length === 0 ? (
                <tr><td colSpan={8} className={`px-3 py-8 text-center font-bold ${styles.muted}`}>No vendor pricing links found.</td></tr>
              ) : productVendors.map((item) => {
                const unitCost = (Number(item.caseCost) - Number(item.caseDiscount)) / Math.max(item.unitsPerCase, 1);
                return (
                  <tr key={item.id} className={`border-t ${styles.border}`}>
                    <td className="px-3 py-3 font-bold">{item.product.productNumber} • {item.product.name}</td>
                    <td className="px-3 py-3 font-semibold">{item.payee.name}</td>
                    <td className="px-3 py-3 font-semibold">{item.vendorSku || "-"}</td>
                    <td className="px-3 py-3 text-right font-semibold">{item.unitsPerCase}</td>
                    <td className="px-3 py-3 text-right font-semibold">{money(item.caseCost)}</td>
                    <td className="px-3 py-3 text-right font-semibold">{money(unitCost)}</td>
                    <td className="px-3 py-3"><span className={`rounded-[6px] px-2 py-1 text-xs font-extrabold ${item.isActive ? "bg-emerald-500/15 text-emerald-500" : "bg-slate-500/15 text-slate-500"}`}>{item.isActive ? "Active" : "Inactive"}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => onEdit(item)} className={`h-9 rounded-[8px] border px-3 text-xs font-extrabold ${styles.input}`}>Edit</button>
                        <button type="button" onClick={() => onDelete(item)} disabled={isSaving === `vendor-delete-${item.id}`} className={`inline-flex h-9 items-center gap-2 rounded-[8px] border px-3 text-xs font-extrabold text-red-500 disabled:opacity-60 ${styles.input}`}><Trash2 className="size-4" />Deactivate</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({ label, styles, children }: { label: string; styles: OrderStyles; children: ReactNode }) {
  return (
    <label className="block">
      <span className={`mb-2 block text-xs font-extrabold uppercase tracking-[0.04em] ${styles.muted}`}>{label}</span>
      {children}
    </label>
  );
}

function statusClass(status: VendorOrderStatus) {
  switch (status) {
    case "DRAFT":
      return "bg-slate-500/15 text-slate-500";
    case "READY":
      return "bg-[#4f2df2]/15 text-[#4f2df2]";
    case "SENT":
      return "bg-sky-500/15 text-sky-500";
    case "PARTIALLY_RECEIVED":
      return "bg-amber-500/15 text-amber-500";
    case "RECEIVED":
      return "bg-emerald-500/15 text-emerald-500";
    case "CANCELLED":
      return "bg-red-500/15 text-red-500";
    default:
      return "bg-slate-500/15 text-slate-500";
  }
}
