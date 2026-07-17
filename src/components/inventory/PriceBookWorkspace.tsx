"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, RotateCcw, Search } from "lucide-react";
import { BackOfficeShell, type BackOfficeShellContext } from "@/src/components/layout/BackOfficeShell";
import {
  getStoreDepartments,
  getStoreProductCategories,
  getStorePriceGroups,
  listPriceBookProducts,
  type Department,
  type MarginStatus,
  type PriceBookProduct,
  type PriceBookSortField,
  type PriceGroup,
  type ProductCategory,
} from "@/src/features/products/api";

const EMPTY = "\u2014";
const PAGE_SIZES = [25, 50, 100] as const;

type FilterState = {
  search: string;
  departmentId: string;
  categoryId: string;
  priceGroupId: string;
  status: "all" | "active" | "inactive";
  trackInventory: "all" | "tracked" | "untracked";
  marginStatus: "all" | MarginStatus;
};

type ThemeClasses = {
  isDark: boolean;
  panel: string;
  nested: string;
  muted: string;
  border: string;
  input: string;
  sticky: string;
  hover: string;
};

type Column = {
  key: string;
  label: string;
  sort?: PriceBookSortField;
  sticky?: "number" | "barcode" | "name";
  render: (product: PriceBookProduct) => ReactNode;
};

const initialFilters: FilterState = {
  search: "",
  departmentId: "",
  categoryId: "",
  priceGroupId: "",
  status: "all",
  trackInventory: "all",
  marginStatus: "all",
};

function classesFor(theme: "light" | "dark"): ThemeClasses {
  const isDark = theme === "dark";
  return {
    isDark,
    panel: isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white",
    nested: isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]",
    muted: isDark ? "text-slate-400" : "text-slate-500",
    border: isDark ? "border-slate-400/15" : "border-[#ded8f3]",
    input: isDark
      ? "border-slate-400/15 bg-white/[0.04] text-white placeholder:text-slate-500"
      : "border-[#ded8f3] bg-white text-slate-950 placeholder:text-slate-400",
    sticky: isDark ? "bg-[#0f172a]" : "bg-white",
    hover: isDark ? "hover:bg-white/[0.04]" : "hover:bg-[#fbfaff]",
  };
}

function money(value: string | null | undefined) {
  if (!value) return EMPTY;
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount)
    : EMPTY;
}

function percent(value: string | null | undefined) {
  if (!value) return EMPTY;
  const amount = Number(value);
  return Number.isFinite(amount) ? `${amount.toFixed(2)}%` : EMPTY;
}

function saleTypeLabel(value: string) {
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function ageLabel(value: number | null) {
  if (value === null || value === 0) return "None";
  if (value === 18) return "18";
  if (value === 19) return "18 - Time Sensitive";
  if (value === 21) return "21";
  if (value === 22) return "21 - Time Sensitive";
  return String(value);
}

function boolBadge(value: boolean, yes = "Yes", no = "No") {
  return (
    <span className={`inline-flex rounded-[4px] px-2 py-1 text-xs font-extrabold ${value ? "bg-emerald-500/15 text-emerald-500" : "bg-slate-500/15 text-slate-500"}`}>
      {value ? yes : no}
    </span>
  );
}

function marginDisplay(value: string | null) {
  if (!value) return EMPTY;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return EMPTY;
  if (amount < 0) return <span className="font-extrabold text-rose-500">{amount.toFixed(2)}% - Negative</span>;
  if (amount === 0) return <span className="font-extrabold text-amber-500">0.00% - Zero</span>;
  return `${amount.toFixed(2)}%`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function hasFilters(filters: FilterState) {
  return JSON.stringify(filters) !== JSON.stringify(initialFilters);
}

export function PriceBookWorkspace() {
  return (
    <BackOfficeShell activeItem="inventory" requiredPermission="manage_products">
      {(context) => <PriceBookContent {...context} />}
    </BackOfficeShell>
  );
}

function PriceBookContent({ theme, selectedStore }: BackOfficeShellContext) {
  const styles = classesFor(theme);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<PriceBookSortField>("productNumber");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<(typeof PAGE_SIZES)[number]>(50);
  const [products, setProducts] = useState<PriceBookProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [priceGroups, setPriceGroups] = useState<PriceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [filters.search]);

  useEffect(() => {
    queueMicrotask(() => {
      void Promise.all([
        getStoreDepartments(selectedStore.id, { limit: 100 }),
        getStoreProductCategories(selectedStore.id, { limit: 100 }),
        getStorePriceGroups(selectedStore.id),
      ])
        .then(([departmentResponse, categoryResponse, priceGroupResponse]) => {
          setDepartments(departmentResponse);
          setCategories(categoryResponse.items);
          setPriceGroups(priceGroupResponse.items);
        })
        .catch(() => {
          setDepartments([]);
          setCategories([]);
          setPriceGroups([]);
        });
    });
  }, [selectedStore.id]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await listPriceBookProducts(selectedStore.id, {
        search: debouncedSearch,
        departmentId: filters.departmentId || undefined,
        categoryId: filters.categoryId || undefined,
        priceGroupId: filters.priceGroupId || undefined,
        isActive: filters.status === "all" ? undefined : filters.status === "active",
        trackInventory: filters.trackInventory === "all" ? undefined : filters.trackInventory === "tracked",
        marginStatus: filters.marginStatus === "all" ? undefined : filters.marginStatus,
        sort,
        order,
        page,
        limit,
      });
      setProducts(response.items);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch {
      setError(true);
      setProducts([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters, limit, order, page, selectedStore.id, sort]);

  useEffect(() => {
    queueMicrotask(() => void loadProducts());
  }, [loadProducts]);

  const filteredCategories = useMemo(
    () => categories.filter((category) => !filters.departmentId || category.departmentId === filters.departmentId),
    [categories, filters.departmentId],
  );

  const columns = useMemo<Column[]>(() => [
    { key: "productNumber", label: "Product Number", sort: "productNumber", sticky: "number", render: (p) => String(p.productNumber) },
    { key: "barcode", label: "Barcode", sort: "barcode", sticky: "barcode", render: (p) => p.barcode },
    { key: "name", label: "Product Name", sort: "name", sticky: "name", render: (p) => p.name },
    { key: "department", label: "Department", sort: "department", render: (p) => p.department.name },
    { key: "category", label: "Category", sort: "category", render: (p) => p.category?.name ?? EMPTY },
    { key: "priceGroup", label: "Price Group", sort: "priceGroup", render: (p) => p.priceGroup?.name ?? "No Price Group" },
    { key: "saleType", label: "Sale Type", render: (p) => saleTypeLabel(p.saleType) },
    { key: "unitRetail", label: "Unit Retail", sort: "unitRetail", render: (p) => money(p.unitRetail) },
    { key: "onlineRetailPrice", label: "Online Retail", render: (p) => money(p.onlineRetailPrice) },
    { key: "unitCost", label: "Unit Cost", sort: "unitCost", render: (p) => money(p.unitCost) },
    { key: "adjustedCost", label: "Adjusted Cost", render: (p) => money(p.unitCostAfterDiscountAndRebate) },
    { key: "margin", label: "Margin", sort: "margin", render: (p) => marginDisplay(p.margin) },
    { key: "defaultMargin", label: "Default Margin", render: (p) => percent(p.defaultMargin) },
    { key: "unitsPerCase", label: "Units per Case", render: (p) => p.unitsPerCase?.toLocaleString() ?? EMPTY },
    { key: "caseCost", label: "Case Cost", render: (p) => money(p.caseCost) },
    { key: "caseDiscount", label: "Case Discount", render: (p) => money(p.caseDiscount) },
    { key: "caseRebate", label: "Case Rebate", render: (p) => money(p.caseRebate) },
    { key: "currentQuantity", label: "Current Quantity", sort: "currentQuantity", render: (p) => p.currentQuantity.toLocaleString() },
    { key: "minInventory", label: "Minimum Inventory", render: (p) => p.minInventory?.toLocaleString() ?? EMPTY },
    { key: "maxInventory", label: "Maximum Inventory", render: (p) => p.maxInventory?.toLocaleString() ?? EMPTY },
    { key: "trackInventory", label: "Track Inventory", render: (p) => boolBadge(p.trackInventory, "Tracked", "Not Tracked") },
    { key: "allowNegativeInventory", label: "Allow Negative Inventory", render: (p) => boolBadge(p.allowNegativeInventory) },
    { key: "unitOfMeasure", label: "Unit of Measure", render: (p) => p.unitOfMeasure ?? EMPTY },
    { key: "size", label: "Size", render: (p) => p.size ?? EMPTY },
    { key: "minimumAge", label: "Minimum Age", render: (p) => ageLabel(p.minimumAge) },
    { key: "tax", label: "Tax", render: (p) => `${p.tax.name} (${p.tax.rate}% + ${money(p.tax.surchargeAmount)})` },
    { key: "allowEbt", label: "EBT", render: (p) => boolBadge(p.allowEbt, "Allowed", "Not Allowed") },
    { key: "isActive", label: "Active Status", render: (p) => boolBadge(p.isActive, "Active", "Inactive") },
    { key: "updatedAt", label: "Last Updated", sort: "updatedAt", render: (p) => formatDate(p.updatedAt) },
  ], []);

  function updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "departmentId" ? { categoryId: "" } : {}),
    }));
    if (key !== "search") setPage(1);
  }

  function clearFilters() {
    setFilters(initialFilters);
    setDebouncedSearch("");
    setPage(1);
  }

  function toggleSort(nextSort: PriceBookSortField) {
    if (sort === nextSort) {
      setOrder((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSort(nextSort);
      setOrder("asc");
    }
    setPage(1);
  }

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <section className="space-y-5">
      <div className={`rounded-[8px] border p-6 ${styles.panel}`}>
        <h1 className="text-2xl font-bold tracking-normal">Price Book</h1>
        <p className={`mt-2 max-w-[760px] text-sm font-semibold leading-6 ${styles.muted}`}>
          View pricing, costs, classifications, and inventory settings for all store products.
        </p>
      </div>

      <section className={`rounded-[8px] border p-5 ${styles.panel}`} aria-label="Price book filters">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-bold">
            Search
            <span className="relative mt-2 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} className={`h-11 w-full rounded-[8px] border py-2 pl-10 pr-3 text-sm font-bold outline-none transition focus:ring-4 focus:ring-[#7c5cff]/20 ${styles.input}`} placeholder="Product #, barcode, name, NACS" />
            </span>
          </label>
          <Select label="Department" value={filters.departmentId} onChange={(value) => updateFilter("departmentId", value)} options={[["", "All Departments"], ...departments.map((department) => [department.id, department.name] as [string, string])]} styles={styles} />
          <Select label="Category" value={filters.categoryId} onChange={(value) => updateFilter("categoryId", value)} options={[["", "All Categories"], ...filteredCategories.map((category) => [category.id, category.name] as [string, string])]} styles={styles} />
          <Select label="Price Group" value={filters.priceGroupId} onChange={(value) => updateFilter("priceGroupId", value)} options={[["", "All Price Groups"], ["__none__", "No Price Group"], ...priceGroups.map((group) => [group.id, group.name] as [string, string])]} styles={styles} />
          <Select label="Status" value={filters.status} onChange={(value) => updateFilter("status", value as FilterState["status"])} options={[["all", "All"], ["active", "Active"], ["inactive", "Inactive"]]} styles={styles} />
          <Select label="Inventory Tracking" value={filters.trackInventory} onChange={(value) => updateFilter("trackInventory", value as FilterState["trackInventory"])} options={[["all", "All"], ["tracked", "Tracked"], ["untracked", "Not Tracked"]]} styles={styles} />
          <Select label="Margin Status" value={filters.marginStatus} onChange={(value) => updateFilter("marginStatus", value as FilterState["marginStatus"])} options={[["all", "All"], ["positive", "Positive Margin"], ["zero", "Zero Margin"], ["negative", "Negative Margin"], ["unavailable", "Margin Unavailable"]]} styles={styles} />
          <div className="flex items-end">
            <button type="button" onClick={clearFilters} disabled={!hasFilters(filters)} className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles.input}`}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Clear Filters
            </button>
          </div>
        </div>
      </section>

      <div className={`flex flex-col gap-3 rounded-[8px] border p-4 text-sm font-bold sm:flex-row sm:items-center sm:justify-between ${styles.panel}`}>
        <p>{loading ? "Loading products..." : `Showing ${start}-${end} of ${total} products`}</p>
        <p className={styles.muted}>Sorted by {columns.find((column) => column.sort === sort)?.label ?? "Product Number"} {order === "asc" ? "ascending" : "descending"}</p>
      </div>

      <section className={`overflow-hidden rounded-[8px] border ${styles.panel}`}>
        {error ? (
          <div className="p-8">
            <h2 className="text-xl font-extrabold">Unable to load products</h2>
            <p className={`mt-2 text-sm font-semibold ${styles.muted}`}>We couldn&apos;t load the price book right now. Please try again.</p>
            <button type="button" onClick={() => void loadProducts()} className="mt-5 h-11 rounded-[8px] bg-[#4f2df2] px-5 text-sm font-extrabold text-white">Retry</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[3200px] border-collapse text-left text-sm">
              <thead>
                <tr className={`border-b text-xs font-extrabold uppercase ${styles.border} ${styles.muted}`}>
                  {columns.map((column) => (
                    <th key={column.key} aria-sort={column.sort === sort ? (order === "asc" ? "ascending" : "descending") : "none"} className={`px-4 py-3 ${stickyClass(column.sticky, styles)}`}>
                      {column.sort ? (
                        <button type="button" onClick={() => toggleSort(column.sort!)} className="inline-flex items-center gap-2 rounded-[4px] text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/25">
                          {column.label}
                          {column.sort === sort ? (order === "asc" ? <ArrowUp className="size-3" aria-hidden="true" /> : <ArrowDown className="size-3" aria-hidden="true" />) : null}
                        </button>
                      ) : column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? <SkeletonRows columns={columns} styles={styles} /> : products.map((product) => (
                  <tr key={product.id} className={`border-b ${styles.border} ${styles.hover}`}>
                    {columns.map((column) => (
                      <td key={column.key} className={`whitespace-nowrap px-4 py-3 font-semibold ${stickyClass(column.sticky, styles)}`}>
                        {column.render(product)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !products.length ? (
              <div className="p-8">
                <h2 className="text-xl font-extrabold">{hasFilters(filters) ? "No products match these filters" : "No products yet"}</h2>
                <p className={`mt-2 text-sm font-semibold ${styles.muted}`}>{hasFilters(filters) ? "Try changing or clearing your filters." : "Create a product to start building your price book."}</p>
                {hasFilters(filters) ? <button type="button" onClick={clearFilters} className="mt-5 h-11 rounded-[8px] bg-[#4f2df2] px-5 text-sm font-extrabold text-white">Clear Filters</button> : null}
              </div>
            ) : null}
          </div>
        )}
      </section>

      <Pagination page={page} totalPages={totalPages} limit={limit} styles={styles} onPageChange={setPage} onLimitChange={(nextLimit) => { setLimit(nextLimit); setPage(1); }} />
    </section>
  );
}

function Select({ label, value, options, styles, onChange }: { label: string; value: string; options: Array<[string, string]>; styles: ThemeClasses; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-bold">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`mt-2 h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:ring-4 focus:ring-[#7c5cff]/20 ${styles.input}`}>
        {options.map(([optionValue, optionLabel]) => <option key={`${label}-${optionValue}`} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function stickyClass(sticky: Column["sticky"], styles: ThemeClasses) {
  if (!sticky) return "";
  const base = `sticky z-10 ${styles.sticky}`;
  if (sticky === "number") return `${base} left-0 min-w-[120px] shadow-[1px_0_0_rgba(148,163,184,0.18)]`;
  if (sticky === "barcode") return `${base} left-[120px] min-w-[170px] shadow-[1px_0_0_rgba(148,163,184,0.18)]`;
  return `${base} left-[290px] min-w-[280px] shadow-[1px_0_0_rgba(148,163,184,0.18)]`;
}

function SkeletonRows({ columns, styles }: { columns: Column[]; styles: ThemeClasses }) {
  return Array.from({ length: 8 }).map((_, rowIndex) => (
    <tr key={rowIndex} className={`border-b ${styles.border}`}>
      {columns.map((column) => (
        <td key={column.key} className={`px-4 py-3 ${stickyClass(column.sticky, styles)}`}>
          <span className="block h-4 w-24 rounded-[4px] bg-slate-400/20" />
        </td>
      ))}
    </tr>
  ));
}

function Pagination({
  page,
  totalPages,
  limit,
  styles,
  onPageChange,
  onLimitChange,
}: {
  page: number;
  totalPages: number;
  limit: 25 | 50 | 100;
  styles: ThemeClasses;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: 25 | 50 | 100) => void;
}) {
  return (
    <nav className={`flex flex-col gap-3 rounded-[8px] border p-4 sm:flex-row sm:items-center sm:justify-between ${styles.panel}`} aria-label="Price book pagination">
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={`h-10 rounded-[8px] border px-4 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-50 ${styles.input}`}>Previous</button>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className={`h-10 rounded-[8px] border px-4 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-50 ${styles.input}`}>Next</button>
      </div>
      <p className="text-sm font-bold">Page {page} of {totalPages}</p>
      <label className="text-sm font-bold">
        Rows per page
        <select value={limit} onChange={(event) => onLimitChange(Number(event.target.value) as 25 | 50 | 100)} className={`ml-3 h-10 rounded-[8px] border px-3 text-sm font-bold outline-none ${styles.input}`}>
          {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </label>
    </nav>
  );
}
