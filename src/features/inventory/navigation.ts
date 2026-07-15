import {
  Boxes,
  ListOrdered,
  PackageOpen,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";

export type InventoryNavigationItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export const inventoryNavigation: InventoryNavigationItem[] = [
  {
    id: "purchases",
    label: "Purchases",
    href: "/products/purchases",
    icon: ShoppingCart,
    description: "Track product purchasing workflows and supplier intake.",
  },
  {
    id: "inventory-overview",
    label: "Inventory Overview",
    href: "/products/inventory",
    icon: Boxes,
    description: "Review product-level stock availability and inventory status.",
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
  },
];
