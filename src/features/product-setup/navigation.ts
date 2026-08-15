import { BadgePercent, ClipboardList, FolderTree, LayoutGrid, RotateCcw, Tags } from "lucide-react";
import type { SecondaryNavigationItem } from "@/src/features/navigation/primaryNavigation";

export const productSetupNavigation: SecondaryNavigationItem[] = [
  {
    id: "taxes",
    label: "Tax Setup",
    href: "/product-setup/taxes",
    icon: BadgePercent,
    description: "Configure store tax rates.",
    exact: true,
  },
  {
    id: "departments",
    label: "Departments",
    href: "/product-setup/departments",
    icon: LayoutGrid,
    description: "Manage store departments.",
    exact: true,
  },
  {
    id: "price-groups",
    label: "Price Groups",
    href: "/product-setup/price-groups",
    icon: Tags,
    description: "Organize reusable pricing groups.",
    exact: true,
  },
  {
    id: "categories",
    label: "Categories",
    href: "/product-setup/categories",
    icon: FolderTree,
    description: "Organize store-specific product categories.",
    exact: true,
  },
  {
    id: "inventory-adjustment-reasons",
    label: "Inventory Adjustment Reasons",
    href: "/product-setup/inventory-adjustment-reasons",
    icon: ClipboardList,
    description: "Configure reasons for inventory adjustments.",
    exact: true,
  },
  {
    id: "refund-reasons",
    label: "Refund Reasons",
    href: "/product-setup/refund-reasons",
    icon: RotateCcw,
    description: "Configure reasons for refunded sales.",
    exact: true,
  },
];
