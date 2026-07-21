import {
  BookOpen,
  Boxes,
  ListOrdered,
  PackageOpen,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import type { SecondaryNavigationItem } from "@/src/features/navigation/primaryNavigation";

export type InventoryNavigationItem = SecondaryNavigationItem & {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export const inventoryNavigation: InventoryNavigationItem[] = [
  {
    id: "inventory-overview",
    label: "Overview",
    href: "/inventory/overview",
    icon: Boxes,
    description: "Review product-level stock availability and inventory status.",
  },
  {
    id: "purchases",
    label: "Purchases",
    href: "/inventory/purchases",
    icon: ShoppingCart,
    description: "Track product purchasing workflows and supplier intake.",
  },
  {
    id: "price-book",
    label: "Price Book",
    href: "/inventory/price-book",
    icon: BookOpen,
    description: "Maintain pricing references and product price groups.",
  },
  {
    id: "inventory-adjustments",
    label: "Inventory Adjustments",
    href: "/products/inventory-adjustments",
    icon: PackageOpen,
    description: "Record product stock corrections and adjustment history.",
  },
  {
    id: "orders",
    label: "Orders",
    href: "/products/orders",
    icon: ListOrdered,
    description: "Coordinate product orders and fulfillment preparation.",
    requires: "orders",
  },
];
