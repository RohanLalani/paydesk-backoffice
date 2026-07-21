"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeDollarSign,
  BadgePercent,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  Gift,
  Info,
  LoaderCircle,
  PackageCheck,
  Plus,
  Save,
  Search,
  ShoppingBasket,
  Tags,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { BackOfficeShell } from "@/src/components/layout/BackOfficeShell";
import { ProductsSidebar } from "@/src/components/layout/ProductsSidebar";
import {
  createPromotion,
  deletePromotion,
  getPromotion,
  searchPromotionProducts,
  transitionPromotion,
  updatePromotion,
  type PromotionPayload,
  type PromotionProduct,
} from "@/src/features/promotions/api";

type PromotionConfigField = {
  key: string;
  label: string;
  helper: string;
  kind: "number" | "boolean";
  min?: number;
  max?: number;
  step?: string;
  integer?: boolean;
  defaultValue?: number | boolean;
};
function definePromotionFields<const T extends Record<string, readonly PromotionConfigField[]>>(value: T) {
  return value as { readonly [K in keyof T]: readonly PromotionConfigField[] };
}
const fields = definePromotionFields({
  BUY_X_GET_Y_FREE: [
    {
      key: "buyQuantity",
      label: "Quantity the customer must buy",
      helper: "The offer activates after this many qualifying items are added.",
      kind: "number",
      min: 1,
      step: "1",
      integer: true,
      defaultValue: 1,
    },
    {
      key: "rewardQuantity",
      label: "Quantity the customer receives free",
      helper: "How many reward items become free once the customer qualifies.",
      kind: "number",
      min: 1,
      step: "1",
      integer: true,
      defaultValue: 1,
    },
    {
      key: "sameProductOnly",
      label: "Reward must be the same item",
      helper: "Use this when the free item should match the item the customer bought.",
      kind: "boolean",
      defaultValue: true,
    },
  ],
  BUY_X_GET_Y_PERCENT_OFF: [
    {
      key: "buyQuantity",
      label: "Quantity the customer must buy",
      helper: "The customer must buy this many qualifying items before the discount applies.",
      kind: "number",
      min: 1,
      step: "1",
      integer: true,
      defaultValue: 1,
    },
    {
      key: "discountedQuantity",
      label: "Quantity that receives the discount",
      helper: "How many additional items receive the percentage discount.",
      kind: "number",
      min: 1,
      step: "1",
      integer: true,
      defaultValue: 1,
    },
    {
      key: "discountPercentage",
      label: "Discount percentage",
      helper: "Enter a percentage between 1 and 100.",
      kind: "number",
      min: 1,
      max: 100,
      step: "0.01",
      defaultValue: 10,
    },
  ],
  BUY_X_GET_Y_FIXED_PRICE: [
    {
      key: "buyQuantity",
      label: "Quantity the customer must buy",
      helper: "The customer must buy this many qualifying items before the special price applies.",
      kind: "number",
      min: 1,
      step: "1",
      integer: true,
      defaultValue: 1,
    },
    {
      key: "discountedQuantity",
      label: "Quantity sold at the special price",
      helper: "How many reward items receive the fixed sale price.",
      kind: "number",
      min: 1,
      step: "1",
      integer: true,
      defaultValue: 1,
    },
    {
      key: "fixedRewardPrice",
      label: "Special price for each reward item",
      helper: "The price charged for each discounted reward item.",
      kind: "number",
      min: 0,
      step: "0.01",
      defaultValue: 0,
    },
  ],
  QUANTITY_BUNDLE_PRICE: [
    {
      key: "requiredQuantity",
      label: "Quantity needed for the bundle price",
      helper: "The customer must buy this many eligible items to receive the total price.",
      kind: "number",
      min: 1,
      step: "1",
      integer: true,
      defaultValue: 2,
    },
    {
      key: "bundlePrice",
      label: "Total promotional price",
      helper: "The total price for the whole group of eligible items.",
      kind: "number",
      min: 0,
      step: "0.01",
      defaultValue: 0,
    },
    {
      key: "allowMultiples",
      label: "Repeat for each full bundle",
      helper: "A customer buying enough items can receive this bundle price more than once.",
      kind: "boolean",
      defaultValue: true,
    },
  ],
  QUANTITY_PERCENT_OFF: [
    {
      key: "requiredQuantity",
      label: "Quantity the customer must buy",
      helper: "The percentage discount starts after this many eligible items are added.",
      kind: "number",
      min: 1,
      step: "1",
      integer: true,
      defaultValue: 2,
    },
    {
      key: "discountPercentage",
      label: "Discount percentage",
      helper: "Enter a percentage between 1 and 100.",
      kind: "number",
      min: 1,
      max: 100,
      step: "0.01",
      defaultValue: 10,
    },
    {
      key: "allowMultiples",
      label: "Repeat for each qualifying group",
      helper: "The discount can apply again when the customer buys enough additional items.",
      kind: "boolean",
      defaultValue: true,
    },
  ],
  FIXED_AMOUNT_OFF_ITEM: [
    {
      key: "discountAmount",
      label: "Dollar amount off each item",
      helper: "The dollar discount removed from each eligible item.",
      kind: "number",
      min: 0,
      step: "0.01",
      defaultValue: 0,
    },
    {
      key: "minimumQuantity",
      label: "Minimum quantity to qualify",
      helper: "The customer must buy at least this many eligible items.",
      kind: "number",
      min: 1,
      step: "1",
      integer: true,
      defaultValue: 1,
    },
  ],
  PERCENT_OFF_ITEM: [
    {
      key: "discountPercentage",
      label: "Discount percentage",
      helper: "Enter a percentage between 1 and 100.",
      kind: "number",
      min: 1,
      max: 100,
      step: "0.01",
      defaultValue: 10,
    },
    {
      key: "minimumQuantity",
      label: "Minimum quantity to qualify",
      helper: "The customer must buy at least this many eligible items.",
      kind: "number",
      min: 1,
      step: "1",
      integer: true,
      defaultValue: 1,
    },
  ],
  FIXED_AMOUNT_OFF_GROUP: [
    {
      key: "requiredQuantity",
      label: "Quantity the customer must buy",
      helper: "The customer must buy this many eligible items to receive the discount.",
      kind: "number",
      min: 1,
      step: "1",
      integer: true,
      defaultValue: 2,
    },
    {
      key: "discountAmount",
      label: "Dollar amount off the group",
      helper: "The total discount removed after the customer qualifies.",
      kind: "number",
      min: 0,
      step: "0.01",
      defaultValue: 0,
    },
  ],
  MIX_AND_MATCH_BUNDLE: [
    {
      key: "requiredQuantity",
      label: "Number of items the customer can mix",
      helper: "Customers may combine different eligible products to reach this quantity.",
      kind: "number",
      min: 1,
      step: "1",
      integer: true,
      defaultValue: 3,
    },
    {
      key: "bundlePrice",
      label: "Total promotional price",
      helper: "The total price for the selected mix-and-match group.",
      kind: "number",
      min: 0,
      step: "0.01",
      defaultValue: 0,
    },
    {
      key: "allowMultiples",
      label: "Allow multiple groups in one sale",
      helper: "A customer can receive the mix-and-match price more than once.",
      kind: "boolean",
      defaultValue: true,
    },
  ],
  SPEND_THRESHOLD_FIXED_OFF: [
    {
      key: "minimumSpend",
      label: "Minimum purchase amount",
      helper: "The customer must spend this amount on eligible products.",
      kind: "number",
      min: 0,
      step: "0.01",
      defaultValue: 0,
    },
    {
      key: "discountAmount",
      label: "Dollar amount off",
      helper: "The total dollar discount applied after the spend requirement is met.",
      kind: "number",
      min: 0,
      step: "0.01",
      defaultValue: 0,
    },
  ],
  SPEND_THRESHOLD_PERCENT_OFF: [
    {
      key: "minimumSpend",
      label: "Minimum purchase amount",
      helper: "The customer must spend this amount on eligible products.",
      kind: "number",
      min: 0,
      step: "0.01",
      defaultValue: 0,
    },
    {
      key: "discountPercentage",
      label: "Discount percentage",
      helper: "Enter a percentage between 1 and 100.",
      kind: "number",
      min: 1,
      max: 100,
      step: "0.01",
      defaultValue: 10,
    },
    {
      key: "maximumDiscountAmount",
      label: "Maximum discount amount",
      helper: "Optional cap for the discount amount in one transaction.",
      kind: "number",
      min: 0,
      step: "0.01",
      defaultValue: 0,
    },
  ],
  CUSTOM_PRICE: [
    {
      key: "promotionalUnitPrice",
      label: "Temporary sale price",
      helper: "The price each eligible item sells for during the promotion.",
      kind: "number",
      min: 0,
      step: "0.01",
      defaultValue: 0,
    },
    {
      key: "maximumQuantity",
      label: "Maximum quantity per transaction",
      helper: "Optional limit for how many items receive the temporary sale price.",
      kind: "number",
      min: 1,
      step: "1",
      integer: true,
      defaultValue: 1,
    },
  ],
});
type PromotionType = keyof typeof fields;
const promotionTypes = Object.keys(fields) as [PromotionType, ...PromotionType[]];
const DEFAULT_PROMOTION_TYPE: PromotionType = "BUY_X_GET_Y_FREE";
const promotionTypeMetadata: Record<
  PromotionType,
  {
    title: string;
    shortDescription: string;
    description: string;
    example: string;
    limitation: string;
  }
> = {
  BUY_X_GET_Y_FREE: {
    title: "Buy items, get items free",
    shortDescription: "Buy a set quantity and give free items.",
    description: "The customer buys a required quantity and receives another item free.",
    example: "Buy 2 energy drinks, get 1 free.",
    limitation: "Best for item-based offers; choose separate reward products only when the free item is different.",
  },
  BUY_X_GET_Y_PERCENT_OFF: {
    title: "Buy items, get items discounted",
    shortDescription: "Buy items and discount the reward item.",
    description: "The customer buys a required quantity and receives another item at a percentage discount.",
    example: "Buy 2 coffees, get 1 pastry 50% off.",
    limitation: "The discount percentage must be between 1 and 100.",
  },
  BUY_X_GET_Y_FIXED_PRICE: {
    title: "Buy items, get a special reward price",
    shortDescription: "Buy items and set the reward item price.",
    description: "The customer buys a required quantity and receives another item at a fixed price.",
    example: "Buy 1 sandwich, get a drink for $1.00.",
    limitation: "Use this when only the reward item price changes.",
  },
  QUANTITY_BUNDLE_PRICE: {
    title: "Get a set quantity for one total price",
    shortDescription: "Sell a fixed quantity for one total price.",
    description: "The customer receives a fixed total price when buying the required number of eligible items.",
    example: "Any 2 chips for $6.",
    limitation: "Works best when the selected products can share one bundle price.",
  },
  QUANTITY_PERCENT_OFF: {
    title: "Buy more, save a percentage",
    shortDescription: "Discount items after a quantity is reached.",
    description: "The customer receives a percentage discount after buying enough eligible items.",
    example: "Buy 3 candy bars and get 20% off.",
    limitation: "The discount percentage must be between 1 and 100.",
  },
  FIXED_AMOUNT_OFF_ITEM: {
    title: "Take a fixed amount off each item",
    shortDescription: "Remove dollars from each eligible item.",
    description: "A dollar amount is removed from each eligible item after the customer qualifies.",
    example: "Save $1.00 on each bottled drink.",
    limitation: "This discount is applied per eligible item.",
  },
  PERCENT_OFF_ITEM: {
    title: "Take a percentage off each item",
    shortDescription: "Take a percentage off eligible items.",
    description: "Each eligible item receives a percentage discount after the minimum quantity is met.",
    example: "Buy 1 bakery item and get 15% off.",
    limitation: "The discount percentage must be between 1 and 100.",
  },
  FIXED_AMOUNT_OFF_GROUP: {
    title: "Take a fixed amount off a group",
    shortDescription: "Remove dollars from a qualifying group.",
    description: "A dollar amount is removed after the customer buys enough eligible items.",
    example: "Buy 4 canned drinks and get $2 off.",
    limitation: "The discount is for the qualifying group, not each item.",
  },
  MIX_AND_MATCH_BUNDLE: {
    title: "Combine different eligible products",
    shortDescription: "Let customers combine eligible products.",
    description: "Customers can mix products from the promotion group to reach the required quantity.",
    example: "Choose any 3 drinks from the selected group for $7.",
    limitation: "Only selected eligible products count toward the mix-and-match group.",
  },
  SPEND_THRESHOLD_FIXED_OFF: {
    title: "Spend enough, get dollars off",
    shortDescription: "Give dollars off after a spend amount.",
    description: "A fixed dollar discount applies after the customer spends enough on eligible products.",
    example: "Spend $25 on eligible products and get $5 off.",
    limitation: "Only eligible product spend counts toward the threshold.",
  },
  SPEND_THRESHOLD_PERCENT_OFF: {
    title: "Spend enough, save a percentage",
    shortDescription: "Give percent off after a spend amount.",
    description: "A percentage discount applies after the customer spends enough on eligible products.",
    example: "Spend $30 on snacks and get 10% off.",
    limitation: "Use the maximum discount amount to cap large discounts when needed.",
  },
  CUSTOM_PRICE: {
    title: "Sell an item at a temporary sale price",
    shortDescription: "Set a temporary sale price for items.",
    description: "The qualifying product is sold at a specified price during the promotion period.",
    example: "Regular price $3.49, promotional price $2.99.",
    limitation: "Applies to selected items; use the quantity limit when the sale price should be capped.",
  },
};
const promotionTypeIcons: Record<PromotionType, LucideIcon> = {
  BUY_X_GET_Y_FREE: Gift,
  BUY_X_GET_Y_PERCENT_OFF: BadgePercent,
  BUY_X_GET_Y_FIXED_PRICE: BadgeDollarSign,
  QUANTITY_BUNDLE_PRICE: PackageCheck,
  QUANTITY_PERCENT_OFF: Tags,
  FIXED_AMOUNT_OFF_ITEM: CircleDollarSign,
  PERCENT_OFF_ITEM: BadgePercent,
  FIXED_AMOUNT_OFF_GROUP: Boxes,
  MIX_AND_MATCH_BUNDLE: ShoppingBasket,
  SPEND_THRESHOLD_FIXED_OFF: CircleDollarSign,
  SPEND_THRESHOLD_PERCENT_OFF: BadgePercent,
  CUSTOM_PRICE: Tags,
};
const advancedLabels = {
  applyAutomatically: {
    label: "Apply automatically at POS",
    description: "Cashiers do not need to manually choose this promotion when the sale qualifies.",
  },
  allowCashierOverride: {
    label: "Allow cashier override",
    description: "Cashiers can override the promotion when store policy allows it.",
  },
  requireManagerApproval: {
    label: "Require manager approval",
    description: "A manager must approve applying or overriding this promotion.",
  },
  displayAtPos: {
    label: "Show this offer at POS",
    description: "The promotion is visible to cashiers during checkout.",
  },
  printOnReceipt: {
    label: "Print promotion on receipt",
    description: "The customer receipt will show the promotion when it is used.",
  },
  allowRepeatedApplications: {
    label: "Repeatable in the same transaction",
    description: "The promotion can activate more than once when the customer buys enough items.",
  },
  excludePriceOverrides: {
    label: "Exclude manually overridden prices",
    description: "Items with a cashier-entered price will not receive this promotion.",
  },
  stopLowerPriority: {
    label: "Stop lower-priority promotions",
    description: "When this promotion applies, lower-priority promotions will not apply to the same items.",
  },
  limitOneUsePerCustomer: {
    label: "Limit to one use per customer",
    description: "Use this for customer-specific promotions that should not repeat.",
  },
  loyaltyRequired: {
    label: "Require loyalty customer",
    description: "Only loyalty customers can receive this promotion.",
  },
  allowEbtProducts: {
    label: "Allow EBT-eligible products",
    description: "EBT-eligible items can participate when they are selected as eligible products.",
  },
  applyBeforeTax: {
    label: "Apply discount before tax",
    description: "Calculate tax after the promotional discount is applied.",
  },
} as const;

function isPromotionType(value: unknown): value is PromotionType {
  return typeof value === "string" && value in fields;
}

function normalizePromotionType(value: unknown): PromotionType {
  if (isPromotionType(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (isPromotionType(normalized)) return normalized;
  }

  if (process.env.NODE_ENV === "development" && value !== undefined && value !== null && value !== "") {
    console.warn("Invalid promotion type received by editor", value);
  }

  return DEFAULT_PROMOTION_TYPE;
}

function getDefaultConfiguration(type: PromotionType) {
  return Object.fromEntries(
    fields[type].map((field) => [field.key, field.defaultValue ?? (field.kind === "boolean" ? false : 0)]),
  ) as Record<string, number | boolean>;
}

function readNumber(configuration: Record<string, number | boolean>, key: string) {
  const value = configuration[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function money(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
}

function validateConfiguration(
  type: PromotionType,
  configuration: Record<string, number | boolean>,
) {
  const errors: Record<string, string> = {};
  for (const field of fields[type]) {
    if (field.kind === "boolean") continue;
    const value = readNumber(configuration, field.key);
    if (value === null) {
      errors[field.key] = field.integer
        ? "Enter a whole number."
        : "Enter an amount.";
      continue;
    }
    if (field.integer && (!Number.isInteger(value) || value < 1)) {
      errors[field.key] = "Enter a whole number of 1 or more.";
      continue;
    }
    if (field.key === "discountPercentage" && (value <= 0 || value > 100)) {
      errors[field.key] = "The discount percentage must be between 1 and 100.";
      continue;
    }
    if (field.max !== undefined && value > field.max) {
      errors[field.key] = `Enter ${field.max} or less.`;
      continue;
    }
    if (field.min !== undefined && value < field.min) {
      errors[field.key] = field.key.toLowerCase().includes("quantity")
        ? "Enter how many items the customer must buy."
        : `Enter ${field.min} or more.`;
      continue;
    }
  }

  return errors;
}

function offerPreview(type: PromotionType, configuration: Record<string, number | boolean>) {
  const number = (key: string) => readNumber(configuration, key);
  const q = (value: number | null) => (value === null ? null : Math.round(value));
  const buyQuantity = q(number("buyQuantity"));
  const rewardQuantity = q(number("rewardQuantity"));
  const discountedQuantity = q(number("discountedQuantity"));
  const requiredQuantity = q(number("requiredQuantity"));
  const minimumQuantity = q(number("minimumQuantity"));
  const discountPercentage = number("discountPercentage");
  const discountAmount = number("discountAmount");
  const bundlePrice = number("bundlePrice");
  const fixedRewardPrice = number("fixedRewardPrice");
  const minimumSpend = number("minimumSpend");
  const promotionalUnitPrice = number("promotionalUnitPrice");

  switch (type) {
    case "BUY_X_GET_Y_FREE":
      return buyQuantity && rewardQuantity
        ? `Buy ${buyQuantity} qualifying item${buyQuantity === 1 ? "" : "s"} and get ${rewardQuantity} free.`
        : null;
    case "BUY_X_GET_Y_PERCENT_OFF":
      return buyQuantity && discountedQuantity && discountPercentage
        ? `Buy ${buyQuantity} qualifying item${buyQuantity === 1 ? "" : "s"} and get ${discountedQuantity} item${discountedQuantity === 1 ? "" : "s"} ${discountPercentage}% off.`
        : null;
    case "BUY_X_GET_Y_FIXED_PRICE":
      return buyQuantity && discountedQuantity && fixedRewardPrice !== null
        ? `Buy ${buyQuantity} qualifying item${buyQuantity === 1 ? "" : "s"} and get ${discountedQuantity} item${discountedQuantity === 1 ? "" : "s"} for ${money(fixedRewardPrice)} each.`
        : null;
    case "QUANTITY_BUNDLE_PRICE":
      return requiredQuantity && bundlePrice !== null
        ? `Choose ${requiredQuantity} qualifying item${requiredQuantity === 1 ? "" : "s"} for ${money(bundlePrice)}.`
        : null;
    case "QUANTITY_PERCENT_OFF":
      return requiredQuantity && discountPercentage
        ? `Buy ${requiredQuantity} qualifying item${requiredQuantity === 1 ? "" : "s"} and receive ${discountPercentage}% off.`
        : null;
    case "FIXED_AMOUNT_OFF_ITEM":
      return minimumQuantity && discountAmount !== null
        ? `Buy ${minimumQuantity} qualifying item${minimumQuantity === 1 ? "" : "s"} and save ${money(discountAmount)} on each item.`
        : null;
    case "PERCENT_OFF_ITEM":
      return minimumQuantity && discountPercentage
        ? `Buy ${minimumQuantity} qualifying item${minimumQuantity === 1 ? "" : "s"} and receive ${discountPercentage}% off each item.`
        : null;
    case "FIXED_AMOUNT_OFF_GROUP":
      return requiredQuantity && discountAmount !== null
        ? `Buy ${requiredQuantity} qualifying item${requiredQuantity === 1 ? "" : "s"} and receive ${money(discountAmount)} off.`
        : null;
    case "MIX_AND_MATCH_BUNDLE":
      return requiredQuantity && bundlePrice !== null
        ? `Choose any ${requiredQuantity} qualifying item${requiredQuantity === 1 ? "" : "s"} for ${money(bundlePrice)}.`
        : null;
    case "SPEND_THRESHOLD_FIXED_OFF":
      return minimumSpend !== null && discountAmount !== null
        ? `Spend ${money(minimumSpend)} on qualifying items and receive ${money(discountAmount)} off.`
        : null;
    case "SPEND_THRESHOLD_PERCENT_OFF":
      return minimumSpend !== null && discountPercentage
        ? `Spend ${money(minimumSpend)} on qualifying items and receive ${discountPercentage}% off.`
        : null;
    case "CUSTOM_PRICE":
      return promotionalUnitPrice !== null
        ? `Selected qualifying items sell for ${money(promotionalUnitPrice)} each.`
        : null;
    default:
      return null;
  }
}

const schema = z
  .object({
    name: z.string().trim().min(1, "Promotion name is required"),
    description: z.string(),
    type: z.enum(promotionTypes),
    startAt: z.string(),
    endAt: z.string(),
    priority: z.number().int().min(0),
    stackable: z.boolean(),
    conflictStrategy: z.enum([
      "PRIORITY",
      "BEST_CUSTOMER_DISCOUNT",
      "BEST_STORE_MARGIN",
    ]),
    internalNotes: z.string(),
    useSeparateRewardProducts: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.startAt && v.endAt && new Date(v.endAt) <= new Date(v.startAt))
      ctx.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "End must be after start",
      });
  });
type Form = z.infer<typeof schema>;
const defaults: Form = {
  name: "",
  description: "",
  type: DEFAULT_PROMOTION_TYPE,
  startAt: "",
  endAt: "",
  priority: 0,
  stackable: false,
  conflictStrategy: "PRIORITY",
  internalNotes: "",
  useSeparateRewardProducts: false,
};

export function PromotionEditor({ mode }: { mode: "new" | "edit" }) {
  return (
    <BackOfficeShell
      activeItem="products"
      requiredPermission="manage_products"
      sectionSidebar={({ theme }) => <ProductsSidebar theme={theme} />}
    >
      {({ theme, selectedStore, account }) => (
        <Content
          mode={mode}
          storeId={selectedStore.id}
          dark={theme === "dark"}
          canActivate={
            account?.role === "owner" ||
            account?.role === "partner" ||
            account?.permissions?.includes("activate_promotions") === true
          }
        />
      )}
    </BackOfficeShell>
  );
}
function Content({
  mode,
  storeId,
  dark,
  canActivate,
}: {
  mode: "new" | "edit";
  storeId: string;
  dark: boolean;
  canActivate: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const id = mode === "edit" ? params.get("id") : null;
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: defaults });
  const type = useWatch({ control, name: "type" });
  const resolvedType = normalizePromotionType(type);
  const separate = useWatch({ control, name: "useSeparateRewardProducts" });
  const promotionName = useWatch({ control, name: "name" });
  const stackable = useWatch({ control, name: "stackable" });
  const [configuration, setConfiguration] = useState<Record<string, number | boolean>>(
    getDefaultConfiguration(DEFAULT_PROMOTION_TYPE),
  );
  const [configurationErrors, setConfigurationErrors] = useState<Record<string, string>>({});
  const [productError, setProductError] = useState("");
  const [qualifying, setQualifying] = useState<PromotionProduct[]>([]);
  const [rewards, setRewards] = useState<PromotionProduct[]>([]);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [message, setMessage] = useState("");
  const [advanced, setAdvanced] = useState({
    allowCashierOverride: false,
    requireManagerApproval: false,
    applyAutomatically: true,
    printOnReceipt: true,
    displayAtPos: true,
    stopLowerPriority: false,
    excludePriceOverrides: true,
    allowRepeatedApplications: true,
    limitOneUsePerCustomer: false,
    loyaltyRequired: false,
    allowEbtProducts: true,
    applyBeforeTax: true,
    maxApplicationsPerTransaction: "" as string,
    maxDiscountedQuantityPerTransaction: "" as string,
  });
  useEffect(() => {
    if (type !== resolvedType) {
      setValue("type", resolvedType, { shouldDirty: false, shouldValidate: true });
    }
  }, [resolvedType, setValue, type]);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setConfiguration((current) => ({ ...getDefaultConfiguration(resolvedType), ...current }));
      setConfigurationErrors({});
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [resolvedType]);
  useEffect(() => {
    if (mode !== "new") return;
    const requestedType = params.get("type");
    if (!requestedType) return;
    setValue("type", normalizePromotionType(requestedType), {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [mode, params, setValue]);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    addEventListener("beforeunload", before);
    return () => removeEventListener("beforeunload", before);
  }, [isDirty]);
  const detail = useQuery({
    queryKey: ["promotion", storeId, id],
    queryFn: () => getPromotion(storeId, id!),
    enabled: Boolean(id),
  });
  useEffect(() => {
    if (!detail.data) return;
    const p = detail.data;
    reset({
      name: p.name,
      description: p.description ?? "",
      type: normalizePromotionType(p.type),
      startAt: local(p.startAt),
      endAt: local(p.endAt),
      priority: p.priority,
      stackable: p.stackable,
      conflictStrategy: p.conflictStrategy,
      internalNotes: p.internalNotes ?? "",
      useSeparateRewardProducts: p.useSeparateRewardProducts,
    });
    // The server record is the external source used to initialize this shared editor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfiguration(p.configuration);
    setQualifying(p.qualifyingProducts);
    setRewards(p.rewardProducts);
    setAdvanced((a) => ({
      ...a,
      allowCashierOverride: p.allowCashierOverride,
      requireManagerApproval: p.requireManagerApproval,
      applyAutomatically: p.applyAutomatically,
      printOnReceipt: p.printOnReceipt,
      displayAtPos: p.displayAtPos,
      stopLowerPriority: p.stopLowerPriority,
      excludePriceOverrides: p.excludePriceOverrides,
      allowRepeatedApplications: p.allowRepeatedApplications,
      limitOneUsePerCustomer: p.limitOneUsePerCustomer,
      loyaltyRequired: p.loyaltyRequired,
      allowEbtProducts: p.allowEbtProducts,
      applyBeforeTax: p.applyBeforeTax,
      maxApplicationsPerTransaction:
        p.maxApplicationsPerTransaction?.toString() ?? "",
      maxDiscountedQuantityPerTransaction:
        p.maxDiscountedQuantityPerTransaction?.toString() ?? "",
    }));
  }, [detail.data, reset]);
  const products = useQuery({
    queryKey: ["promotion-products", storeId, debounced],
    queryFn: () => searchPromotionProducts(storeId, debounced),
    enabled: debounced.length >= 2,
  });
  const save = useMutation({
    mutationFn: ({
      form,
      status,
    }: {
      form: Form;
      status: "DRAFT" | "ACTIVE";
    }) => {
      const payload = {
        ...form,
        status,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
        configuration,
        qualifyingProductIds: qualifying.map((p) => p.id),
        rewardProductIds: separate ? rewards.map((p) => p.id) : [],
        ...advanced,
        maxApplicationsPerTransaction: advanced.maxApplicationsPerTransaction
          ? Number(advanced.maxApplicationsPerTransaction)
          : null,
        maxDiscountedQuantityPerTransaction:
          advanced.maxDiscountedQuantityPerTransaction
            ? Number(advanced.maxDiscountedQuantityPerTransaction)
            : null,
      } as PromotionPayload;
      payload.type = normalizePromotionType(payload.type);
      return id
        ? updatePromotion(storeId, id, payload)
        : createPromotion(storeId, payload);
    },
    onSuccess: (p) => {
      setMessage("Promotion saved.");
      qc.invalidateQueries({ queryKey: ["promotions", storeId] });
      if (!id) router.replace(`/products/promotions/edit?id=${p.id}`);
    },
  });
  const remove = useMutation({
    mutationFn: () => deletePromotion(storeId, id!),
    onSuccess: () => router.push("/products/promotions"),
  });
  const transition = useMutation({
    mutationFn: (action: "activate" | "pause" | "deactivate" | "archive") =>
      transitionPromotion(storeId, id!, action),
    onSuccess: () => {
      detail.refetch();
      qc.invalidateQueries({ queryKey: ["promotions", storeId] });
    },
  });
  const panel = dark
    ? "border-slate-400/15 bg-[#0f172a]"
    : "border-[#ded8f3] bg-white";
  const input = `mt-2 h-11 w-full rounded-[8px] border px-3 text-sm font-semibold outline-none focus:border-[#7c5cff] ${dark ? "border-slate-400/20 bg-slate-900" : "border-[#ded8f3] bg-white"}`;
  const selectedIds = useMemo(
    () => new Set([...qualifying, ...rewards].map((p) => p.id)),
    [qualifying, rewards],
  );
  const customerOffer = offerPreview(resolvedType, configuration);
  const summary = `${promotionName || "This promotion"}: ${promotionTypeMetadata[resolvedType].title.toLowerCase()}. Applies to ${qualifying.length} qualifying product${qualifying.length === 1 ? "" : "s"}${separate ? ` and ${rewards.length} reward products` : ""}. ${stackable ? "Can" : "Cannot"} combine with other promotions.`;
  const submitPromotion = (status: "DRAFT" | "ACTIVE") =>
    handleSubmit((form) => {
      const nextErrors = validateConfiguration(resolvedType, configuration);
      setConfigurationErrors(nextErrors);
      if (!qualifying.length) {
        setProductError("Select at least one eligible product.");
      } else {
        setProductError("");
      }
      if (Object.keys(nextErrors).length || !qualifying.length) return;
      save.mutate({ form: { ...form, type: resolvedType }, status });
    });
  if (mode === "edit" && !id)
    return (
      <div className={`rounded-[8px] border p-8 ${panel}`}>
        Promotion ID is missing.
      </div>
    );
  if (detail.isLoading)
    return (
      <div
        className={`grid min-h-96 place-items-center rounded-[8px] border ${panel}`}
      >
        <LoaderCircle className="animate-spin" />
      </div>
    );
  return (
    <form
      onSubmit={submitPromotion("ACTIVE")}
      className="space-y-4"
    >
      <div className={`rounded-[8px] border p-5 ${panel}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/products/promotions"
              className="grid size-10 place-items-center rounded-[8px] border border-slate-400/25"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">
                {mode === "new" ? "Create Promotion" : "Edit Promotion"}
              </h1>
              {message && (
                <p className="text-sm font-bold text-emerald-500">{message}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {id && canActivate && (
              <button
                type="button"
                onClick={() =>
                  transition.mutate(
                    detail.data?.effectiveStatus === "ACTIVE"
                      ? "pause"
                      : "activate",
                  )
                }
                className="h-10 rounded-[8px] border border-[#7c5cff] px-3 font-bold text-[#7c5cff]"
              >
                {detail.data?.effectiveStatus === "ACTIVE"
                  ? "Pause"
                  : "Activate"}
              </button>
            )}
            <button
              type="button"
              onClick={submitPromotion("DRAFT")}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#7c5cff] px-3 font-bold text-[#7c5cff]"
            >
              <Save className="size-4" />
              Save as Draft
            </button>
            <button
              disabled={save.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#4f2df2] px-3 font-bold text-white"
            >
              {save.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save
            </button>
            {id && (
              <button
                type="button"
                onClick={() =>
                  confirm("Delete or archive this promotion?") &&
                  remove.mutate()
                }
                className="grid size-10 place-items-center rounded-[8px] border border-red-500 text-red-500"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </div>
        {save.error && (
          <p className="mt-3 text-sm font-bold text-red-500">
            {save.error.message}
          </p>
        )}
      </div>
      <Card title="1. Promotion name" panel={panel}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Promotion name" error={errors.name?.message}>
            <input {...register("name")} className={input} />
          </Field>
          <Field label="Description">
            <textarea
              {...register("description")}
              className={`${input} h-24 py-3`}
            />
          </Field>
          <Field label="Internal notes">
            <textarea
              {...register("internalNotes")}
              className={`${input} h-24 py-3`}
            />
          </Field>
        </div>
      </Card>
      <Card title="2. Choose the deal type" panel={panel}>
        <p className="mb-3 text-sm font-semibold text-slate-500">
          Choose how the customer should receive the discount.
        </p>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {promotionTypes.map((promotionType) => (
            <DealTypeCard
              key={promotionType}
              type={promotionType}
              selected={promotionType === resolvedType}
              onSelect={() => setValue("type", promotionType, { shouldDirty: true, shouldValidate: true })}
            />
          ))}
        </div>
      </Card>
      <Card title="3. Configure the offer" panel={panel}>
        <div className="grid gap-4 md:grid-cols-3">
          {fields[resolvedType].map((field) =>
            field.kind === "boolean" ? (
              <Check
                key={field.key}
                label={field.label}
                description={field.helper}
                checked={configuration[field.key] === true}
                onChange={(v) => setConfiguration((c) => ({ ...c, [field.key]: v }))}
              />
            ) : (
              <Field key={field.key} label={field.label} helper={field.helper} error={configurationErrors[field.key]}>
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step ?? "0.01"}
                  value={
                    typeof configuration[field.key] === "number" &&
                    Number.isFinite(configuration[field.key])
                      ? String(configuration[field.key])
                      : ""
                  }
                  onChange={(e) =>
                    setConfiguration((c) => ({
                      ...c,
                      [field.key]: e.target.value === "" ? Number.NaN : Number(e.target.value),
                    }))
                  }
                  className={input}
                />
              </Field>
            ),
          )}
        </div>
        <div className={`mt-4 rounded-[8px] border p-4 ${dark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]"}`}>
          <h3 className="text-sm font-extrabold">Customer offer</h3>
          <p className={`mt-2 text-sm font-semibold leading-6 ${dark ? "text-slate-300" : "text-slate-600"}`}>
            {customerOffer ?? "Complete the promotion details to preview the customer offer."}
          </p>
        </div>
      </Card>
      <Card title="4. Choose eligible products" panel={panel}>
        <ProductFinder
          search={search}
          setSearch={setSearch}
          products={products.data?.items ?? []}
          loading={products.isFetching}
          selected={qualifying}
          selectedIds={selectedIds}
          input={input}
          onAdd={(p) =>
            setQualifying((s) => (s.some((x) => x.id === p.id) ? s : [...s, p]))
          }
          onRemove={(id) => setQualifying((s) => s.filter((p) => p.id !== id))}
        />
        {productError && (
          <p className="mt-2 text-sm font-bold text-red-500">{productError}</p>
        )}
        <div className="mt-4">
          <Check
            label="Use different reward products"
            description="Turn this on when the discounted or free item is different from the items the customer buys."
            checked={separate}
            register={register("useSeparateRewardProducts")}
          />
        </div>
      </Card>
      {separate && (
        <Card title="4a. Choose reward products" panel={panel}>
          <ProductFinder
            search={search}
            setSearch={setSearch}
            products={products.data?.items ?? []}
            loading={products.isFetching}
            selected={rewards}
            selectedIds={selectedIds}
            input={input}
            onAdd={(p) =>
              setRewards((s) => (s.some((x) => x.id === p.id) ? s : [...s, p]))
            }
            onRemove={(id) => setRewards((s) => s.filter((p) => p.id !== id))}
          />
        </Card>
      )}
      <Card title="5. Schedule and limits" panel={panel}>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Start date and time" error={errors.startAt?.message}>
            <input
              type="datetime-local"
              {...register("startAt")}
              className={input}
            />
          </Field>
          <Field label="End date and time" error={errors.endAt?.message}>
            <input
              type="datetime-local"
              {...register("endAt")}
              className={input}
            />
          </Field>
          <Field label="Priority">
            <input
              type="number"
              min="0"
                {...register("priority", { valueAsNumber: true })}
              className={input}
            />
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Check
            label="Can combine with other promotions"
            description="Allow this promotion to apply with other eligible promotions in the same sale."
            checked={stackable}
            register={register("stackable")}
          />
          {(
            [
              "applyAutomatically",
              "allowCashierOverride",
              "requireManagerApproval",
              "displayAtPos",
              "printOnReceipt",
              "allowRepeatedApplications",
              "excludePriceOverrides",
              "stopLowerPriority",
              "limitOneUsePerCustomer",
              "loyaltyRequired",
              "allowEbtProducts",
              "applyBeforeTax",
            ] as const
          ).map((key) => (
            <Check
              key={key}
              label={advancedLabels[key].label}
              description={advancedLabels[key].description}
              checked={Boolean(advanced[key])}
              onChange={(v) => setAdvanced((a) => ({ ...a, [key]: v }))}
            />
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="Conflict strategy">
            <select {...register("conflictStrategy")} className={input}>
              <option value="PRIORITY">Priority</option>
              <option value="BEST_CUSTOMER_DISCOUNT">
                Best customer discount
              </option>
              <option value="BEST_STORE_MARGIN">Best store margin</option>
            </select>
          </Field>
          <Field label="Maximum applications">
            <input
              type="number"
              min="1"
              value={advanced.maxApplicationsPerTransaction}
              onChange={(e) =>
                setAdvanced((a) => ({
                  ...a,
                  maxApplicationsPerTransaction: e.target.value,
                }))
              }
              className={input}
            />
          </Field>
          <Field label="Maximum discounted quantity">
            <input
              type="number"
              min="1"
              value={advanced.maxDiscountedQuantityPerTransaction}
              onChange={(e) =>
                setAdvanced((a) => ({
                  ...a,
                  maxDiscountedQuantityPerTransaction: e.target.value,
                }))
              }
              className={input}
            />
          </Field>
        </div>
      </Card>
      <Card title="6. Review the customer offer" panel={panel}>
        <p className="text-sm font-extrabold text-[#7c5cff]">Customer offer</p>
        <p className="mt-2 font-semibold leading-7">{customerOffer ?? "Complete the promotion details to preview the customer offer."}</p>
        <p className="font-semibold leading-7">{summary}</p>
      </Card>
      <Card title="7. Save promotion" panel={panel}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={submitPromotion("DRAFT")}
            className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#7c5cff] px-3 font-bold text-[#7c5cff]"
          >
            <Save className="size-4" />
            Save as Draft
          </button>
          <button
            disabled={save.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#4f2df2] px-3 font-bold text-white"
          >
            {save.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save promotion
          </button>
        </div>
      </Card>
    </form>
  );
}
function Card({
  title,
  panel,
  children,
}: {
  title: string;
  panel: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-[8px] border p-5 ${panel}`}>
      <h2 className="mb-4 text-lg font-extrabold">{title}</h2>
      {children}
    </section>
  );
}
function DealTypeCard({
  type,
  selected,
  onSelect,
}: {
  type: PromotionType;
  selected: boolean;
  onSelect: () => void;
}) {
  const metadata = promotionTypeMetadata[type];
  const Icon = promotionTypeIcons[type];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group relative flex h-20 items-center gap-3 rounded-[8px] border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#7c5cff]/60 ${
        selected
          ? "border-[#4f2df2] bg-[#4f2df2]/10 shadow-[0_8px_18px_rgba(79,45,242,0.12)]"
          : "border-slate-400/20 hover:border-[#7c5cff] hover:bg-[#7c5cff]/5"
      }`}
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-[8px] ${selected ? "bg-[#4f2df2] text-white" : "bg-[#7c5cff]/10 text-[#7c5cff]"}`}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 pr-8">
        <span className="block truncate text-sm font-extrabold">{metadata.title}</span>
        <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{metadata.shortDescription}</span>
      </span>
      {selected && (
        <CheckCircle2 className="absolute right-3 top-3 size-4 text-[#4f2df2]" aria-label="Selected deal type" />
      )}
      <span
        className="absolute bottom-3 right-3 grid size-5 place-items-center rounded-full text-slate-500 transition hover:bg-slate-400/10 hover:text-[#4f2df2]"
        aria-label={`More information about ${metadata.title}`}
      >
        <Info className="size-4" aria-hidden="true" />
      </span>
      <span className="pointer-events-none absolute bottom-[calc(100%+8px)] right-0 z-20 hidden w-72 rounded-[8px] border border-slate-400/20 bg-white p-3 text-xs font-semibold leading-5 text-slate-700 shadow-[0_18px_42px_rgba(15,23,42,0.18)] group-hover:block group-focus-visible:block dark:bg-[#0f172a] dark:text-slate-200">
        <span className="block font-extrabold">{metadata.title}</span>
        <span className="mt-1 block">{metadata.description}</span>
        <span className="mt-2 block">Example: {metadata.example}</span>
        <span className="mt-2 block text-slate-500">{metadata.limitation}</span>
      </span>
    </button>
  );
}
function Field({
  label,
  helper,
  error,
  children,
}: {
  label: string;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      {children}
      {helper && (
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{helper}</span>
      )}
      {error && (
        <span className="mt-1 block text-xs text-red-500">{error}</span>
      )}
    </label>
  );
}
function Check({
  label,
  description,
  checked,
  onChange,
  register,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  register?: ReturnType<ReturnType<typeof useForm<Form>>["register"]>;
}) {
  return (
    <label className="flex items-start gap-3 rounded-[8px] border border-slate-400/20 p-3 text-sm font-bold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        {...register}
        className="mt-1 size-4 accent-[#4f2df2]"
      />
      <span>
        <span className="block">{label}</span>
        {description && (
          <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{description}</span>
        )}
      </span>
    </label>
  );
}
function ProductFinder({
  search,
  setSearch,
  products,
  loading,
  selected,
  selectedIds,
  input,
  onAdd,
  onRemove,
}: {
  search: string;
  setSearch: (v: string) => void;
  products: PromotionProduct[];
  loading: boolean;
  selected: PromotionProduct[];
  selectedIds: Set<string>;
  input: string;
  onAdd: (p: PromotionProduct) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-5 size-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search number, barcode, name, department, category, price group or NACS"
          className={`${input} pl-9`}
        />
        {loading && (
          <LoaderCircle className="absolute right-3 top-5 size-4 animate-spin" />
        )}
      </div>
      {search.length >= 2 && (
        <div className="mt-3 max-h-56 overflow-auto rounded-[8px] border border-slate-400/20">
          {products.map((p) => (
            <button
              type="button"
              disabled={selectedIds.has(p.id)}
              onClick={() => onAdd(p)}
              key={p.id}
              className="flex w-full items-center justify-between border-b border-slate-400/15 px-3 py-2 text-left text-sm hover:bg-[#7c5cff]/10 disabled:opacity-40"
            >
              <span>
                <b>
                  #{p.productNumber} {p.name}
                </b>
                <small className="block text-slate-500">
                  {p.barcode} · {p.department?.name ?? "No department"} · $
                  {p.unitRetail.toFixed(2)}
                </small>
              </span>
              <Plus className="size-4" />
            </button>
          ))}
        </div>
      )}
      <div className="mt-4">
        <h3 className="font-extrabold">
          Selected products ({selected.length})
        </h3>
        {!selected.length ? (
          <p className="mt-2 text-sm text-slate-500">No products selected.</p>
        ) : (
          <div className="mt-2 max-h-56 overflow-auto rounded-[8px] border border-slate-400/20">
            {selected.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between border-b border-slate-400/15 px-3 py-2 text-sm"
              >
                <span>
                  #{p.productNumber} <b>{p.name}</b>
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(p.id)}
                  aria-label={`Remove ${p.name}`}
                >
                  <X className="size-4 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
function local(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
