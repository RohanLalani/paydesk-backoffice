"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowUpRight, Boxes, RefreshCcw } from "lucide-react";
import { BackOfficeShell, type BackOfficeShellContext } from "@/src/components/layout/BackOfficeShell";
import {
  getInventoryOverview,
  type InventoryOverviewAlertType,
  type InventoryOverviewRange,
  type InventoryOverviewResponse,
  type InventoryOverviewStatus,
} from "@/src/features/products/api";

type ThemeClasses = {
  isDark: boolean;
  panel: string;
  nested: string;
  border: string;
  muted: string;
  input: string;
  row: string;
};

type GroupedInventoryAlert = {
  productId: string;
  productNumber: number;
  barcode: string;
  productName: string;
  departmentName: string | null;
  currentQuantity: number;
  minimumInventory: number | null;
  alertTypes: InventoryOverviewAlertType[];
};

const RANGE_OPTIONS: Array<{ value: InventoryOverviewRange; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

const ALERT_TYPE_ORDER: InventoryOverviewAlertType[] = [
  "NEGATIVE_STOCK",
  "OUT_OF_STOCK",
  "LOW_STOCK",
  "MISSING_COST",
  "MISSING_MINIMUM_INVENTORY",
];

function classesFor(theme: "light" | "dark"): ThemeClasses {
  const isDark = theme === "dark";
  return {
    isDark,
    panel: isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white",
    nested: isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]",
    border: isDark ? "border-slate-400/15" : "border-[#ded8f3]",
    muted: isDark ? "text-slate-400" : "text-slate-500",
    input: isDark
      ? "border-slate-400/15 bg-white/[0.04] text-white"
      : "border-[#ded8f3] bg-white text-slate-950",
    row: isDark ? "hover:bg-white/[0.03]" : "hover:bg-[#fbfaff]",
  };
}

function formatCurrency(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number.isFinite(amount) ? amount : 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatLastUpdated(value: string | null) {
  if (!value) return "Not updated yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not updated yet";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function alertTypeLabel(type: InventoryOverviewAlertType) {
  switch (type) {
    case "NEGATIVE_STOCK":
      return "Negative Inventory";
    case "OUT_OF_STOCK":
      return "Out of Stock";
    case "LOW_STOCK":
      return "Low Stock";
    case "MISSING_COST":
      return "Missing Cost";
    case "MISSING_MINIMUM_INVENTORY":
      return "Missing Minimum Inventory";
    default:
      return type;
  }
}

function alertTypeRank(type: InventoryOverviewAlertType) {
  const index = ALERT_TYPE_ORDER.indexOf(type);
  return index === -1 ? ALERT_TYPE_ORDER.length : index;
}

function alertTypeClass(type: InventoryOverviewAlertType, isDark: boolean) {
  switch (type) {
    case "NEGATIVE_STOCK":
      return isDark ? "bg-rose-500/20 text-rose-200" : "bg-rose-500/12 text-rose-700";
    case "OUT_OF_STOCK":
      return isDark ? "bg-red-500/20 text-red-200" : "bg-red-500/12 text-red-700";
    case "LOW_STOCK":
      return isDark ? "bg-amber-500/20 text-amber-200" : "bg-amber-500/12 text-amber-700";
    case "MISSING_COST":
      return isDark ? "bg-yellow-500/20 text-yellow-100" : "bg-yellow-500/12 text-yellow-800";
    case "MISSING_MINIMUM_INVENTORY":
      return isDark ? "bg-white/[0.08] text-slate-200" : "bg-slate-200 text-slate-700";
    default:
      return isDark ? "bg-white/[0.08] text-slate-200" : "bg-slate-200 text-slate-700";
  }
}

function statusBadge(status: InventoryOverviewStatus) {
  if (status === "NEGATIVE_STOCK") return "Negative Stock";
  if (status === "OUT_OF_STOCK") return "Out of Stock";
  return "Low Stock";
}

function statusClass(status: InventoryOverviewStatus) {
  if (status === "NEGATIVE_STOCK") return "bg-rose-500/15 text-rose-500";
  if (status === "OUT_OF_STOCK") return "bg-amber-500/15 text-amber-500";
  return "bg-[#4f2df2]/12 text-[#4f2df2]";
}

function groupInventoryAlerts(alerts: InventoryOverviewResponse["alerts"]) {
  const grouped = new Map<string, GroupedInventoryAlert>();

  for (const alert of alerts) {
    const existing = grouped.get(alert.productId);

    if (!existing) {
      grouped.set(alert.productId, {
        productId: alert.productId,
        productNumber: alert.productNumber,
        barcode: alert.barcode,
        productName: alert.productName,
        departmentName: alert.departmentName,
        currentQuantity: alert.currentQuantity,
        minimumInventory: alert.minimumInventory,
        alertTypes: [alert.type],
      });
      continue;
    }

    if (!existing.alertTypes.includes(alert.type)) {
      existing.alertTypes.push(alert.type);
    }
  }

  return [...grouped.values()]
    .map((alert) => ({
      ...alert,
      alertTypes: [...alert.alertTypes].sort((left, right) => alertTypeRank(left) - alertTypeRank(right)),
    }))
    .sort((left, right) => {
      const severityDelta = alertTypeRank(left.alertTypes[0] ?? "MISSING_MINIMUM_INVENTORY")
        - alertTypeRank(right.alertTypes[0] ?? "MISSING_MINIMUM_INVENTORY");

      if (severityDelta !== 0) {
        return severityDelta;
      }

      return left.productName.localeCompare(right.productName);
    });
}

export function InventoryOverviewWorkspace() {
  return (
    <BackOfficeShell activeItem="inventory">
      {(context) => <InventoryOverviewContent {...context} />}
    </BackOfficeShell>
  );
}

function InventoryOverviewContent({ theme, selectedStore }: BackOfficeShellContext) {
  const styles = classesFor(theme);
  const [range, setRange] = useState<InventoryOverviewRange>("30d");
  const [overview, setOverview] = useState<InventoryOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const loadOverview = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "initial") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(false);
      try {
        const response = await getInventoryOverview(selectedStore.id, range);
        setOverview(response);
      } catch {
        setError(true);
        if (mode === "initial") {
          setOverview(null);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [range, selectedStore.id],
  );

  useEffect(() => {
    queueMicrotask(() => void loadOverview("initial"));
  }, [loadOverview]);

  const summaryCards = useMemo(() => {
    if (!overview) return [];
    return [
      { label: "Total Active Products", value: formatNumber(overview.summary.activeProductCount), helper: "Active products in this store." },
      { label: "Low Stock Products", value: formatNumber(overview.summary.lowStockCount), helper: "Tracked items at or below their minimum." },
      { label: "Out of Stock Products", value: formatNumber(overview.summary.outOfStockCount), helper: "Tracked items with quantity at or below zero." },
      {
        label: "Inventory Value",
        value: formatCurrency(overview.summary.inventoryValue),
        helper:
          overview.summary.missingCostCount > 0
            ? `${overview.summary.missingCostCount} products excluded because cost is unavailable.`
            : "All tracked products with stock have usable cost data.",
      },
    ];
  }, [overview]);

  const groupedAlerts = useMemo(
    () => (overview ? groupInventoryAlerts(overview.alerts).slice(0, 10) : []),
    [overview],
  );

  return (
    <section className="space-y-5">
      <section className={`rounded-[8px] border p-6 ${styles.panel}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-normal">Inventory Overview</h1>
            <p className={`mt-2 max-w-[760px] text-sm font-semibold leading-6 ${styles.muted}`}>
              Monitor stock levels, product movement, and inventory alerts.
            </p>
            <p className={`mt-3 text-xs font-semibold ${styles.muted}`}>
              Last updated {formatLastUpdated(overview?.generatedAt ?? null)}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="text-sm font-bold">
              <span className="sr-only">Sales performance date range</span>
              <select
                aria-label="Sales performance date range"
                value={range}
                onChange={(event) => setRange(event.target.value as InventoryOverviewRange)}
                className={`h-11 min-w-[160px] rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:ring-4 focus:ring-[#7c5cff]/20 ${styles.input}`}
              >
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void loadOverview("refresh")}
              disabled={refreshing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {error && !overview ? (
        <section className={`rounded-[8px] border p-6 ${styles.panel}`} aria-live="polite">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-500" aria-hidden="true" />
            <div>
              <h2 className="text-xl font-extrabold">Unable to load inventory overview</h2>
              <p className={`mt-2 text-sm font-semibold ${styles.muted}`}>
                We couldn&apos;t load your inventory information right now. Please try again.
              </p>
              <button
                type="button"
                onClick={() => void loadOverview("initial")}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-[8px] bg-[#4f2df2] px-5 text-sm font-bold text-white"
              >
                Retry
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite">
        {loading && !overview
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={`rounded-[8px] border p-5 ${styles.panel}`}>
                <div className="h-4 w-28 rounded-[4px] bg-slate-400/20" />
                <div className="mt-4 h-8 w-24 rounded-[4px] bg-slate-400/20" />
                <div className="mt-3 h-4 w-full rounded-[4px] bg-slate-400/20" />
              </div>
            ))
          : summaryCards.map((card) => (
              <div key={card.label} className={`rounded-[8px] border p-5 ${styles.panel}`}>
                <p className={`text-xs font-extrabold uppercase ${styles.muted}`}>{card.label}</p>
                <p className="mt-3 text-3xl font-extrabold tracking-normal">{card.value}</p>
                <p className={`mt-3 text-sm font-semibold leading-6 ${styles.muted}`}>{card.helper}</p>
              </div>
            ))}
      </section>

      <CardShell title="Inventory Alerts" actionHref="/inventory/price-book" actionLabel="View All" styles={styles}>
        {loading && !overview ? (
          <ListSkeleton />
        ) : overview && groupedAlerts.length ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <AlertCount label="Out of Stock" value={overview.alertCounts.outOfStock} styles={styles} />
              <AlertCount label="Low Stock" value={overview.alertCounts.lowStock} styles={styles} />
              <AlertCount label="Negative Inventory" value={overview.alertCounts.negativeInventory} styles={styles} />
              <AlertCount label="Missing Cost" value={overview.alertCounts.missingCost} styles={styles} />
              <AlertCount label="Missing Minimum" value={overview.alertCounts.missingMinimumInventory} styles={styles} />
            </div>
            <div className={`overflow-hidden rounded-[8px] border ${styles.nested}`}>
              {groupedAlerts.map((alert) => (
                <Link
                  key={alert.productId}
                  href={`/products/items?productId=${encodeURIComponent(alert.productId)}`}
                  aria-label={`View item ${alert.productName}. Alerts: ${alert.alertTypes.map(alertTypeLabel).join(", ")}`}
                  className={`flex flex-col gap-3 border-b px-4 py-4 transition last:border-b-0 sm:flex-row sm:items-center sm:justify-between ${styles.border} ${styles.row}`}
                >
                  <div className="min-w-0">
                    <div
                      className="flex flex-wrap items-center gap-2"
                      aria-label={`Alert status ${alert.alertTypes.map(alertTypeLabel).join(", ")}`}
                    >
                      <span className="text-sm font-extrabold">#{alert.productNumber}</span>
                      {alert.alertTypes.map((type) => (
                        <span
                          key={`${alert.productId}-${type}`}
                          className={`inline-flex rounded-[4px] px-2 py-1 text-[11px] font-extrabold ${alertTypeClass(type, styles.isDark)}`}
                        >
                          {alertTypeLabel(type)}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 truncate text-sm font-bold">{alert.productName}</p>
                    <p className={`mt-1 text-xs font-semibold ${styles.muted}`}>
                      {alert.barcode} {alert.departmentName ? `• ${alert.departmentName}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 self-start sm:self-center">
                    <div className="text-right">
                      <p className="text-sm font-extrabold">{formatNumber(alert.currentQuantity)}</p>
                      <p className={`text-xs font-semibold ${styles.muted}`}>On hand</p>
                    </div>
                    <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <p className={`text-sm font-semibold ${styles.muted}`}>
            All tracked products are within their configured stock levels.
          </p>
        )}
      </CardShell>

      <section className="grid gap-5 xl:grid-cols-2">
        <CardShell title="Top Sellers" styles={styles}>
          {loading && !overview ? (
            <ListSkeleton />
          ) : overview && overview.topSellers.length ? (
            <MetricList
              items={overview.topSellers.map((product) => ({
                key: product.productId,
                href: `/products/items?productId=${encodeURIComponent(product.productId)}`,
                title: `${product.rank}. #${product.productNumber} ${product.productName}`,
                meta: `${formatNumber(product.unitsSold)} units sold`,
                details: `${formatCurrency(product.grossSales)} • Qty ${formatNumber(product.currentQuantity)}`,
              }))}
              styles={styles}
            />
          ) : (
            <EmptyState message="No sales were recorded during this period." styles={styles} />
          )}
        </CardShell>

        <CardShell title="Slow Sellers" styles={styles}>
          {loading && !overview ? (
            <ListSkeleton />
          ) : overview && overview.slowSellers.length ? (
            <MetricList
              items={overview.slowSellers.map((product) => ({
                key: product.productId,
                href: `/products/items?productId=${encodeURIComponent(product.productId)}`,
                title: `#${product.productNumber} ${product.productName}`,
                meta: `${formatNumber(product.unitsSold)} units sold`,
                details: `${product.lastSaleAt ? formatDate(product.lastSaleAt) : "Never in selected period"} • ${formatCurrency(product.unitRetail)} • Qty ${formatNumber(product.currentQuantity)}`,
              }))}
              styles={styles}
            />
          ) : (
            <EmptyState message="No active products are available." styles={styles} />
          )}
        </CardShell>

        <CardShell title="Dead Stock" styles={styles}>
          {loading && !overview ? (
            <ListSkeleton />
          ) : overview && overview.deadStock.length ? (
            <MetricList
              items={overview.deadStock.map((product) => ({
                key: product.productId,
                href: `/products/items?productId=${encodeURIComponent(product.productId)}`,
                title: `#${product.productNumber} ${product.productName}`,
                meta: product.lastSaleAt
                  ? `Last sale ${formatDate(product.lastSaleAt)}`
                  : `Never sold • Age from ${formatDate(product.ageReferenceDate)}`,
                details: `${formatCurrency(product.inventoryValue)} • ${product.daysSinceLastSale} days • Qty ${formatNumber(product.currentQuantity)}`,
              }))}
              styles={styles}
            />
          ) : (
            <EmptyState message="No dead stock was found." styles={styles} />
          )}
        </CardShell>

        <CardShell title="Low Stock" styles={styles}>
          {loading && !overview ? (
            <ListSkeleton />
          ) : overview && overview.lowStock.length ? (
            <div className={`overflow-hidden rounded-[8px] border ${styles.nested}`}>
              {overview.lowStock.map((product) => (
                <Link
                  key={product.productId}
                  href={`/products/items?productId=${encodeURIComponent(product.productId)}`}
                  className={`flex flex-col gap-3 border-b px-4 py-4 transition last:border-b-0 sm:flex-row sm:items-center sm:justify-between ${styles.border} ${styles.row}`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold">#{product.productNumber}</span>
                      <span className={`inline-flex rounded-[4px] px-2 py-1 text-[11px] font-extrabold ${statusClass(product.status)}`}>
                        {statusBadge(product.status)}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm font-bold">{product.productName}</p>
                    <p className={`mt-1 text-xs font-semibold ${styles.muted}`}>
                      {product.departmentName ?? "No department"} • Min {formatNumber(product.minimumInventory)}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-right text-xs font-semibold sm:min-w-[220px]">
                    <StatCell label="Qty" value={formatNumber(product.currentQuantity)} />
                    <StatCell label="Shortage" value={formatNumber(product.shortage)} />
                    <StatCell label="View" value="Open" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState message="No products are currently low on stock." styles={styles} />
          )}
        </CardShell>
      </section>
    </section>
  );
}

function CardShell({
  title,
  styles,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  styles: ThemeClasses;
  actionHref?: string;
  actionLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-[8px] border p-5 ${styles.panel}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Boxes className="size-4" aria-hidden="true" />
          <h2 className="text-lg font-extrabold tracking-normal">{title}</h2>
        </div>
        {actionHref && actionLabel ? (
          <Link href={actionHref} className="text-xs font-extrabold text-[#4f2df2] transition hover:text-[#3517c6]">
            {actionLabel}
          </Link>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function AlertCount({ label, value, styles }: { label: string; value: number; styles: ThemeClasses }) {
  return (
    <div className={`rounded-[8px] border px-4 py-3 ${styles.nested}`}>
      <p className={`text-xs font-extrabold uppercase ${styles.muted}`}>{label}</p>
      <p className="mt-2 text-2xl font-extrabold">{formatNumber(value)}</p>
    </div>
  );
}

function MetricList({
  items,
  styles,
}: {
  items: Array<{ key: string; href: string; title: string; meta: string; details: string }>;
  styles: ThemeClasses;
}) {
  return (
    <div className={`overflow-hidden rounded-[8px] border ${styles.nested}`}>
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`flex flex-col gap-2 border-b px-4 py-4 transition last:border-b-0 ${styles.border} ${styles.row}`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-sm font-bold">{item.title}</p>
            <ArrowUpRight className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          </div>
          <p className={`text-xs font-semibold ${styles.muted}`}>{item.meta}</p>
          <p className="text-sm font-semibold">{item.details}</p>
        </Link>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="rounded-[8px] border border-slate-400/15 p-4">
          <div className="h-4 w-40 rounded-[4px] bg-slate-400/20" />
          <div className="mt-3 h-4 w-24 rounded-[4px] bg-slate-400/20" />
          <div className="mt-3 h-4 w-56 rounded-[4px] bg-slate-400/20" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message, styles }: { message: string; styles: ThemeClasses }) {
  return <p className={`text-sm font-semibold ${styles.muted}`}>{message}</p>;
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-extrabold">{value}</p>
    </div>
  );
}
