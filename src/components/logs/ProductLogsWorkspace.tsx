"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, RefreshCcw, Search, X } from "lucide-react";
import { BackOfficeShell, type BackOfficeShellContext } from "@/src/components/layout/BackOfficeShell";
import {
  listProductLogs,
  productLogChangeTypes,
  productLogSources,
  type ProductLogRow,
  type ProductLogSortField,
  type ProductLogTimeRange,
} from "@/src/features/logs/api";
import { getStoreDepartments, getStorePriceGroups, getStoreProductCategories } from "@/src/features/products/api";

const PAGE_LIMITS = [25, 50, 100, 250] as const;
type FilterOption = { id: string; name: string };
const PRODUCT_LOG_FIELDS = [
  ["", "All fields"],
  ["created", "Product Record"],
  ["name", "Product Description"],
  ["barcode", "Barcode"],
  ["productNumber", "Product Number"],
  ["unitRetail", "Unit Retail"],
  ["caseCost", "Case Cost"],
  ["unitsPerCase", "Units Per Case"],
  ["departmentId", "Department"],
  ["productCategoryId", "Category"],
  ["priceGroupId", "Price Group"],
  ["taxId", "Tax"],
  ["isActive", "Status"],
  ["minimumAge", "Minimum Age"],
  ["allowEbt", "EBT Eligible"],
  ["allowNegativeInventory", "Negative Inventory Sales"],
  ["trackInventory", "Track Inventory"],
] as const;

function formatTimestamp(value: string, detailed = false) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: detailed ? "full" : "medium",
    timeStyle: detailed ? "medium" : "short",
  }).format(new Date(value));
}

function formatValue(value: unknown, fieldKey?: string) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (fieldKey && ["unitRetail", "caseCost", "unitCost", "unitCostAfterDiscountAndRebate", "onlineRetailPrice"].includes(fieldKey)) {
    const amount = Number(value);
    return Number.isFinite(amount)
      ? new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount)
      : String(value);
  }
  if (fieldKey && ["margin", "defaultMargin"].includes(fieldKey)) {
    const amount = Number(value);
    return Number.isFinite(amount) ? `${amount.toFixed(2)}%` : String(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function actorLabel(row: ProductLogRow) {
  return row.changedBy?.name || row.changedBy?.email || "System";
}

function isoDateTime(date: string, time: string, endOfDay: boolean) {
  if (!date) return undefined;
  const timePart = time || (endOfDay ? "23:59:59" : "00:00:00");
  return new Date(`${date}T${timePart}`).toISOString();
}

function ProductLogsWorkspace({ theme, selectedStore }: BackOfficeShellContext) {
  const [rows, setRows] = useState<ProductLogRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<ProductLogRow | null>(null);
  const [search, setSearch] = useState("");
  const [timeRange, setTimeRange] = useState<ProductLogTimeRange>("30d");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [changeType, setChangeType] = useState("");
  const [field, setField] = useState("");
  const [changedBy, setChangedBy] = useState("");
  const [source, setSource] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priceGroupId, setPriceGroupId] = useState("");
  const [departments, setDepartments] = useState<FilterOption[]>([]);
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [priceGroups, setPriceGroups] = useState<FilterOption[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<(typeof PAGE_LIMITS)[number]>(25);
  const [sort, setSort] = useState<ProductLogSortField>("timestamp");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDark = theme === "dark";
  const panel = isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white";
  const subtlePanel = isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const input = isDark ? "border-slate-400/15 bg-white/[0.04] text-white" : "border-[#ded8f3] bg-white text-slate-950";
  const control = isDark
    ? "border-slate-400/15 bg-white/[0.04] text-slate-200 hover:border-[#7c5cff]/60 disabled:text-slate-600"
    : "border-[#ded8f3] bg-white text-slate-700 hover:border-[#7c5cff]/60 disabled:text-slate-300";

  const filtersActive = useMemo(
    () => Boolean(search.trim() || timeRange !== "30d" || fromDate || toDate || changeType || field || changedBy.trim() || source || departmentId || categoryId || priceGroupId),
    [categoryId, changeType, changedBy, departmentId, field, fromDate, priceGroupId, search, source, timeRange, toDate],
  );

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await listProductLogs(selectedStore.id, {
        page,
        limit,
        search,
        timeRange,
        from: timeRange === "custom" ? isoDateTime(fromDate, fromTime, false) : undefined,
        to: timeRange === "custom" ? isoDateTime(toDate, toTime, true) : undefined,
        changeType,
        field,
        changedBy,
        source,
        departmentId,
        categoryId,
        priceGroupId,
        sort,
        order,
      });
      setRows(response.items);
      setTotal(response.total);
      setTotalPages(response.totalPages);
      if (selectedRow && !response.items.some((row) => row.id === selectedRow.id)) {
        setSelectedRow(null);
      }
    } catch (loadError) {
      console.error("Failed to load product logs", loadError);
      setError("We couldn't load product logs right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [categoryId, changeType, changedBy, departmentId, field, fromDate, fromTime, limit, order, page, priceGroupId, search, selectedRow, selectedStore.id, sort, source, timeRange, toDate, toTime]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    let isMounted = true;

    async function loadFilters() {
      try {
        const [departmentItems, categoryItems, priceGroupResponse] = await Promise.all([
          getStoreDepartments(selectedStore.id, { limit: 250 }),
          getStoreProductCategories(selectedStore.id, { limit: 250 }),
          getStorePriceGroups(selectedStore.id),
        ]);
        if (!isMounted) return;
        setDepartments(departmentItems);
        setCategories(categoryItems.items);
        setPriceGroups(priceGroupResponse.items);
      } catch (filterError) {
        console.error("Failed to load product log filters", filterError);
      }
    }

    void loadFilters();
    return () => {
      isMounted = false;
    };
  }, [selectedStore.id]);

  const setSortField = (fieldName: ProductLogSortField) => {
    if (sort === fieldName) {
      setOrder((value) => (value === "asc" ? "desc" : "asc"));
    } else {
      setSort(fieldName);
      setOrder(fieldName === "timestamp" ? "desc" : "asc");
    }
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setTimeRange("30d");
    setFromDate("");
    setToDate("");
    setFromTime("");
    setToTime("");
    setChangeType("");
    setField("");
    setChangedBy("");
    setSource("");
    setDepartmentId("");
    setCategoryId("");
    setPriceGroupId("");
    setPage(1);
  };

  const sortableHeader = (label: string, fieldName: ProductLogSortField) => (
    <button type="button" onClick={() => setSortField(fieldName)} className="inline-flex items-center gap-1 text-left font-extrabold">
      {label}
      {sort === fieldName ? (order === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />) : null}
    </button>
  );

  return (
    <section className="space-y-5">
      <div className={`rounded-[8px] border p-5 ${panel}`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-normal">Product Logs</h1>
            <p className={`mt-2 max-w-[760px] text-sm font-semibold leading-6 ${muted}`}>
              Review product master-data changes. Inventory receipts, sales, returns, counts, and stock movements stay in Inventory Logs.
            </p>
          </div>
          <button type="button" className={`inline-flex h-11 items-center gap-2 rounded-[8px] border px-4 text-sm font-extrabold transition ${control}`} onClick={() => void loadRows()}>
            <RefreshCcw className="size-4" aria-hidden="true" />
            Refresh
          </button>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(220px,1fr)_150px_170px_180px_180px]">
          <label className="relative block">
            <span className="sr-only">Search product logs</span>
            <Search className={`pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 ${muted}`} aria-hidden="true" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Product number, barcode, description" className={`h-11 w-full rounded-[8px] border py-2 pl-10 pr-3 text-sm font-semibold outline-none ${input}`} />
          </label>
          <select value={timeRange} onChange={(event) => { setTimeRange(event.target.value as ProductLogTimeRange); setPage(1); }} className={`h-11 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`}>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="custom">Custom Range</option>
            <option value="all">All Time</option>
          </select>
          <select value={changeType} onChange={(event) => { setChangeType(event.target.value); setPage(1); }} className={`h-11 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`}>
            <option value="">All change types</option>
            {productLogChangeTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <select value={field} onChange={(event) => { setField(event.target.value); setPage(1); }} className={`h-11 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`}>
            {PRODUCT_LOG_FIELDS.map(([value, label]) => <option key={value || "all"} value={value}>{label}</option>)}
          </select>
          <select value={source} onChange={(event) => { setSource(event.target.value); setPage(1); }} className={`h-11 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`}>
            <option value="">All sources</option>
            {productLogSources.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_1fr_1fr_1fr_auto]">
          <input value={changedBy} onChange={(event) => { setChangedBy(event.target.value); setPage(1); }} placeholder="Changed by user" className={`h-11 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`} />
          <select value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setPage(1); }} className={`h-11 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`}>
            <option value="">All departments</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
          <select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }} className={`h-11 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`}>
            <option value="">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <select value={priceGroupId} onChange={(event) => { setPriceGroupId(event.target.value); setPage(1); }} className={`h-11 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`}>
            <option value="">All price groups</option>
            {priceGroups.map((priceGroup) => <option key={priceGroup.id} value={priceGroup.id}>{priceGroup.name}</option>)}
          </select>
          {filtersActive ? (
            <button type="button" onClick={clearFilters} className={`inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-extrabold transition ${control}`}>
              <X className="size-4" aria-hidden="true" />
              Clear
            </button>
          ) : null}
        </div>

        {timeRange === "custom" ? (
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} className={`h-11 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`} />
            <input type="time" value={fromTime} onChange={(event) => { setFromTime(event.target.value); setPage(1); }} className={`h-11 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`} />
            <input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} className={`h-11 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`} />
            <input type="time" value={toTime} onChange={(event) => { setToTime(event.target.value); setPage(1); }} className={`h-11 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`} />
          </div>
        ) : null}

      </div>

      {error ? <div className={`rounded-[8px] border p-4 text-sm font-bold ${isDark ? "border-red-400/25 bg-red-500/10 text-red-100" : "border-red-200 bg-red-50 text-red-700"}`}>{error}</div> : null}

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className={`overflow-hidden rounded-[8px] border ${panel}`}>
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full text-left text-sm">
              <thead className={`border-b text-xs uppercase ${isDark ? "border-slate-400/15 text-slate-400" : "border-[#ded8f3] bg-[#fbfaff] text-slate-500"}`}>
                <tr>
                  <th className="px-4 py-3">{sortableHeader("Timestamp", "timestamp")}</th>
                  <th className="px-4 py-3">{sortableHeader("Product Number", "productNumber")}</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3">{sortableHeader("Product Description", "productDescription")}</th>
                  <th className="px-4 py-3">{sortableHeader("Change Type", "changeType")}</th>
                  <th className="px-4 py-3">Changes</th>
                  <th className="px-4 py-3">{sortableHeader("Changed By", "changedBy")}</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-400/10">
                {rows.map((row) => (
                  <tr key={row.id} onClick={() => setSelectedRow(row)} className={`cursor-pointer transition ${selectedRow?.id === row.id ? (isDark ? "bg-white/[0.06]" : "bg-[#f3f0ff]") : isDark ? "hover:bg-white/[0.04]" : "hover:bg-[#fbfaff]"}`}>
                    <td className="px-4 py-3 font-semibold">{formatTimestamp(row.timestamp)}</td>
                    <td className="px-4 py-3 font-bold">{row.productNumber ?? "-"}</td>
                    <td className="px-4 py-3 font-semibold">{row.barcode ?? "-"}</td>
                    <td className="max-w-[220px] px-4 py-3 font-bold"><span className="block truncate">{row.productDescription ?? "-"}</span></td>
                    <td className="px-4 py-3"><span className="rounded-[8px] bg-[#4f2df2]/10 px-2 py-1 text-xs font-extrabold text-[#4f2df2]">{row.changeType}</span></td>
                    <td className="max-w-[240px] px-4 py-3 font-bold"><span className="block truncate">{row.changesSummary}</span></td>
                    <td className="px-4 py-3 font-semibold">{actorLabel(row)}</td>
                    <td className="px-4 py-3 font-semibold">{row.source}</td>
                    <td className="max-w-[180px] px-4 py-3 font-semibold"><span className="block truncate">{row.reference ?? "-"}</span></td>
                  </tr>
                ))}
                {!isLoading && rows.length === 0 ? (
                  <tr><td colSpan={9} className={`px-4 py-10 text-center text-sm font-bold ${muted}`}>No product logs found.</td></tr>
                ) : null}
                {isLoading ? (
                  <tr><td colSpan={9} className={`px-4 py-10 text-center text-sm font-bold ${muted}`}>Loading product logs...</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className={`flex flex-col gap-3 border-t px-4 py-3 text-sm font-bold sm:flex-row sm:items-center sm:justify-between ${isDark ? "border-slate-400/15" : "border-[#ded8f3]"}`}>
            <span className={muted}>Page {page} of {totalPages} / {total} rows</span>
            <div className="flex flex-wrap items-center gap-2">
              <select value={limit} onChange={(event) => { setLimit(Number(event.target.value) as (typeof PAGE_LIMITS)[number]); setPage(1); }} className={`h-10 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`}>
                {PAGE_LIMITS.map((value) => <option key={value} value={value}>{value} rows</option>)}
              </select>
              <button type="button" className={`h-10 rounded-[8px] border px-3 text-sm font-extrabold transition ${control}`} disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
              <button type="button" className={`h-10 rounded-[8px] border px-3 text-sm font-extrabold transition ${control}`} disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button>
            </div>
          </div>
        </div>

        <aside className={`rounded-[8px] border p-5 ${panel}`}>
          {selectedRow ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-extrabold tracking-normal">{selectedRow.changesSummary}</h2>
                <p className={`mt-1 text-sm font-semibold ${muted}`}>{selectedRow.productDescription ?? "Product"} / {selectedRow.changeType}</p>
              </div>
              <div className={`grid gap-2 rounded-[8px] border p-3 text-sm font-semibold ${subtlePanel}`}>
                <span>Timestamp: {formatTimestamp(selectedRow.timestamp, true)}</span>
                <span>Product: {selectedRow.productNumber ?? "-"} / {selectedRow.barcode ?? "-"}</span>
                <span>Changed by: {actorLabel(selectedRow)}</span>
                <span>Source: {selectedRow.source}</span>
                <span>Reference: {selectedRow.reference ?? "-"}</span>
                <span>Audit event ID: {selectedRow.auditEventId}</span>
              </div>
              <div className={`overflow-hidden rounded-[8px] border ${subtlePanel}`}>
                <table className="w-full text-left text-sm">
                  <thead className={`border-b text-xs uppercase ${isDark ? "border-slate-400/15 text-slate-400" : "border-[#ded8f3] text-slate-500"}`}>
                    <tr>
                      <th className="px-3 py-2">Field</th>
                      <th className="px-3 py-2">Previous Value</th>
                      <th className="px-3 py-2">New Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-400/10">
                    {selectedRow.changedFields.map((change) => (
                      <tr key={change.field}>
                        <td className="px-3 py-2 font-bold">{change.fieldLabel}</td>
                        <td className="px-3 py-2 font-semibold">{formatValue(change.previousValue, change.field)}</td>
                        <td className="px-3 py-2 font-semibold">{formatValue(change.newValue, change.field)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className={`text-sm font-bold ${muted}`}>Select a product log row to review full details.</p>
          )}
        </aside>
      </div>
    </section>
  );
}

export function ProductLogsPage({ activeItem }: { activeItem: "logs" | "products" }) {
  return (
    <BackOfficeShell activeItem={activeItem} requiredPermission="view_audit_logs">
      {(context) => <ProductLogsWorkspace {...context} />}
    </BackOfficeShell>
  );
}
