import {
  BookOpen,
  Car,
  Cigarette,
  Cloud,
  Cross,
  Flower,
  Footprints,
  Fuel,
  Gamepad2,
  Gem,
  Gift,
  Hammer,
  Laptop,
  Monitor,
  PawPrint,
  Shirt,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Sofa,
  Sparkles,
  Store,
  Warehouse,
  Wine,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { StoreBusinessType } from "@/src/features/stores/types";

export type StoreTypeConfig = {
  label: string;
  icon: LucideIcon;
  accentColor: string;
  lightModeBackground: string;
  darkModeBackground: string;
};

export const storeTypeConfig: Record<StoreBusinessType, StoreTypeConfig> = {
  convenience_store: {
    label: "Convenience Store",
    icon: Store,
    accentColor: "#2563EB",
    lightModeBackground: "rgba(37, 99, 235, 0.05)",
    darkModeBackground: "rgba(37, 99, 235, 0.10)",
  },
  grocery_store: {
    label: "Grocery Store",
    icon: ShoppingBasket,
    accentColor: "#16A34A",
    lightModeBackground: "rgba(22, 163, 74, 0.05)",
    darkModeBackground: "rgba(22, 163, 74, 0.10)",
  },
  supermarket: {
    label: "Supermarket",
    icon: ShoppingCart,
    accentColor: "#059669",
    lightModeBackground: "rgba(5, 150, 105, 0.05)",
    darkModeBackground: "rgba(5, 150, 105, 0.10)",
  },
  liquor_store: {
    label: "Liquor Store",
    icon: Wine,
    accentColor: "#7C3AED",
    lightModeBackground: "rgba(124, 58, 237, 0.05)",
    darkModeBackground: "rgba(124, 58, 237, 0.10)",
  },
  smoke_shop: {
    label: "Smoke Shop",
    icon: Cigarette,
    accentColor: "#64748B",
    lightModeBackground: "rgba(100, 116, 139, 0.06)",
    darkModeBackground: "rgba(100, 116, 139, 0.12)",
  },
  vape_shop: {
    label: "Vape Shop",
    icon: Cloud,
    accentColor: "#4F46E5",
    lightModeBackground: "rgba(79, 70, 229, 0.05)",
    darkModeBackground: "rgba(79, 70, 229, 0.11)",
  },
  gas_station: {
    label: "Gas Station",
    icon: Fuel,
    accentColor: "#F97316",
    lightModeBackground: "rgba(249, 115, 22, 0.05)",
    darkModeBackground: "rgba(249, 115, 22, 0.11)",
  },
  pharmacy: {
    label: "Pharmacy",
    icon: Cross,
    accentColor: "#DC2626",
    lightModeBackground: "rgba(220, 38, 38, 0.05)",
    darkModeBackground: "rgba(220, 38, 38, 0.10)",
  },
  clothing_store: {
    label: "Clothing Store",
    icon: Shirt,
    accentColor: "#6366F1",
    lightModeBackground: "rgba(99, 102, 241, 0.05)",
    darkModeBackground: "rgba(99, 102, 241, 0.10)",
  },
  shoe_store: {
    label: "Shoe Store",
    icon: Footprints,
    accentColor: "#D97706",
    lightModeBackground: "rgba(217, 119, 6, 0.05)",
    darkModeBackground: "rgba(217, 119, 6, 0.11)",
  },
  jewelry_store: {
    label: "Jewelry Store",
    icon: Gem,
    accentColor: "#CA8A04",
    lightModeBackground: "rgba(202, 138, 4, 0.06)",
    darkModeBackground: "rgba(202, 138, 4, 0.12)",
  },
  gift_shop: {
    label: "Gift Shop",
    icon: Gift,
    accentColor: "#DB2777",
    lightModeBackground: "rgba(219, 39, 119, 0.05)",
    darkModeBackground: "rgba(219, 39, 119, 0.10)",
  },
  electronics_store: {
    label: "Electronics Store",
    icon: Laptop,
    accentColor: "#0891B2",
    lightModeBackground: "rgba(8, 145, 178, 0.05)",
    darkModeBackground: "rgba(8, 145, 178, 0.11)",
  },
  phone_store: {
    label: "Phone Store",
    icon: Smartphone,
    accentColor: "#1D4ED8",
    lightModeBackground: "rgba(29, 78, 216, 0.05)",
    darkModeBackground: "rgba(29, 78, 216, 0.10)",
  },
  computer_store: {
    label: "Computer Store",
    icon: Monitor,
    accentColor: "#0284C7",
    lightModeBackground: "rgba(2, 132, 199, 0.05)",
    darkModeBackground: "rgba(2, 132, 199, 0.11)",
  },
  hardware_store: {
    label: "Hardware Store",
    icon: Hammer,
    accentColor: "#EA580C",
    lightModeBackground: "rgba(234, 88, 12, 0.05)",
    darkModeBackground: "rgba(234, 88, 12, 0.11)",
  },
  home_improvement_store: {
    label: "Home Improvement",
    icon: Wrench,
    accentColor: "#D97706",
    lightModeBackground: "rgba(217, 119, 6, 0.05)",
    darkModeBackground: "rgba(217, 119, 6, 0.11)",
  },
  furniture_store: {
    label: "Furniture Store",
    icon: Sofa,
    accentColor: "#A16207",
    lightModeBackground: "rgba(161, 98, 7, 0.06)",
    darkModeBackground: "rgba(161, 98, 7, 0.12)",
  },
  auto_parts: {
    label: "Auto Parts",
    icon: Car,
    accentColor: "#B91C1C",
    lightModeBackground: "rgba(185, 28, 28, 0.05)",
    darkModeBackground: "rgba(185, 28, 28, 0.10)",
  },
  beauty_store: {
    label: "Beauty Store",
    icon: Sparkles,
    accentColor: "#EC4899",
    lightModeBackground: "rgba(236, 72, 153, 0.05)",
    darkModeBackground: "rgba(236, 72, 153, 0.10)",
  },
  pet_store: {
    label: "Pet Store",
    icon: PawPrint,
    accentColor: "#22C55E",
    lightModeBackground: "rgba(34, 197, 94, 0.05)",
    darkModeBackground: "rgba(34, 197, 94, 0.10)",
  },
  bookstore: {
    label: "Bookstore",
    icon: BookOpen,
    accentColor: "#3B82F6",
    lightModeBackground: "rgba(59, 130, 246, 0.05)",
    darkModeBackground: "rgba(59, 130, 246, 0.10)",
  },
  toy_store: {
    label: "Toy Store",
    icon: Gamepad2,
    accentColor: "#8B5CF6",
    lightModeBackground: "rgba(139, 92, 246, 0.05)",
    darkModeBackground: "rgba(139, 92, 246, 0.10)",
  },
  flower_shop: {
    label: "Flower Shop",
    icon: Flower,
    accentColor: "#E11D48",
    lightModeBackground: "rgba(225, 29, 72, 0.05)",
    darkModeBackground: "rgba(225, 29, 72, 0.10)",
  },
  wholesale: {
    label: "Wholesale",
    icon: Warehouse,
    accentColor: "#475569",
    lightModeBackground: "rgba(71, 85, 105, 0.06)",
    darkModeBackground: "rgba(71, 85, 105, 0.12)",
  },
  other: {
    label: "Other",
    icon: Store,
    accentColor: "#4F22F2",
    lightModeBackground: "rgba(79, 34, 242, 0.05)",
    darkModeBackground: "rgba(79, 34, 242, 0.11)",
  },
};

export function normalizeStoreType(value?: string): StoreBusinessType {
  const normalized = value?.trim().toLowerCase().replace(/[\s-]+/g, "_") ?? "";

  if (normalized in storeTypeConfig) {
    return normalized as StoreBusinessType;
  }

  if (normalized === "warehouse") {
    return "wholesale";
  }

  return "other";
}

export function inferStoreType(input: {
  businessType?: string;
  type?: string;
  name?: string;
  address?: string;
}): StoreBusinessType {
  const explicitType = normalizeStoreType(input.businessType ?? input.type);

  if (explicitType !== "other") {
    return explicitType;
  }

  const haystack = `${input.name ?? ""} ${input.address ?? ""}`.toLowerCase();
  const keywordMap: Array<[string, StoreBusinessType]> = [
    ["convenience", "convenience_store"],
    ["grocery", "grocery_store"],
    ["market", "grocery_store"],
    ["supermarket", "supermarket"],
    ["liquor", "liquor_store"],
    ["wine", "liquor_store"],
    ["smoke", "smoke_shop"],
    ["vape", "vape_shop"],
    ["gas", "gas_station"],
    ["fuel", "gas_station"],
    ["pharmacy", "pharmacy"],
    ["clothing", "clothing_store"],
    ["shoe", "shoe_store"],
    ["jewelry", "jewelry_store"],
    ["gift", "gift_shop"],
    ["electronics", "electronics_store"],
    ["phone", "phone_store"],
    ["computer", "computer_store"],
    ["hardware", "hardware_store"],
    ["home improvement", "home_improvement_store"],
    ["furniture", "furniture_store"],
    ["auto", "auto_parts"],
    ["beauty", "beauty_store"],
    ["pet", "pet_store"],
    ["book", "bookstore"],
    ["toy", "toy_store"],
    ["flower", "flower_shop"],
    ["wholesale", "wholesale"],
    ["warehouse", "wholesale"],
  ];

  return keywordMap.find(([keyword]) => haystack.includes(keyword))?.[1] ?? "other";
}

export function getStoreTypeConfig(input: {
  businessType?: string;
  type?: string;
  name?: string;
  address?: string;
}) {
  return storeTypeConfig[inferStoreType(input)];
}
