import {
  Blocks,
  Boxes,
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
  requires?: keyof Pick<StoreCapabilities, "lottery" | "recipeSuite" | "loyalty">;
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
    href: "/inventory",
    icon: Boxes,
    category: "general",
    match: ["/inventory", "/products/purchases", "/products/inventory", "/inventory/price-book", "/products/inventory-adjustments", "/products/orders"],
    permission: "manage_inventory",
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
    match: ["/settings/store"],
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
    key: "permissions",
    label: "Permissions",
    href: "/permissions",
    icon: ShieldCheck,
    category: "setup",
    permission: "manage_permissions",
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
    key: "services",
    label: "Services",
    href: "/services",
    icon: Blocks,
    category: "setup",
  },
  {
    key: "bank",
    label: "Bank",
    href: "/bank",
    icon: Landmark,
    category: "setup",
  },
  {
    key: "billing",
    label: "Billing",
    href: "/billing",
    icon: CreditCard,
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
