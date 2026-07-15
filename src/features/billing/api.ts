import { apiClient } from "@/src/lib/apiClient";

export type LoyaltyServiceStatus =
  | "not_added"
  | "pending"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired";

export type LoyaltyService = {
  key: "LOYALTY";
  name: string;
  description: string;
  priceLabel: string;
  status: LoyaltyServiceStatus;
  active: boolean;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
};

export type StoreServicesResponse = {
  storeId: string;
  services: {
    loyalty: LoyaltyService;
  };
};

export type StoreBillingSummary = {
  storeId: string;
  basePlan: "plus" | "advanced" | null;
  baseMonthlyAmount: number;
  loyalty: LoyaltyService;
  loyaltyMonthlyAmount: number;
  estimatedMonthlyTotal: number;
  subscriptionStatus: string | null;
  nextBillingDate?: string | null;
  cancelAtPeriodEnd: boolean;
};

export function getStoreServices(storeId: string) {
  return apiClient<StoreServicesResponse>(`/billing/stores/${storeId}/services`, {
    method: "GET",
  });
}

export function addLoyaltyService(storeId: string) {
  return apiClient<{ storeId: string; service: LoyaltyService }>(`/billing/stores/${storeId}/services`, {
    method: "POST",
    body: { service: "LOYALTY", confirmed: true },
  });
}

export function removeLoyaltyService(storeId: string) {
  return apiClient<{ storeId: string; service: LoyaltyService }>(`/billing/stores/${storeId}/services/loyalty`, {
    method: "DELETE",
  });
}

export function getStoreBillingSummary(storeId: string) {
  return apiClient<StoreBillingSummary>(`/billing/stores/${storeId}/summary`, {
    method: "GET",
  });
}
