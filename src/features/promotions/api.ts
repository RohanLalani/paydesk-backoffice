import { apiClient } from "@/src/lib/apiClient";

export const promotionTypes = [
  "BUY_X_GET_Y_FREE",
  "BUY_X_GET_Y_PERCENT_OFF",
  "BUY_X_GET_Y_FIXED_PRICE",
  "QUANTITY_BUNDLE_PRICE",
  "QUANTITY_PERCENT_OFF",
  "FIXED_AMOUNT_OFF_ITEM",
  "PERCENT_OFF_ITEM",
  "FIXED_AMOUNT_OFF_GROUP",
  "MIX_AND_MATCH_BUNDLE",
  "SPEND_THRESHOLD_FIXED_OFF",
  "SPEND_THRESHOLD_PERCENT_OFF",
  "CUSTOM_PRICE",
] as const;
export type PromotionType = (typeof promotionTypes)[number];
export type PromotionStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "ACTIVE"
  | "PAUSED"
  | "EXPIRED"
  | "INACTIVE"
  | "ARCHIVED";
export type PromotionProduct = {
  id: string;
  productNumber: number;
  barcode: string;
  name: string;
  unitCost: number | null;
  unitRetail: number;
  currentQuantity: number;
  isActive: boolean;
  department?: { name: string };
  productCategory?: { name: string };
  priceGroup?: { name: string };
};
export type Promotion = {
  id: string;
  name: string;
  description: string | null;
  type: PromotionType;
  status: PromotionStatus;
  effectiveStatus: PromotionStatus;
  startAt: string | null;
  endAt: string | null;
  priority: number;
  stackable: boolean;
  conflictStrategy: "PRIORITY" | "BEST_CUSTOMER_DISCOUNT" | "BEST_STORE_MARGIN";
  configuration: Record<string, number | boolean>;
  internalNotes: string | null;
  useSeparateRewardProducts: boolean;
  qualifyingProducts: PromotionProduct[];
  rewardProducts: PromotionProduct[];
  productCount?: number;
  updatedAt: string;
  allowCashierOverride: boolean;
  requireManagerApproval: boolean;
  applyAutomatically: boolean;
  printOnReceipt: boolean;
  displayAtPos: boolean;
  stopLowerPriority: boolean;
  excludePriceOverrides: boolean;
  allowRepeatedApplications: boolean;
  maxApplicationsPerTransaction: number | null;
  maxDiscountedQuantityPerTransaction: number | null;
  limitOneUsePerCustomer: boolean;
  loyaltyRequired: boolean;
  allowEbtProducts: boolean;
  applyBeforeTax: boolean;
};
export type PromotionPayload = Omit<
  Promotion,
  | "id"
  | "effectiveStatus"
  | "qualifyingProducts"
  | "rewardProducts"
  | "productCount"
  | "updatedAt"
> & { qualifyingProductIds: string[]; rewardProductIds: string[] };
export type PromotionList = {
  items: Promotion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
export type ProductSearch = {
  items: PromotionProduct[];
  total: number;
  page: number;
  totalPages: number;
};
const query = (
  params: Record<string, string | number | boolean | undefined>,
) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  return search.toString();
};
export const listPromotions = (
  storeId: string,
  params: Record<string, string | number | boolean | undefined>,
) => apiClient<PromotionList>(`/stores/${storeId}/promotions?${query(params)}`);
export const getPromotion = (storeId: string, id: string) =>
  apiClient<Promotion>(`/stores/${storeId}/promotions/${id}`);
export const createPromotion = (storeId: string, payload: PromotionPayload) =>
  apiClient<Promotion>(`/stores/${storeId}/promotions`, {
    method: "POST",
    body: payload,
  });
export const updatePromotion = (
  storeId: string,
  id: string,
  payload: PromotionPayload,
) =>
  apiClient<Promotion>(`/stores/${storeId}/promotions/${id}`, {
    method: "PATCH",
    body: payload,
  });
export const deletePromotion = (storeId: string, id: string) =>
  apiClient(`/stores/${storeId}/promotions/${id}`, { method: "DELETE" });
export const transitionPromotion = (
  storeId: string,
  id: string,
  action: "activate" | "pause" | "deactivate" | "archive",
) =>
  apiClient<Promotion>(`/stores/${storeId}/promotions/${id}/${action}`, {
    method: "POST",
  });
export const searchPromotionProducts = (
  storeId: string,
  search: string,
  page = 1,
) =>
  apiClient<ProductSearch>(
    `/stores/${storeId}/promotions/product-search?${query({ search, page, limit: 25 })}`,
  );
