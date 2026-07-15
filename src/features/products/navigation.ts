import {
  BadgePercent,
  BookOpen,
  Boxes,
  ClipboardList,
  ListOrdered,
  NotebookTabs,
  Package,
  PackageOpen,
  ScanBarcode,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";

export type ProductNavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export const productNavigation: ProductNavigationItem[] = [
  {
    label: "Items",
    href: "/products/items",
    icon: Package,
    description: "Manage sellable products, item records, and catalog details.",
  },
  {
    label: "Purchases",
    href: "/products/purchases",
    icon: ShoppingCart,
    description: "Track product purchasing workflows and supplier intake.",
  },
  {
    label: "Inventory",
    href: "/products/inventory",
    icon: Boxes,
    description: "Review product-level stock availability and inventory status.",
  },
  {
    label: "Price Book",
    href: "/products/price-book",
    icon: BookOpen,
    description: "Maintain pricing references and product price groups.",
  },
  {
    label: "Item Logs",
    href: "/products/item-logs",
    icon: ClipboardList,
    description: "Audit product changes, item events, and catalog activity.",
  },
  {
    label: "Promotions",
    href: "/products/promotions",
    icon: BadgePercent,
    description: "Prepare discounts, offers, and promotional product rules.",
  },
  {
    label: "Shelf Labels",
    href: "/products/shelf-labels",
    icon: ScanBarcode,
    description: "Create and organize product shelf labels and barcode signage.",
  },
  {
    label: "Inventory Adjustments",
    href: "/products/inventory-adjustments",
    icon: PackageOpen,
    description: "Record product stock corrections and adjustment history.",
  },
  {
    label: "Orders",
    href: "/products/orders",
    icon: ListOrdered,
    description: "Coordinate product orders and fulfillment preparation.",
  },
  {
    label: "Recipes",
    href: "/products/recipes",
    icon: NotebookTabs,
    description: "Build product recipes, bundles, and ingredient-style definitions.",
  },
];
