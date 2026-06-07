import type { LucideIcon } from "lucide-react";

export type DashboardPermission =
  | "manage_products"
  | "manage_inventory"
  | "manage_customers"
  | "manage_employees";

export type DashboardMetric = {
  id: string;
  label: string;
  value: string;
  change: string;
  tone?: "default" | "warning";
  icon?: LucideIcon;
};

export type SalesTrendPoint = {
  label: string;
  value: number;
};

export type RecentActivity = {
  id: string;
  type: DashboardPaymentType;
  title: string;
  subtitle: string;
  amount: number;
  createdAt: string;
  icon: LucideIcon;
};

export type DashboardPaymentType = "cash" | "card" | "ebt" | "split" | "other";

export type InventoryAlert = {
  id: string;
  name: string;
  currentQuantity: number;
  minInventory: number;
};

export type TopProduct = {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
};

export type DashboardRange = "today" | "week" | "month";

export type DashboardSummary = {
  storeId: string;
  range: DashboardRange;
  metrics: {
    todaysSales: number;
    transactions: number;
    avgOrderValue: number;
    lowStockItems: number;
    customers: number;
    employeesActive: number;
  };
  changes: {
    salesChangePercent: number;
    transactionChangeText: string;
    avgOrderChangePercent: number;
    customersChangeText: string;
    employeesActiveText: string;
  };
  salesTrend: SalesTrendPoint[];
  recentActivity: Array<Omit<RecentActivity, "icon">>;
  inventoryAlerts: InventoryAlert[];
  topProducts: TopProduct[];
};

export type QuickAction = {
  id: string;
  label: string;
  href: string;
  permission: DashboardPermission;
  icon: LucideIcon;
};
