import type { StoreBusinessType } from "@/src/features/stores/types";

export const BUSINESS_TYPE_GROUPS: Array<{
  label: string;
  options: Array<{ value: StoreBusinessType; label: string }>;
}> = [
  {
    label: "Retail Food & Essentials",
    options: [
      { value: "convenience_store", label: "Convenience Store" },
      { value: "grocery_store", label: "Grocery Store" },
      { value: "supermarket", label: "Supermarket" },
    ],
  },
  {
    label: "Age Restricted Retail",
    options: [
      { value: "liquor_store", label: "Liquor Store" },
      { value: "smoke_shop", label: "Smoke Shop" },
      { value: "vape_shop", label: "Vape Shop" },
    ],
  },
  {
    label: "Fuel & Travel",
    options: [{ value: "gas_station", label: "Gas Station" }],
  },
  {
    label: "Health",
    options: [{ value: "pharmacy", label: "Pharmacy" }],
  },
  {
    label: "Fashion",
    options: [
      { value: "clothing_store", label: "Clothing Store" },
      { value: "shoe_store", label: "Shoe Store" },
      { value: "jewelry_store", label: "Jewelry Store" },
      { value: "gift_shop", label: "Gift Shop" },
    ],
  },
  {
    label: "Electronics",
    options: [
      { value: "electronics_store", label: "Electronics Store" },
      { value: "phone_store", label: "Phone Store" },
      { value: "computer_store", label: "Computer Store" },
    ],
  },
  {
    label: "Home Improvement",
    options: [
      { value: "hardware_store", label: "Hardware Store" },
      { value: "home_improvement_store", label: "Home Improvement Store" },
      { value: "furniture_store", label: "Furniture Store" },
    ],
  },
  {
    label: "Automotive",
    options: [{ value: "auto_parts", label: "Auto Parts" }],
  },
  {
    label: "Beauty",
    options: [{ value: "beauty_store", label: "Beauty Store" }],
  },
  {
    label: "Pets",
    options: [{ value: "pet_store", label: "Pet Store" }],
  },
  {
    label: "Specialty Retail",
    options: [
      { value: "bookstore", label: "Bookstore" },
      { value: "toy_store", label: "Toy Store" },
      { value: "flower_shop", label: "Flower Shop" },
    ],
  },
  {
    label: "Wholesale Retail",
    options: [{ value: "wholesale", label: "Wholesale" }],
  },
  {
    label: "Other",
    options: [{ value: "other", label: "Other" }],
  },
];

export const BUSINESS_TYPE_LABELS = BUSINESS_TYPE_GROUPS.flatMap(
  (group) => group.options,
).reduce<Record<StoreBusinessType, string>>(
  (labels, option) => ({
    ...labels,
    [option.value]: option.label,
  }),
  {} as Record<StoreBusinessType, string>,
);

export function isStoreBusinessType(
  value: string,
): value is StoreBusinessType {
  return value in BUSINESS_TYPE_LABELS;
}
