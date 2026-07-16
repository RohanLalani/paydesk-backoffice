import { apiClient } from "@/src/lib/apiClient";

export type ProductSaleType = "piece" | "weight" | "meat_barcode" | "service" | "lottery" | "other";
export type TaxStyle = "pre_discount" | "post_discount";

export type ProductReference = {
  id: string;
  name: string;
  rate?: number;
  defaultTaxId?: string | null;
  defaultTax?: ProductReference | null;
  defaultAllowEbt?: boolean;
  allowEbt?: boolean;
  trackInventory?: boolean;
  allowNegativeInventorySales?: boolean;
  minimumAge?: DepartmentMinimumAge;
  defaultRetailMargin?: number | null;
  isActive?: boolean;
};

export type DepartmentType = "merchandise" | "lottery" | "fuel" | "misc_services";
export type DepartmentMinimumAge = "none" | "age_18" | "age_18_time_sensitive" | "age_21" | "age_21_time_sensitive";

export type Department = {
  id: string;
  storeId: string;
  name: string;
  posDepartmentNumber: number;
  type: DepartmentType;
  defaultTaxId: string | null;
  defaultTax?: ProductReference | null;
  minimumAge: DepartmentMinimumAge;
  defaultRetailMargin: number | null;
  minimumRingUpAmount: number | null;
  maximumRingUpAmount: number | null;
  trackInventory: boolean;
  allowNegativeInventorySales: boolean;
  allowEbt: boolean;
  defaultAllowEbt: boolean;
  allowManualRingUp: boolean;
  onPos: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
};

export type CreateDepartmentInput = {
  name: string;
  posDepartmentNumber: number;
  type: DepartmentType;
  defaultTaxId: string;
  minimumAge: DepartmentMinimumAge;
  defaultRetailMargin: number | null;
  minimumRingUpAmount: number | null;
  maximumRingUpAmount: number | null;
  trackInventory: boolean;
  allowNegativeInventorySales: boolean;
  allowEbt: boolean;
  allowManualRingUp: boolean;
  onPos: boolean;
  isActive: boolean;
};

export type UpdateDepartmentInput = Partial<CreateDepartmentInput>;

export type DepartmentCollection = {
  items: Department[];
  total: number;
  page: number;
  limit: number;
};

export type ProductRecord = {
  id: string;
  barcode: string;
  name: string;
  saleType: ProductSaleType;
  currentQuantity: number;
  unitsPerCase: number | null;
  caseCost: number | null;
  caseDiscount: number;
  discountPerUnit: number | null;
  caseRebate: number;
  rebatePerUnit: number | null;
  unitCost: number | null;
  unitCostAfterDiscountAndRebate: number | null;
  unitRetail: number;
  onlineRetailPrice: number | null;
  unitOfMeasure: string | null;
  size: string | null;
  margin: number | null;
  defaultMargin: number | null;
  maxInventory: number | null;
  minInventory: number | null;
  minimumAge: number | null;
  nacsCode: string | null;
  nacsCategory: string | null;
  nacsSubCategory: string | null;
  blueLaw: boolean;
  kitchenPrint: boolean;
  allowEbt: boolean;
  trackInventory: boolean;
  allowNegativeInventory: boolean;
  taxStyle: TaxStyle;
  isActive: boolean;
  storeId: string;
  departmentId: string;
  department?: ProductReference | null;
  priceGroupId: string | null;
  productCategoryId: string | null;
  taxId: string;
  updatedAt?: string;
};

export type ProductPayload = Omit<
  ProductRecord,
  | "id"
  | "discountPerUnit"
  | "rebatePerUnit"
  | "unitCost"
  | "unitCostAfterDiscountAndRebate"
  | "margin"
  | "currentQuantity"
  | "updatedAt"
  | "taxId"
  | "department"
>;

export type BarcodeLookupResponse =
  | { found: true; product: ProductRecord }
  | { found: false; barcode: string };

export async function lookupProductByBarcode(storeId: string, barcode: string) {
  return apiClient<BarcodeLookupResponse>(
    `/product/stores/${storeId}/products/barcode/${encodeURIComponent(barcode)}`,
  );
}

export async function createProduct(storeId: string, payload: ProductPayload) {
  return apiClient<ProductRecord>(`/product/stores/${storeId}/products`, {
    method: "POST",
    body: payload,
  });
}

export async function updateProduct(storeId: string, productId: string, payload: Partial<ProductPayload>) {
  return apiClient<ProductRecord>(`/product/stores/${storeId}/products/${productId}`, {
    method: "PATCH",
    body: payload,
  });
}

function normalizeDepartmentCollection(response: Department[] | DepartmentCollection) {
  return Array.isArray(response) ? response : response.items;
}

function departmentSearchParams(query: { active?: boolean; search?: string; limit?: number } = {}) {
  const params = new URLSearchParams({
    sort: "name",
    order: "asc",
    limit: String(query.limit ?? 100),
  });

  if (query.active !== undefined) {
    params.set("active", String(query.active));
  }

  if (query.search) {
    params.set("search", query.search);
  }

  return params;
}

export async function getDepartments(storeId: string) {
  const response = await apiClient<Department[] | DepartmentCollection>(
    `/stores/${storeId}/departments?${departmentSearchParams({ active: true }).toString()}`,
  );

  return normalizeDepartmentCollection(response);
}

export async function getStoreDepartments(storeId: string, query: { active?: boolean; search?: string } = {}) {
  const response = await apiClient<Department[] | DepartmentCollection>(
    `/stores/${storeId}/departments?${departmentSearchParams(query).toString()}`,
  );

  return normalizeDepartmentCollection(response);
}

export function createDepartment(storeId: string, payload: CreateDepartmentInput) {
  return apiClient<Department>(`/stores/${storeId}/departments`, {
    method: "POST",
    body: payload,
  });
}

export function updateDepartment(storeId: string, departmentId: string, payload: UpdateDepartmentInput) {
  return apiClient<Department>(`/stores/${storeId}/departments/${departmentId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function getProductCategories(storeId: string) {
  return apiClient<ProductReference[]>(`/product/category/store/${storeId}`);
}

export function getPriceGroups(storeId: string) {
  return apiClient<ProductReference[]>(`/product/price-group/store/${storeId}`);
}

export function getTaxes(storeId: string) {
  return apiClient<ProductReference[]>(`/product/tax/store/${storeId}`);
}
