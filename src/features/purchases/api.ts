import { apiClient } from "@/src/lib/apiClient";

export type PurchaseType = "CASH_DAILY" | "CHECK" | "CREDIT";
export type PurchaseStatus = "DRAFT" | "OPEN" | "VERIFIED" | "VOIDED";
export type PurchaseSortField =
  | "purchaseDate"
  | "payee"
  | "invoiceNumber"
  | "type"
  | "costSubtotal"
  | "retailTotal"
  | "totalCost"
  | "margin";

export type Payee = {
  id: string;
  storeId: string;
  name: string;
  accountNumber: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PayeeCollection = {
  items: Payee[];
  total: number;
  page: number;
  limit: number;
};

export type PurchaseListItem = {
  id: string;
  purchaseNumber: number;
  invoiceNumber: string;
  purchaseDate: string;
  type: PurchaseType;
  status: PurchaseStatus;
  payee: { id: string; name: string };
  costSubtotal: string;
  retailTotal: string;
  totalCost: string;
  marginPercent: string | null;
  createdAt: string;
};

export type PurchaseListResponse = {
  items: PurchaseListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  totals: {
    costSubtotal: string;
    retailTotal: string;
    totalCost: string;
    marginPercent: string | null;
  };
};

export type PurchaseDetail = {
  id: string;
  purchaseNumber: number;
  invoiceNumber: string;
  purchaseDate: string;
  type: PurchaseType;
  status: PurchaseStatus;
  referenceNumber: string | null;
  notes: string | null;
  payee: Payee;
  costSubtotal: string;
  retailTotal: string;
  freightAmount: string;
  feeAmount: string;
  taxAmount: string;
  discountAmount: string;
  rebateAmount: string;
  totalCost: string;
  marginPercent: string | null;
  lineCount: number;
  totalUnits: number;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitCost: string;
    extendedCost: string;
    unitRetailSnapshot: string;
    extendedRetail: string;
    productNumberSnapshot: number | null;
    barcodeSnapshot: string | null;
    productNameSnapshot: string | null;
    product: {
      id: string;
      productNumber: number;
      barcode: string;
      name: string;
    };
  }>;
  createdBy: { id: string; name: string | null; email: string; role: string } | null;
  updatedBy: { id: string; name: string | null; email: string; role: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseListQuery = {
  search?: string;
  payeeId?: string;
  type?: PurchaseType;
  status?: PurchaseStatus;
  dateFrom?: string;
  dateTo?: string;
  sort?: PurchaseSortField;
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type CreatePurchaseLineItemInput = {
  productId?: string;
  barcode?: string;
  description?: string;
  quantity: number;
  unitsPerCase?: number | null;
  caseCost?: string | null;
  caseDiscount?: string | null;
  unitCost?: string | null;
  currentRetail?: string | null;
  newRetail?: string | null;
  rebate?: string | null;
  departmentId?: string | null;
  priceGroupId?: string | null;
  categoryId?: string | null;
  entryType?: "purchase" | "return";
};

export type CreatePurchaseExpenseInput = {
  description: string;
  amount: string;
  departmentId?: string | null;
};

export type CreatePurchaseInput = {
  purchaseDate: string;
  payeeId: string;
  invoiceNumber: string;
  purchaseType: PurchaseType;
  status?: PurchaseStatus;
  manualEntry?: {
    defaultMargin?: string | null;
    cost?: string | null;
    retail?: string | null;
    margin?: string | null;
    departmentId?: string | null;
  };
  lineItems?: CreatePurchaseLineItemInput[];
  expenses?: CreatePurchaseExpenseInput[];
};

export function listStorePayees(
  storeId: string,
  query: { active?: boolean; search?: string; page?: number; limit?: number } = {},
) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 100),
  });

  if (query.active !== undefined) params.set("active", String(query.active));
  if (query.search?.trim()) params.set("search", query.search.trim());

  return apiClient<PayeeCollection>(`/stores/${storeId}/payees?${params.toString()}`);
}

export function listStorePurchases(storeId: string, query: PurchaseListQuery = {}) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 25),
    sort: query.sort ?? "purchaseDate",
    order: query.order ?? "desc",
  });

  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.payeeId) params.set("payeeId", query.payeeId);
  if (query.type) params.set("type", query.type);
  if (query.status) params.set("status", query.status);
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);

  return apiClient<PurchaseListResponse>(`/stores/${storeId}/purchases?${params.toString()}`);
}

export function getStorePurchase(storeId: string, purchaseId: string) {
  return apiClient<PurchaseDetail>(`/stores/${storeId}/purchases/${purchaseId}`);
}

export function createStorePurchase(storeId: string, payload: CreatePurchaseInput) {
  return apiClient<PurchaseDetail>(`/stores/${storeId}/purchases`, {
    method: "POST",
    body: payload,
  });
}
