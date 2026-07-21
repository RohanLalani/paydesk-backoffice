import {
  Blocks,
  Boxes,
  Building2,
  ChartColumn,
  ClipboardList,
  CreditCard,
  Gauge,
  Gift,
  Landmark,
  LayoutGrid,
  MonitorUp,
  NotebookTabs,
  Package,
  Printer,
  ShieldCheck,
  Store,
  Ticket,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { inventoryNavigation } from "@/src/features/inventory/navigation";
import { logsNavigation } from "@/src/features/logs/navigation";
import { productSetupNavigation } from "@/src/features/product-setup/navigation";
import { productNavigation } from "@/src/features/products/navigation";
import { sendToPosNavigation } from "@/src/features/send-to-pos/navigation";
import type { AuthAccount } from "@/src/features/auth/types";
import type { StoreCapabilities } from "@/src/features/stores/types";

export type SidebarCategory = "general" | "setup" | "analytics" | "personnel";

export type BackOfficeNavKey =
  | "dashboard"
  | "products"
  | "logs"
  | "lottery"
  | "recipeSuite"
  | "inventory"
  | "sendToPos"
  | "storeSettings"
  | "productSetup"
  | "permissions"
  | "loyalty"
  | "services"
  | "bank"
  | "billing"
  | "receiptSetup"
  | "analytics"
  | "customers"
  | "employees"
  | "settings";

export type SecondaryNavigationItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  exact?: boolean;
  match?: string[];
  permission?: string;
  requires?: keyof Pick<StoreCapabilities, "lottery" | "recipeSuite" | "loyalty" | "orders">;
};

export type PrimaryNavigationItem = {
  key: BackOfficeNavKey;
  label: string;
  href: string;
  icon: LucideIcon;
  category: SidebarCategory;
  match?: string[];
  exact?: boolean;
  permission?: string;
  requires?: keyof Pick<StoreCapabilities, "lottery" | "recipeSuite" | "loyalty" | "orders">;
  secondaryLabel?: string;
  secondaryNavigation?: SecondaryNavigationItem[];
};

export const sidebarCategories: { key: SidebarCategory; label: string; empty: string }[] = [
  { key: "general", label: "General", empty: "" },
  { key: "setup", label: "Setup", empty: "" },
  { key: "analytics", label: "Analytics", empty: "Analytics options coming soon." },
  { key: "personnel", label: "Personnel", empty: "Personnel options coming soon." },
];

export const dashboardItem: PrimaryNavigationItem = {
  key: "dashboard",
  label: "Dashboard",
  href: "/dashboard",
  icon: Gauge,
  category: "general",
  exact: true,
};

export const primaryNavigation: PrimaryNavigationItem[] = [
  dashboardItem,
  {
    key: "products",
    label: "Products",
    href: "/products/items",
    icon: Package,
    category: "general",
    match: ["/products"],
    permission: "manage_products",
    secondaryLabel: "Product Management",
    secondaryNavigation: productNavigation,
  },
  {
    key: "lottery",
    label: "Lottery",
    href: "/lottery",
    icon: Ticket,
    category: "general",
    requires: "lottery",
  },
  {
    key: "recipeSuite",
    label: "Recipe Suite",
    href: "/recipe-suite",
    icon: NotebookTabs,
    category: "general",
    requires: "recipeSuite",
  },
  {
    key: "inventory",
    label: "Inventory",
    href: "/inventory/overview",
    icon: Boxes,
    category: "general",
    match: ["/inventory", "/products/purchases", "/products/inventory", "/inventory/price-book", "/products/inventory-adjustments", "/products/orders"],
    permission: "view_reports",
    secondaryLabel: "Inventory Management",
    secondaryNavigation: inventoryNavigation,
  },
  {
    key: "sendToPos",
    label: "Send to POS",
    href: "/send-to-pos/multi-pack-review",
    icon: MonitorUp,
    category: "general",
    match: ["/send-to-pos"],
    secondaryLabel: "Send to POS",
    secondaryNavigation: sendToPosNavigation,
  },
  {
    key: "logs",
    label: "Logs",
    href: "/logs/item-logs",
    icon: ClipboardList,
    category: "general",
    match: ["/logs"],
    permission: "manage_products",
    secondaryLabel: "Logs",
    secondaryNavigation: logsNavigation,
  },
  {
    key: "storeSettings",
    label: "Store Settings",
    href: "/settings/store",
    icon: Store,
    category: "setup",
    match: ["/settings/store", "/permissions", "/services", "/billing"],
    secondaryLabel: "Store Settings",
    secondaryNavigation: [
      {
        id: "general",
        label: "General",
        href: "/settings/store",
        icon: Store,
        description: "Manage store details and included features.",
        exact: true,
        match: ["/settings/store", "/settings/store/general"],
      },
      {
        id: "permissions",
        label: "Permissions",
        href: "/settings/store/permissions",
        icon: ShieldCheck,
        description: "Manage store role and permission access.",
        exact: true,
        match: ["/settings/store/permissions", "/permissions"],
        permission: "manage_permissions",
      },
      {
        id: "services",
        label: "Services",
        href: "/settings/store/services",
        icon: Blocks,
        description: "Manage included and paid store services.",
        exact: true,
        match: ["/settings/store/services", "/services"],
      },
      {
        id: "billing",
        label: "Billing",
        href: "/settings/store/billing",
        icon: CreditCard,
        description: "Review store subscription and add-on billing.",
        exact: true,
        match: ["/settings/store/billing", "/billing"],
      },
      {
        id: "payees",
        label: "Payees",
        href: "/settings/store/payees",
        icon: Building2,
        description: "Manage store suppliers and vendors.",
        exact: true,
      },
    ],
  },
  {
    key: "productSetup",
    label: "Product Setup",
    href: "/product-setup/departments",
    icon: LayoutGrid,
    category: "setup",
    match: ["/product-setup", "/departments"],
    permission: "manage_products",
    secondaryLabel: "Product Setup",
    secondaryNavigation: productSetupNavigation,
  },
  {
    key: "loyalty",
    label: "Loyalty",
    href: "/loyalty",
    icon: Gift,
    category: "setup",
    requires: "loyalty",
  },
  {
    key: "bank",
    label: "Bank",
    href: "/bank",
    icon: Landmark,
    category: "setup",
  },
  {
    key: "receiptSetup",
    label: "Print / Receipt Setup",
    href: "/settings/receipt",
    icon: Printer,
    category: "setup",
    match: ["/settings/receipt"],
  },
  {
    key: "analytics",
    label: "Analytics",
    href: "/analytics",
    icon: ChartColumn,
    category: "analytics",
    match: ["/analytics"],
  },
  {
    key: "customers",
    label: "Customers",
    href: "/customers",
    icon: Users,
    category: "personnel",
    match: ["/customers"],
    permission: "manage_customers",
  },
  {
    key: "employees",
    label: "Employees",
    href: "/employees",
    icon: UserCog,
    category: "personnel",
    match: ["/employees", "/staff"],
    permission: "manage_employees",
  },
];

export function canShowPrimaryNavigationItem(
  account: AuthAccount | null,
  item: PrimaryNavigationItem,
  capabilities: StoreCapabilities,
) {
  if (item.requires && !capabilities[item.requires]?.available) {
    return false;
  }

  if (!item.permission || !account || account.role === "owner" || account.role === "partner") {
    return true;
  }

  return account.permissions?.includes(item.permission) === true;
}

export function canShowSecondaryNavigationItem(
  account: AuthAccount | null,
  item: SecondaryNavigationItem,
  capabilities?: StoreCapabilities,
) {
  if (item.requires && !capabilities?.[item.requires]?.available) {
    return false;
  }

  if (!item.permission || !account || account.role === "owner" || account.role === "partner") {
    return true;
  }

  return account.permissions?.includes(item.permission) === true;
}
