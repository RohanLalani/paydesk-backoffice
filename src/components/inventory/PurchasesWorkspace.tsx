"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, FilePlus2, RefreshCcw, RotateCcw, Search } from "lucide-react";
import { BackOfficeShell, type BackOfficeShellContext } from "@/src/components/layout/BackOfficeShell";
import {
  getStorePurchase,
  listStorePayees,
  listStorePurchases,
  type Payee,
  type PurchaseDetail,
  type PurchaseListItem,
  type PurchaseSortField,
  type PurchaseStatus,
  type PurchaseType,
} from "@/src/features/purchases/api";

const PAGE_SIZES = [10, 25, 50, 100] as const;
const EMPTY = "\u2014";

type DatePreset = "today" | "yesterday" | "last7" | "last30" | "custom";

type FilterState = {
  search: string;
  payeeId: string;
  type: "" | PurchaseType;
  status: "" | PurchaseStatus;
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
};

type ThemeClasses = {
  isDark: boolean;
  panel: string;
  nested: string;
  border: string;
  muted: string;
  input: string;
  hover: string;
  selected: string;
};

const initialDateRange = resolvePresetRange("last30");
const initialFilters: FilterState = {
  search: "",
  payeeId: "",
  type: "",
  status: "",
  datePreset: "last30",
  dateFrom: initialDateRange.dateFrom,
  dateTo: initialDateRange.dateTo,
};

const purchaseTypeOptions: Array<[PurchaseType, string]> = [
  ["CASH_DAILY", "Cash - Daily"],
  ["CHECK", "Check"],
  ["CREDIT", "Credit"],
];

const purchaseStatusOptions: Array<[PurchaseStatus, string]> = [
  ["DRAFT", "Draft"],
  ["OPEN", "Open"],
  ["VERIFIED", "Verified"],
  ["VOIDED", "Voided"],
];

function resolvePresetRange(preset: DatePreset) {
  const now = new Date();
  const today = toDateInput(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const last7 = new Date(now);
  last7.setDate(last7.getDate() - 6);
  const last30 = new Date(now);
  last30.setDate(last30.getDate() - 29);

  switch (preset) {
    case "today":
      return { dateFrom: today, dateTo: today };
    case "yesterday":
      return { dateFrom: toDateInput(yesterday), dateTo: toDateInput(yesterday) };
    case "last7":
      return { dateFrom: toDateInput(last7), dateTo: today };
    case "custom":
      return { dateFrom: "", dateTo: "" };
    default:
      return { dateFrom: toDateInput(last30), dateTo: today };
  }
}

function toDateInput(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function classesFor(theme: "light" | "dark"): ThemeClasses {
  const isDark = theme === "dark";
  return {
    isDark,
    panel: isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white",
    nested: isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]",
    border: isDark ? "border-slate-400/15" : "border-[#ded8f3]",
    muted: isDark ? "text-slate-400" : "text-slate-500",
    input: isDark
      ? "border-slate-400/15 bg-white/[0.04] text-white placeholder:text-slate-500"
      : "border-[#ded8f3] bg-white text-slate-950 placeholder:text-slate-400",
    hover: isDark ? "hover:bg-white/[0.04]" : "hover:bg-[#fbfaff]",
    selected: isDark ? "bg-[#261b62]/45" : "bg-[#f0edff]",
  };
}

function formatCurrency(value: string | null | undefined) {
  if (!value) return EMPTY;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return EMPTY;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount);
}

function formatPercent(value: string | null | undefined) {
  if (!value) return EMPTY;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return EMPTY;
  return `${amount.toFixed(2)}%`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function typeLabel(value: PurchaseType) {
  return purchaseTypeOptions.find(([type]) => type === value)?.[1] ?? value;
}

function statusLabel(value: PurchaseStatus) {
  return purchaseStatusOptions.find(([status]) => status === value)?.[1] ?? value;
}

function hasFilters(filters: FilterState) {
  return JSON.stringify(filters) !== JSON.stringify(initialFilters);
}

export function PurchasesWorkspace() {
  return (
    <BackOfficeShell activeItem="inventory" requiredPermission="view_purchases">
      {(context) => <PurchasesWorkspaceContent {...context} />}
    </BackOfficeShell>
  );
}

function PurchasesWorkspaceContent({ theme, selectedStore, account }: BackOfficeShellContext) {
  const styles = classesFor(theme);
  const canCreate = account?.role === "owner" || account?.role === "partner" || account?.permissions?.includes("manage_purchases") === true;
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<PurchaseSortField>("purchaseDate");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<(typeof PAGE_SIZES)[number]>(25);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [purchases, setPurchases] = useState<PurchaseListItem[]>([]);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseDetail | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totals, setTotals] = useState({
    costSubtotal: "0.00",
    retailTotal: "0.00",
    totalCost: "0.00",
    marginPercent: null as string | null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detailError, setDetailError] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [filters.search]);

  useEffect(() => {
    queueMicrotask(() => {
      void listStorePayees(selectedStore.id, { active: true, limit: 100 })
        .then((response) => setPayees(response.items))
        .catch(() => setPayees([]));
    });
  }, [selectedStore.id]);

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await listStorePurchases(selectedStore.id, {
        search: debouncedSearch || undefined,
        payeeId: filters.payeeId || undefined,
        type: filters.type || undefined,
        status: filters.status || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        sort,
        order,
        page,
        limit,
      });
      setPurchases(response.items);
      setTotal(response.total);
      setTotalPages(response.totalPages);
      setTotals(response.totals);
      setSelectedPurchaseId((current) => {
        const nextSelectedId =
          current && response.items.some((item) => item.id === current)
            ? current
            : response.items[0]?.id ?? null;

        if (nextSelectedId !== current) {
          setSelectedPurchase(null);
          setDetailError(false);
        }

        return nextSelectedId;
      });
    } catch {
      setError(true);
      setPurchases([]);
      setTotal(0);
      setTotalPages(1);
      setTotals({ costSubtotal: "0.00", retailTotal: "0.00", totalCost: "0.00", marginPercent: null });
      setSelectedPurchaseId(null);
      setSelectedPurchase(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters, limit, order, page, selectedStore.id, sort]);

  useEffect(() => {
    queueMicrotask(() => void loadPurchases());
  }, [loadPurchases]);

  useEffect(() => {
    if (!selectedPurchaseId) {
      return;
    }

    let isMounted = true;

    getStorePurchase(selectedStore.id, selectedPurchaseId)
      .then((purchase) => {
        if (!isMounted) return;
        setSelectedPurchase(purchase);
      })
      .catch(() => {
        if (!isMounted) return;
        setSelectedPurchase(null);
        setDetailError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedPurchaseId, selectedStore.id]);

  const detailLoading = Boolean(selectedPurchaseId) && !selectedPurchase && !detailError;

  function selectPurchase(purchaseId: string) {
    setSelectedPurchaseId(purchaseId);
    setSelectedPurchase(null);
    setDetailError(false);
  }

  function updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    if (key !== "search") {
      setPage(1);
    }
  }

  function applyPreset(preset: DatePreset) {
    const range = resolvePresetRange(preset);
    setFilters((current) => ({
      ...current,
      datePreset: preset,
      dateFrom: preset === "custom" ? current.dateFrom : range.dateFrom,
      dateTo: preset === "custom" ? current.dateTo : range.dateTo,
    }));
    setPage(1);
  }

  function clearFilters() {
    setFilters(initialFilters);
    setDebouncedSearch("");
    setPage(1);
  }

  function toggleSort(nextSort: PurchaseSortField) {
    if (sort === nextSort) {
      setOrder((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSort(nextSort);
      setOrder(nextSort === "purchaseDate" ? "desc" : "asc");
    }
    setPage(1);
  }

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <section className="space-y-5">
      <section className={`rounded-[8px] border p-6 ${styles.panel}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-normal">Purchases</h1>
            <p className={`mt-2 max-w-[760px] text-sm font-semibold leading-6 ${styles.muted}`}>
              Track supplier invoices, purchase costs, expected retail value, and margins.
            </p>
          </div>
          {canCreate ? (
            <Link
              href="/inventory/purchases/new"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35"
            >
              <FilePlus2 className="size-4" aria-hidden="true" />
              Add New Purchase
            </Link>
          ) : null}
        </div>
      </section>

      <section className={`rounded-[8px] border p-5 ${styles.panel}`} aria-label="Purchase filters">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <label className="text-sm font-bold xl:col-span-2">
            Search
            <span className="relative mt-2 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                className={`h-11 w-full rounded-[8px] border py-2 pl-10 pr-3 text-sm font-bold outline-none transition focus:ring-4 focus:ring-[#7c5cff]/20 ${styles.input}`}
                placeholder="Invoice, payee, purchase #, notes"
              />
            </span>
          </label>
          <Select
            label="Payee"
            value={filters.payeeId}
            onChange={(value) => updateFilter("payeeId", value)}
            options={[["", "All Payees"], ...payees.map((payee) => [payee.id, payee.name] as [string, string])]}
            styles={styles}
          />
          <Select
            label="Purchase Type"
            value={filters.type}
            onChange={(value) => updateFilter("type", value as FilterState["type"])}
            options={[["", "All Types"], ...purchaseTypeOptions]}
            styles={styles}
          />
          <Select
            label="Status"
            value={filters.status}
            onChange={(value) => updateFilter("status", value as FilterState["status"])}
            options={[["", "All Statuses"], ...purchaseStatusOptions]}
            styles={styles}
          />
          <div className="flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters(filters)}
              className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles.input}`}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Clear Filters
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Select
            label="Date Range"
            value={filters.datePreset}
            onChange={(value) => applyPreset(value as DatePreset)}
            options={[
              ["today", "Today"],
              ["yesterday", "Yesterday"],
              ["last7", "Last 7 Days"],
              ["last30", "Last 30 Days"],
              ["custom", "Custom Range"],
            ]}
            styles={styles}
          />
          <label className="text-sm font-bold">
            From
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => {
                updateFilter("dateFrom", event.target.value);
                updateFilter("datePreset", "custom");
              }}
              className={`mt-2 h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:ring-4 focus:ring-[#7c5cff]/20 ${styles.input}`}
            />
          </label>
          <label className="text-sm font-bold">
            To
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => {
                updateFilter("dateTo", event.target.value);
                updateFilter("datePreset", "custom");
              }}
              className={`mt-2 h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:ring-4 focus:ring-[#7c5cff]/20 ${styles.input}`}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void loadPurchases()}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd]"
            >
              <RefreshCcw className="size-4" aria-hidden="true" />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className={`overflow-hidden rounded-[8px] border ${styles.panel}`}>
        {error ? (
          <div className="p-8">
            <h2 className="text-xl font-extrabold">Unable to load purchases</h2>
            <p className={`mt-2 text-sm font-semibold ${styles.muted}`}>
              We couldn&apos;t load purchases right now. Please try again.
            </p>
            <button
              type="button"
              onClick={() => void loadPurchases()}
              className="mt-5 h-11 rounded-[8px] bg-[#4f2df2] px-5 text-sm font-extrabold text-white"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead>
                <tr className={`border-b text-xs font-extrabold uppercase ${styles.border} ${styles.muted}`}>
                  <SortableHeader label="Date" sortKey="purchaseDate" activeSort={sort} order={order} onToggle={toggleSort} />
                  <SortableHeader label="Payee" sortKey="payee" activeSort={sort} order={order} onToggle={toggleSort} />
                  <SortableHeader label="Invoice Number" sortKey="invoiceNumber" activeSort={sort} order={order} onToggle={toggleSort} />
                  <SortableHeader label="Type" sortKey="type" activeSort={sort} order={order} onToggle={toggleSort} />
                  <SortableHeader label="Cost" sortKey="costSubtotal" activeSort={sort} order={order} onToggle={toggleSort} align="right" />
                  <SortableHeader label="Retail" sortKey="retailTotal" activeSort={sort} order={order} onToggle={toggleSort} align="right" />
                  <SortableHeader label="Total" sortKey="totalCost" activeSort={sort} order={order} onToggle={toggleSort} align="right" />
                  <SortableHeader label="Margin" sortKey="margin" activeSort={sort} order={order} onToggle={toggleSort} align="right" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <tr key={index} className={`border-b ${styles.border}`}>
                      {Array.from({ length: 8 }).map((__, column) => (
                        <td key={column} className="px-4 py-3">
                          <span className="block h-4 w-24 rounded-[4px] bg-slate-400/20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : purchases.map((purchase) => {
                  const selected = purchase.id === selectedPurchaseId;
                  return (
                    <tr
                      key={purchase.id}
                      tabIndex={0}
                      aria-selected={selected}
                      onClick={() => selectPurchase(purchase.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectPurchase(purchase.id);
                        }
                      }}
                      className={`cursor-pointer border-b outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7c5cff] ${styles.border} ${styles.hover} ${selected ? styles.selected : ""}`}
                    >
                      <td className="px-4 py-3 font-semibold">{formatDate(purchase.purchaseDate)}</td>
                      <td className="px-4 py-3 font-semibold">{purchase.payee.name}</td>
                      <td className="px-4 py-3 font-semibold">{purchase.invoiceNumber}</td>
                      <td className="px-4 py-3 font-semibold">{typeLabel(purchase.type)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(purchase.costSubtotal)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(purchase.retailTotal)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(purchase.totalCost)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatPercent(purchase.marginPercent)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {!loading && purchases.length ? (
                <tfoot>
                  <tr className={`border-t ${styles.border}`}>
                    <td className="px-4 py-3 text-sm font-extrabold" colSpan={4}>Filtered Totals</td>
                    <td className="px-4 py-3 text-right text-sm font-extrabold">{formatCurrency(totals.costSubtotal)}</td>
                    <td className="px-4 py-3 text-right text-sm font-extrabold">{formatCurrency(totals.retailTotal)}</td>
                    <td className="px-4 py-3 text-right text-sm font-extrabold">{formatCurrency(totals.totalCost)}</td>
                    <td className="px-4 py-3 text-right text-sm font-extrabold">{formatPercent(totals.marginPercent)}</td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
            {!loading && !purchases.length ? (
              <div className="p-8">
                <h2 className="text-xl font-extrabold">{hasFilters(filters) ? "No purchases match these filters" : "No purchases yet"}</h2>
                <p className={`mt-2 text-sm font-semibold ${styles.muted}`}>
                  {hasFilters(filters)
                    ? "Try changing or clearing your filters."
                    : "Add a purchase to begin tracking supplier invoices."}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <nav className={`flex flex-col gap-3 rounded-[8px] border p-4 sm:flex-row sm:items-center sm:justify-between ${styles.panel}`} aria-label="Purchases pagination">
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className={`h-10 rounded-[8px] border px-4 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-50 ${styles.input}`}>Previous</button>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className={`h-10 rounded-[8px] border px-4 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-50 ${styles.input}`}>Next</button>
        </div>
        <p className="text-sm font-bold">{start}-{end} of {total} purchases</p>
        <p className="text-sm font-bold">Page {page} of {totalPages}</p>
        <label className="text-sm font-bold">
          Rows per page
          <select value={limit} onChange={(event) => { setLimit(Number(event.target.value) as (typeof PAGE_SIZES)[number]); setPage(1); }} className={`ml-3 h-10 rounded-[8px] border px-3 text-sm font-bold outline-none ${styles.input}`}>
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </nav>

      <section className={`rounded-[8px] border p-5 ${styles.panel}`}>
        {!selectedPurchaseId ? (
          <div>
            <h2 className="text-xl font-extrabold">Select a purchase</h2>
            <p className={`mt-2 text-sm font-semibold ${styles.muted}`}>Choose a purchase from the table to view its details.</p>
          </div>
        ) : detailLoading ? (
          <div className="space-y-3">
            <div className="h-6 w-64 rounded-[4px] bg-slate-400/20" />
            <div className="h-4 w-48 rounded-[4px] bg-slate-400/20" />
            <div className="grid gap-3 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-16 rounded-[8px] bg-slate-400/20" />)}
            </div>
          </div>
        ) : detailError || !selectedPurchase ? (
          <div>
            <h2 className="text-xl font-extrabold">Unable to load purchase details</h2>
            <p className={`mt-2 text-sm font-semibold ${styles.muted}`}>We couldn&apos;t load this purchase right now. Please try again.</p>
          </div>
        ) : (
          <PurchaseDetailsCard purchase={selectedPurchase} styles={styles} />
        )}
      </section>
    </section>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeSort,
  order,
  onToggle,
  align = "left",
}: {
  label: string;
  sortKey: PurchaseSortField;
  activeSort: PurchaseSortField;
  order: "asc" | "desc";
  onToggle: (sort: PurchaseSortField) => void;
  align?: "left" | "right";
}) {
  return (
    <th aria-sort={activeSort === sortKey ? (order === "asc" ? "ascending" : "descending") : "none"} className={`px-4 py-3 ${align === "right" ? "text-right" : ""}`}>
      <button type="button" onClick={() => onToggle(sortKey)} className={`inline-flex items-center gap-2 rounded-[4px] ${align === "right" ? "ml-auto" : ""} focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/25`}>
        {label}
        {activeSort === sortKey ? (order === "asc" ? <ArrowUp className="size-3" aria-hidden="true" /> : <ArrowDown className="size-3" aria-hidden="true" />) : null}
      </button>
    </th>
  );
}

function Select({
  label,
  value,
  options,
  styles,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  styles: ThemeClasses;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`mt-2 h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:ring-4 focus:ring-[#7c5cff]/20 ${styles.input}`}>
        {options.map(([optionValue, optionLabel]) => <option key={`${label}-${optionValue}`} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function SummaryMetric({ label, value, styles }: { label: string; value: string; styles: ThemeClasses }) {
  return (
    <div className={`rounded-[8px] border p-4 ${styles.nested}`}>
      <p className={`text-xs font-extrabold uppercase ${styles.muted}`}>{label}</p>
      <p className="mt-2 text-lg font-extrabold">{value}</p>
    </div>
  );
}

function PurchaseDetailsCard({ purchase, styles }: { purchase: PurchaseDetail; styles: ThemeClasses }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-normal">{purchase.payee.name}</h2>
          <p className={`mt-2 text-sm font-semibold ${styles.muted}`}>
            Invoice {purchase.invoiceNumber} • {formatDate(purchase.purchaseDate)} • {typeLabel(purchase.type)}
          </p>
        </div>
        <span className={`inline-flex rounded-[6px] px-3 py-1 text-sm font-extrabold ${styles.nested}`}>{statusLabel(purchase.status)}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryMetric label="Cost Subtotal" value={formatCurrency(purchase.costSubtotal)} styles={styles} />
        <SummaryMetric label="Expected Retail" value={formatCurrency(purchase.retailTotal)} styles={styles} />
        <SummaryMetric label="Total Cost" value={formatCurrency(purchase.totalCost)} styles={styles} />
        <SummaryMetric label="Margin" value={formatPercent(purchase.marginPercent)} styles={styles} />
        <SummaryMetric label="Purchase Lines" value={String(purchase.lineCount)} styles={styles} />
        <SummaryMetric label="Total Units" value={String(purchase.totalUnits)} styles={styles} />
      </div>

      <div className={`rounded-[8px] border p-4 ${styles.nested}`}>
        <h3 className="text-base font-extrabold">Details</h3>
        <dl className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DetailField label="Reference Number" value={purchase.referenceNumber ?? EMPTY} />
          <DetailField label="Freight" value={formatCurrency(purchase.freightAmount)} />
          <DetailField label="Fees" value={formatCurrency(purchase.feeAmount)} />
          <DetailField label="Tax" value={formatCurrency(purchase.taxAmount)} />
          <DetailField label="Discount" value={formatCurrency(purchase.discountAmount)} />
          <DetailField label="Rebate" value={formatCurrency(purchase.rebateAmount)} />
          <DetailField label="Created By" value={purchase.createdBy?.name || purchase.createdBy?.email || EMPTY} />
          <DetailField label="Created At" value={formatDate(purchase.createdAt)} />
          <DetailField label="Updated At" value={formatDate(purchase.updatedAt)} />
          <div className="md:col-span-2 xl:col-span-3">
            <dt className="text-xs font-extrabold uppercase text-slate-500">Notes</dt>
            <dd className="mt-1 text-sm font-semibold">{purchase.notes || EMPTY}</dd>
          </div>
        </dl>
      </div>

      <div className={`overflow-hidden rounded-[8px] border ${styles.nested}`}>
        <div className={`border-b px-4 py-3 ${styles.border}`}>
          <h3 className="text-base font-extrabold">Purchase Items</h3>
        </div>
        {purchase.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead>
                <tr className={`border-b text-xs font-extrabold uppercase ${styles.border} ${styles.muted}`}>
                  <th className="px-4 py-3">Product Number</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Unit Cost</th>
                  <th className="px-4 py-3 text-right">Extended Cost</th>
                  <th className="px-4 py-3 text-right">Unit Retail Snapshot</th>
                  <th className="px-4 py-3 text-right">Extended Retail</th>
                </tr>
              </thead>
              <tbody>
                {purchase.items.map((item) => (
                  <tr key={item.id} className={`border-b ${styles.border}`}>
                    <td className="px-4 py-3 font-semibold">{item.productNumberSnapshot ?? item.product.productNumber}</td>
                    <td className="px-4 py-3 font-semibold">{item.barcodeSnapshot ?? item.product.barcode}</td>
                    <td className="px-4 py-3 font-semibold">{item.productNameSnapshot ?? item.product.name}</td>
                    <td className="px-4 py-3 text-right font-semibold">{item.quantity}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.unitCost)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.extendedCost)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.unitRetailSnapshot)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.extendedRetail)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <p className={`text-sm font-semibold ${styles.muted}`}>No purchase lines have been recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-extrabold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
    </div>
  );
}
