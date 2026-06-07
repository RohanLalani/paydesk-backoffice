import {
  Banknote,
  Boxes,
  CreditCard,
  QrCode,
  ReceiptText,
  ShoppingBag,
  Users,
  WalletCards,
} from "lucide-react";
import { apiClient } from "@/src/lib/apiClient";
import type {
  DashboardMetric,
  DashboardPaymentType,
  DashboardRange,
  DashboardSummary,
  RecentActivity,
} from "@/src/features/dashboard/types";

const numberFormatter = new Intl.NumberFormat("en-US");
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const paymentIcons = {
  card: CreditCard,
  cash: Banknote,
  ebt: CreditCard,
  split: ReceiptText,
  other: QrCode,
} satisfies Record<DashboardPaymentType, typeof CreditCard>;

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function percentValue(value: unknown) {
  const percent = numberValue(value);
  return `${percent > 0 ? "+" : ""}${percent.toFixed(percent % 1 === 0 ? 0 : 1)}%`;
}

function normalizePaymentType(value: unknown): DashboardPaymentType {
  return value === "cash" || value === "card" || value === "ebt" || value === "split" || value === "other"
    ? value
    : "other";
}

function normalizeSummary(summary: DashboardSummary): DashboardSummary {
  return {
    storeId: stringValue(summary?.storeId, ""),
    range: summary?.range === "week" || summary?.range === "month" ? summary.range : "today",
    metrics: {
      todaysSales: numberValue(summary?.metrics?.todaysSales),
      transactions: numberValue(summary?.metrics?.transactions),
      avgOrderValue: numberValue(summary?.metrics?.avgOrderValue),
      lowStockItems: numberValue(summary?.metrics?.lowStockItems),
      customers: numberValue(summary?.metrics?.customers),
      employeesActive: numberValue(summary?.metrics?.employeesActive),
    },
    changes: {
      salesChangePercent: numberValue(summary?.changes?.salesChangePercent),
      transactionChangeText: stringValue(summary?.changes?.transactionChangeText, "+0 today"),
      avgOrderChangePercent: numberValue(summary?.changes?.avgOrderChangePercent),
      customersChangeText: stringValue(summary?.changes?.customersChangeText, "+0 this week"),
      employeesActiveText: stringValue(summary?.changes?.employeesActiveText, "0 logged in"),
    },
    salesTrend: Array.isArray(summary?.salesTrend)
      ? summary.salesTrend.map((point) => ({
          label: stringValue(point.label, ""),
          value: numberValue(point.value),
        }))
      : [],
    recentActivity: Array.isArray(summary?.recentActivity)
      ? summary.recentActivity.map((activity) => ({
          id: stringValue(activity.id, crypto.randomUUID()),
          type: normalizePaymentType(activity.type),
          title: stringValue(activity.title, "Payment"),
          subtitle: stringValue(activity.subtitle, ""),
          amount: numberValue(activity.amount),
          createdAt: stringValue(activity.createdAt, ""),
        }))
      : [],
    inventoryAlerts: Array.isArray(summary?.inventoryAlerts)
      ? summary.inventoryAlerts.map((alert) => ({
          id: stringValue(alert.id, crypto.randomUUID()),
          name: stringValue(alert.name, "Unnamed product"),
          currentQuantity: numberValue(alert.currentQuantity),
          minInventory: numberValue(alert.minInventory),
        }))
      : [],
    topProducts: Array.isArray(summary?.topProducts)
      ? summary.topProducts.map((product) => ({
          productId: stringValue(product.productId, crypto.randomUUID()),
          name: stringValue(product.name, "Unnamed product"),
          unitsSold: numberValue(product.unitsSold),
          revenue: numberValue(product.revenue),
        }))
      : [],
  };
}

export function buildDashboardMetrics(summary: DashboardSummary): DashboardMetric[] {
  return [
    {
      id: "sales",
      label: "Today's Sales",
      value: currencyFormatter.format(summary.metrics.todaysSales),
      change: percentValue(summary.changes.salesChangePercent),
      icon: WalletCards,
    },
    {
      id: "transactions",
      label: "Transactions",
      value: numberFormatter.format(summary.metrics.transactions),
      change: summary.changes.transactionChangeText,
      icon: ReceiptText,
    },
    {
      id: "average-order",
      label: "Avg Order Value",
      value: currencyFormatter.format(summary.metrics.avgOrderValue),
      change: percentValue(summary.changes.avgOrderChangePercent),
      icon: ShoppingBag,
    },
    {
      id: "low-stock",
      label: "Low Stock Items",
      value: numberFormatter.format(summary.metrics.lowStockItems),
      change: summary.metrics.lowStockItems ? "Needs attention" : "0 alerts",
      tone: summary.metrics.lowStockItems ? "warning" : "default",
      icon: Boxes,
    },
    {
      id: "customers",
      label: "Customers",
      value: numberFormatter.format(summary.metrics.customers),
      change: summary.changes.customersChangeText,
      icon: Users,
    },
    {
      id: "employees",
      label: "Employees Active",
      value: numberFormatter.format(summary.metrics.employeesActive),
      change: summary.changes.employeesActiveText,
      icon: Users,
    },
  ];
}

export function mapRecentActivity(summary: DashboardSummary): RecentActivity[] {
  return summary.recentActivity.map((activity) => ({
    ...activity,
    icon: paymentIcons[activity.type],
  }));
}

export function formatDashboardCurrency(value: number) {
  return currencyFormatter.format(numberValue(value));
}

export async function fetchDashboardOverview(storeId: string, range: DashboardRange) {
  const summary = await apiClient<DashboardSummary>(
    `/dashboard/store/${encodeURIComponent(storeId)}/summary?range=${range}`,
  );

  return normalizeSummary(summary);
}
