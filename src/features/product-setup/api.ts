import { apiClient } from "@/src/lib/apiClient";

export type InventoryAdjustmentReason = {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InventoryAdjustmentReasonCollection = {
  items: InventoryAdjustmentReason[];
  total: number;
};

export type CreateInventoryAdjustmentReasonInput = {
  name: string;
  description?: string | null;
};

export type RefundReason = {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  returnToInventory: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RefundReasonCollection = {
  items: RefundReason[];
  total: number;
};

export type CreateRefundReasonInput = {
  name: string;
  description?: string | null;
  returnToInventory: boolean;
};

export function getInventoryAdjustmentReasons(storeId: string) {
  return apiClient<InventoryAdjustmentReasonCollection>(
    `/stores/${storeId}/inventory-adjustment-reasons`,
  );
}

export function createInventoryAdjustmentReason(
  storeId: string,
  payload: CreateInventoryAdjustmentReasonInput,
) {
  return apiClient<InventoryAdjustmentReason>(
    `/stores/${storeId}/inventory-adjustment-reasons`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export function getRefundReasons(storeId: string) {
  return apiClient<RefundReasonCollection>(
    `/stores/${storeId}/refund-reasons`,
  );
}

export function createRefundReason(
  storeId: string,
  payload: CreateRefundReasonInput,
) {
  return apiClient<RefundReason>(`/stores/${storeId}/refund-reasons`, {
    method: "POST",
    body: payload,
  });
}
