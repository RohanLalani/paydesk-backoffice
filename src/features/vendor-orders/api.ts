import { apiClient } from "@/src/lib/apiClient";

export type VendorOrderStatus =
  | "DRAFT"
  | "READY"
  | "SENT"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export type ProductVendor = {
  id: string;
  storeId: string;
  productId: string;
  payeeId: string;
  vendorSku: string | null;
  unitsPerCase: number;
  caseCost: string;
  caseDiscount: string;
  minOrderQuantity: number | null;
  leadTimeDays: number | null;
  isPreferred: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    productNumber: number;
    barcode: string;
    name: string;
    currentQuantity: number;
    minInventory: number | null;
    maxInventory: number | null;
  };
  payee: {
    id: string;
    name: string;
    isActive: boolean;
  };
};

export type VendorOrderItem = {
  id: string;
  productId: string;
  productVendorId: string | null;
  quantityOrdered: number;
  quantityReceived: number;
  unitsPerCase: number;
  caseCost: string;
  caseDiscount: string;
  unitCost: string;
  extendedCost: string;
  vendorSkuSnapshot: string | null;
  productNumberSnapshot: number | null;
  barcodeSnapshot: string | null;
  productNameSnapshot: string | null;
  product: {
    id: string;
    productNumber: number;
    barcode: string;
    name: string;
    currentQuantity: number;
  };
};

export type VendorOrder = {
  id: string;
  storeId: string;
  payeeId: string;
  status: VendorOrderStatus;
  estimatedCost: string;
  purchaseId: string | null;
  notes: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  payee: {
    id: string;
    name: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
  };
  purchase?: {
    id: string;
    purchaseNumber: number;
    invoiceNumber: string;
  } | null;
  items: VendorOrderItem[];
};

export type VendorOrderGenerationResult = {
  orders: VendorOrder[];
  skipped: Array<{
    productId: string;
    productName: string;
    reason: string;
  }>;
  generatedAt: string;
};

export type ProductVendorInput = {
  productId: string;
  payeeId: string;
  vendorSku?: string | null;
  unitsPerCase: number;
  caseCost: string;
  caseDiscount?: string | null;
  minOrderQuantity?: number | null;
  leadTimeDays?: number | null;
  isPreferred?: boolean;
  isActive?: boolean;
};

export type GenerateVendorOrdersInput = {
  lookbackDays?: number;
  coverageDays?: number;
  onlyBelowMin?: boolean;
};

export type UpdateVendorOrderInput = {
  status?: VendorOrderStatus;
  notes?: string | null;
  items?: Array<{
    id?: string;
    productId?: string;
    productVendorId?: string | null;
    quantityOrdered?: number;
    caseCost?: string;
    caseDiscount?: string;
    unitsPerCase?: number;
    remove?: boolean;
  }>;
};

export type ReceiveVendorOrderInput = {
  items: Array<{
    id: string;
    quantityReceived: number;
  }>;
};

export function listProductVendors(
  storeId: string,
  query: { search?: string; active?: boolean; payeeId?: string; page?: number; limit?: number } = {},
) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 50),
  });

  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.active !== undefined) params.set("active", String(query.active));
  if (query.payeeId) params.set("payeeId", query.payeeId);

  return apiClient<{ items: ProductVendor[]; total: number; page: number; limit: number }>(
    `/stores/${storeId}/product-vendors?${params.toString()}`,
  );
}

export function createProductVendor(storeId: string, payload: ProductVendorInput) {
  return apiClient<ProductVendor>(`/stores/${storeId}/product-vendors`, {
    method: "POST",
    body: payload,
  });
}

export function updateProductVendor(storeId: string, productVendorId: string, payload: Partial<ProductVendorInput>) {
  return apiClient<ProductVendor>(`/stores/${storeId}/product-vendors/${productVendorId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteProductVendor(storeId: string, productVendorId: string) {
  return apiClient<{ success: boolean }>(`/stores/${storeId}/product-vendors/${productVendorId}`, {
    method: "DELETE",
  });
}

export function listVendorOrders(
  storeId: string,
  query: { status?: VendorOrderStatus | "ALL"; page?: number; limit?: number } = {},
) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 25),
  });

  if (query.status && query.status !== "ALL") params.set("status", query.status);

  return apiClient<{ items: VendorOrder[]; total: number; page: number; limit: number }>(
    `/stores/${storeId}/vendor-orders?${params.toString()}`,
  );
}

export function generateVendorOrders(storeId: string, payload: GenerateVendorOrdersInput) {
  return apiClient<VendorOrderGenerationResult>(`/stores/${storeId}/vendor-orders/generate`, {
    method: "POST",
    body: payload,
  });
}

export function updateVendorOrder(storeId: string, orderId: string, payload: UpdateVendorOrderInput) {
  return apiClient<VendorOrder>(`/stores/${storeId}/vendor-orders/${orderId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function sendVendorOrder(storeId: string, orderId: string) {
  return apiClient<VendorOrder>(`/stores/${storeId}/vendor-orders/${orderId}/send`, {
    method: "POST",
  });
}

export function receiveVendorOrder(storeId: string, orderId: string, payload: ReceiveVendorOrderInput) {
  return apiClient<VendorOrder>(`/stores/${storeId}/vendor-orders/${orderId}/receive`, {
    method: "POST",
    body: payload,
  });
}
