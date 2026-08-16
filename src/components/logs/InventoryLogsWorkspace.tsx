"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCcw, Search, X } from "lucide-react";
import { BackOfficeShell, type BackOfficeShellContext } from "@/src/components/layout/BackOfficeShell";
import {
  formatInventoryActionLabel,
  inventoryActionTypes,
  listInventoryLogs,
  type InventoryActionType,
  type InventoryLogRow,
} from "@/src/features/logs/api";

const PAGE_LIMITS = [25, 50, 100] as const;
type DateRangeFilter = "all" | "today" | "7d" | "30d" | "custom";

function InventoryLogsContent({ theme, selectedStore }: BackOfficeShellContext) {
  const [rows, setRows] = useState<InventoryLogRow[]>([]);
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState<InventoryActionType | "">("");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<(typeof PAGE_LIMITS)[number]>(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");

  const isDark = theme === "dark";
  const panel = isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const input = isDark ? "border-slate-400/15 bg-white/[0.04] text-white" : "border-[#ded8f3] bg-white text-slate-950";
  const control = isDark
    ? "border-slate-400/15 bg-white/[0.04] text-slate-200 hover:border-[#7c5cff]/60 disabled:text-slate-600"
    : "border-[#ded8f3] bg-white text-slate-700 hover:border-[#7c5cff]/60 disabled:text-slate-300";

  const dateWindow = useMemo(() => getDateWindow(dateRange, fromDate, toDate), [dateRange, fromDate, toDate]);
  const filtersActive = Boolean(search.trim() || actionType || dateRange !== "all" || fromDate || toDate);

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await listInventoryLogs(selectedStore.id, {
        page,
        limit,
        search,
        actionType,
        from: dateWindow.from,
        to: dateWindow.to,
      });
      setRows(response.items);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (loadError) {
      console.error("Failed to load inventory logs", loadError);
      setError("Inventory logs could not be loaded. Please try again.");
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setHasLoaded(true);
      setIsLoading(false);
    }
  }, [actionType, dateWindow.from, dateWindow.to, limit, page, search, selectedStore.id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRows();
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [loadRows]);

  const clearFilters = () => {
    setSearch("");
    setActionType("");
    setDateRange("all");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const emptyText = filtersActive
    ? "No inventory logs match the selected filters."
    : "No inventory activity has been recorded yet.";

  return (
    <section className="space-y-5">
      <div className={`rounded-[8px] border p-5 ${panel}`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-normal">Inventory Logs</h1>
            <p className={`mt-2 max-w-[760px] text-sm font-semibold leading-6 ${muted}`}>
              Review inventory events, stock changes, and receiving activity.
            </p>
          </div>
          <button type="button" className={`inline-flex h-11 items-center gap-2 rounded-[8px] border px-4 text-sm font-extrabold transition ${control}`} onClick={() => void loadRows()}>
            <RefreshCcw className="size-4" aria-hidden="true" />
            Refresh
          </button>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(260px,1fr)_180px_180px_auto]">
          <label className="relative block">
            <span className="sr-only">Search inventory logs</span>
            <Search className={`pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 ${muted}`} aria-hidden="true" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search inventory logs..." className={`h-11 w-full rounded-[8px] border py-2 pl-10 pr-3 text-sm font-semibold outline-none ${input}`} />
          </label>
          <select value={actionType} onChange={(event) => { setActionType(event.target.value as InventoryActionType | ""); setPage(1); }} className={`h-11 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`} aria-label="Event type">
            <option value="">All events</option>
            {inventoryActionTypes.map((value) => (
              <option key={value} value={value}>{formatInventoryActionLabel(value)}</option>
            ))}
          </select>
          <select value={dateRange} onChange={(event) => { setDateRange(event.target.value as DateRangeFilter); setPage(1); }} className={`h-11 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`} aria-label="Date range">
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="custom">Custom range</option>
          </select>
          {filtersActive ? (
            <button type="button" onClick={clearFilters} className={`inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-extrabold transition ${control}`}>
              <X className="size-4" aria-hidden="true" />
              Clear filters
            </button>
          ) : null}
        </div>

        {dateRange === "custom" ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={`mb-1.5 block text-xs font-extrabold uppercase tracking-[0.06em] ${muted}`}>From</span>
              <input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`} />
            </label>
            <label className="block">
              <span className={`mb-1.5 block text-xs font-extrabold uppercase tracking-[0.06em] ${muted}`}>To</span>
              <input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`} />
            </label>
          </div>
        ) : null}
      </div>

      {error ? <div className={`rounded-[8px] border p-4 text-sm font-bold ${isDark ? "border-red-400/25 bg-red-500/10 text-red-100" : "border-red-200 bg-red-50 text-red-700"}`}>{error}</div> : null}

      <div className={`overflow-hidden rounded-[8px] border ${panel}`}>
        <div className="overflow-x-auto">
          <table className="min-w-[1320px] w-full text-left text-sm">
            <thead className={`border-b text-xs uppercase ${isDark ? "border-slate-400/15 text-slate-400" : "border-[#ded8f3] bg-[#fbfaff] text-slate-500"}`}>
              <tr>
                <TableHeader>Date</TableHeader>
                <TableHeader>Product</TableHeader>
                <TableHeader>Product #</TableHeader>
                <TableHeader>Barcode</TableHeader>
                <TableHeader>Event</TableHeader>
                <TableHeader>Previous Qty</TableHeader>
                <TableHeader>Change</TableHeader>
                <TableHeader>New Qty</TableHeader>
                <TableHeader>Reason</TableHeader>
                <TableHeader>Reference</TableHeader>
                <TableHeader>Performed By</TableHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-400/10">
              {rows.map((row) => (
                <tr key={row.id} className={isDark ? "hover:bg-white/[0.04]" : "hover:bg-[#fbfaff]"}>
                  <td className="px-4 py-3 font-semibold">{formatTimestamp(row.createdAt)}</td>
                  <td className="max-w-[220px] px-4 py-3 font-bold"><span className="block truncate">{productName(row)}</span></td>
                  <td className="px-4 py-3 font-bold">{row.productNumber ?? row.product?.productNumber ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold">{row.productBarcode ?? row.product?.barcode ?? "—"}</td>
                  <td className="px-4 py-3"><EventBadge actionType={row.actionType} /></td>
                  <td className="px-4 py-3 font-semibold">{row.quantityBefore}</td>
                  <td className={`px-4 py-3 font-extrabold ${row.quantityChanged > 0 ? "text-emerald-500" : row.quantityChanged < 0 ? "text-red-500" : ""}`}>{formatChange(row.quantityChanged)}</td>
                  <td className="px-4 py-3 font-semibold">{row.quantityAfter}</td>
                  <td className="max-w-[220px] px-4 py-3 font-semibold"><span className="block truncate">{reasonLabel(row)}</span></td>
                  <td className="max-w-[180px] px-4 py-3 font-semibold"><span className="block truncate">{referenceLabel(row)}</span></td>
                  <td className="px-4 py-3 font-semibold">{actorLabel(row)}</td>
                </tr>
              ))}
              {isLoading ? (
                <tr><td colSpan={11} className={`px-4 py-10 text-center text-sm font-bold ${muted}`}>Loading inventory logs...</td></tr>
              ) : null}
              {!isLoading && hasLoaded && rows.length === 0 ? (
                <tr><td colSpan={11} className={`px-4 py-10 text-center text-sm font-bold ${muted}`}>{emptyText}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className={`flex flex-col gap-3 border-t px-4 py-3 text-sm font-bold sm:flex-row sm:items-center sm:justify-between ${isDark ? "border-slate-400/15" : "border-[#ded8f3]"}`}>
          <span className={muted}>Page {page} of {totalPages} / {total} rows</span>
          <div className="flex flex-wrap items-center gap-2">
            <select value={limit} onChange={(event) => { setLimit(Number(event.target.value) as (typeof PAGE_LIMITS)[number]); setPage(1); }} className={`h-10 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`} aria-label="Rows per page">
              {PAGE_LIMITS.map((value) => <option key={value} value={value}>{value} rows</option>)}
            </select>
            <button type="button" className={`h-10 rounded-[8px] border px-3 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${control}`} disabled={page <= 1 || isLoading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
            <button type="button" className={`h-10 rounded-[8px] border px-3 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${control}`} disabled={page >= totalPages || isLoading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function TableHeader({ children }: { children: string }) {
  return <th className="px-4 py-3">{children}</th>;
}

function EventBadge({ actionType }: { actionType: InventoryActionType }) {
  return (
    <span className="inline-flex rounded-[8px] bg-[#4f2df2]/10 px-2 py-1 text-xs font-extrabold text-[#4f2df2]">
      {formatInventoryActionLabel(actionType)}
    </span>
  );
}

function productName(row: InventoryLogRow) {
  return row.productName ?? row.product?.name ?? "Unknown product";
}

function reasonLabel(row: InventoryLogRow) {
  return row.inventoryAdjustmentReason?.name ?? row.reason ?? "—";
}

function actorLabel(row: InventoryLogRow) {
  return row.staff?.name || row.staff?.email || "System";
}

function referenceLabel(row: InventoryLogRow) {
  if (row.referenceType === "adjustment") return "Manual Adjustment";
  if (!row.referenceType && !row.referenceId) return "—";

  const type = row.referenceType ? formatInventoryActionLabel(row.referenceType) : "Reference";
  const id = row.referenceId;

  if (!id) return type;
  if (/^\d+$/.test(id)) return `${type} #${id}`;

  return `${type} ${id.slice(0, 8)}`;
}

function formatChange(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getDateWindow(range: DateRangeFilter, fromDate: string, toDate: string) {
  if (range === "all") return {};
  if (range === "custom") {
    return {
      from: fromDate ? startOfLocalDay(fromDate).toISOString() : undefined,
      to: toDate ? endOfLocalDay(toDate).toISOString() : undefined,
    };
  }

  const end = endOfToday();
  const start = startOfToday();

  if (range === "7d") {
    start.setDate(start.getDate() - 6);
  }

  if (range === "30d") {
    start.setDate(start.getDate() - 29);
  }

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function startOfLocalDay(value: string) {
  return new Date(`${value}T00:00:00`);
}

function endOfLocalDay(value: string) {
  return new Date(`${value}T23:59:59.999`);
}

export function InventoryLogsPage() {
  return (
    <BackOfficeShell activeItem="logs" requiredPermission="view_audit_logs">
      {(context) => <InventoryLogsContent {...context} />}
    </BackOfficeShell>
  );
}
