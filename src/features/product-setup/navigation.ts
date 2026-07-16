import { FolderTree, LayoutGrid, Tags } from "lucide-react";
import type { SecondaryNavigationItem } from "@/src/features/navigation/primaryNavigation";

export const productSetupNavigation: SecondaryNavigationItem[] = [
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
];
