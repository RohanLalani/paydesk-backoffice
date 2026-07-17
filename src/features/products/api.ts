import { apiClient } from "@/src/lib/apiClient";

export type ProductSaleType = "piece" | "weight" | "meat_barcode" | "service" | "lottery" | "other";
export type TaxStyle = "pre_discount" | "post_discount";

export type ProductReference = {
  id: string;
  name: string;
  rate?: number;
  surchargeAmount?: string;
  defaultUnitRetail?: string;
  departmentId?: string | null;
  departmentName?: string | null;
  posDepartmentNumber?: number | null;
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

export type TaxRecord = {
  id: string;
  storeId: string;
  name: string;
  rate: string;
  surchargeAmount: string;
  isActive: boolean;
  departmentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TaxCollection = {
  items: TaxRecord[];
  total: number;
  page: number;
  limit: number;
};

export type TaxPayload = {
  name: string;
  rate: string;
  surchargeAmount: string;
  isActive: boolean;
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

export type PriceGroup = {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  defaultUnitRetail: string;
  mismatchedItemCount: number;
  mismatchCountUpdatedAt: string | null;
  productCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PriceGroupProduct = {
  id: string;
  barcode: string;
  name: string;
  departmentName: string | null;
  unitRetail: number;
  defaultUnitRetail: string;
  isActive: boolean;
  matchesDefaultUnitRetail: boolean;
};

export type CreatePriceGroupInput = {
  name: string;
  description?: string | null;
  defaultUnitRetail: string;
  isActive: boolean;
};

export type UpdatePriceGroupInput = Partial<CreatePriceGroupInput>;

export type PriceGroupCollection = {
  items: PriceGroup[];
  total: number;
};

export type PriceGroupProductsCollection = {
  items: PriceGroupProduct[];
  total: number;
  page: number;
  limit: number;
};

export type ProductCategory = {
  id: string;
  storeId: string;
  name: string;
  brand: string | null;
  description: string | null;
  departmentId: string | null;
  departmentName: string | null;
  posDepartmentNumber: number | null;
  productCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductCategoryProduct = {
  id: string;
  productNumber: number;
  barcode: string;
  name: string;
  departmentName: string | null;
  unitRetail: number;
  isActive: boolean;
};

export type ProductCategoryCollection = {
  items: ProductCategory[];
  total: number;
  page: number;
  limit: number;
};

export type ProductCategoryProductsCollection = {
  items: ProductCategoryProduct[];
  total: number;
  page: number;
  limit: number;
};

export type CreateProductCategoryInput = {
  name: string;
  departmentId: string;
  brand?: string | null;
  description?: string | null;
  isActive: boolean;
};

export type UpdateProductCategoryInput = Partial<CreateProductCategoryInput>;

export type ProductRecord = {
  id: string;
  productNumber: number;
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
  priceGroup?: ProductReference | null;
  productCategoryId: string | null;
  productCategory?: ProductReference | null;
  taxId: string;
  updatedAt?: string;
};

export type PriceBookSortField =
  | "productNumber"
  | "barcode"
  | "name"
  | "department"
  | "category"
  | "priceGroup"
  | "unitRetail"
  | "unitCost"
  | "margin"
  | "currentQuantity"
  | "updatedAt";

export type MarginStatus = "positive" | "zero" | "negative" | "unavailable";

export type PriceBookProduct = {
  id: string;
  productNumber: number;
  barcode: string;
  name: string;
  saleType: ProductSaleType;
  unitRetail: string;
  onlineRetailPrice: string | null;
  unitCost: string | null;
  unitCostAfterDiscountAndRebate: string | null;
  margin: string | null;
  defaultMargin: string | null;
  unitsPerCase: number | null;
  caseCost: string | null;
  caseDiscount: string;
  caseRebate: string;
  currentQuantity: number;
  minInventory: number | null;
  maxInventory: number | null;
  trackInventory: boolean;
  allowNegativeInventory: boolean;
  unitOfMeasure: string | null;
  size: string | null;
  minimumAge: number | null;
  allowEbt: boolean;
  isActive: boolean;
  updatedAt: string;
  department: { id: string; name: string };
  category: { id: string; name: string } | null;
  priceGroup: { id: string; name: string } | null;
  tax: { id: string; name: string; rate: string; surchargeAmount: string };
};

export type PriceBookProductCollection = {
  items: PriceBookProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PriceBookProductQuery = {
  search?: string;
  departmentId?: string;
  categoryId?: string;
  priceGroupId?: string;
  isActive?: boolean;
  trackInventory?: boolean;
  marginStatus?: MarginStatus;
  sort?: PriceBookSortField;
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type ProductPayload = Omit<
  ProductRecord,
  | "id"
  | "productNumber"
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

export function getNextProductNumber(storeId: string) {
  return apiClient<{ nextProductNumber: number }>(`/stores/${storeId}/products/next-product-number`);
}

export function lookupProductByProductNumber(storeId: string, productNumber: number) {
  return apiClient<ProductRecord>(`/stores/${storeId}/products/product-number/${productNumber}`);
}

export function listPriceBookProducts(storeId: string, query: PriceBookProductQuery = {}) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 50),
    sort: query.sort ?? "productNumber",
    order: query.order ?? "asc",
  });

  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.departmentId) params.set("departmentId", query.departmentId);
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.priceGroupId) params.set("priceGroupId", query.priceGroupId);
  if (query.isActive !== undefined) params.set("isActive", String(query.isActive));
  if (query.trackInventory !== undefined) params.set("trackInventory", String(query.trackInventory));
  if (query.marginStatus) params.set("marginStatus", query.marginStatus);

  return apiClient<PriceBookProductCollection>(`/stores/${storeId}/products?${params.toString()}`);
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

export async function getStoreDepartments(storeId: string, query: { active?: boolean; search?: string; limit?: number } = {}) {
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

export function getStoreProductCategories(
  storeId: string,
  query: { active?: boolean; search?: string; departmentId?: string; page?: number; limit?: number } = {},
) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 100),
  });

  if (query.active !== undefined) params.set("active", String(query.active));
  if (query.search) params.set("search", query.search);
  if (query.departmentId) params.set("departmentId", query.departmentId);

  return apiClient<ProductCategoryCollection>(`/stores/${storeId}/categories?${params.toString()}`);
}

export function getStoreProductCategory(storeId: string, categoryId: string) {
  return apiClient<ProductCategory>(`/stores/${storeId}/categories/${categoryId}`);
}

export function createProductCategory(storeId: string, payload: CreateProductCategoryInput) {
  return apiClient<ProductCategory>(`/stores/${storeId}/categories`, {
    method: "POST",
    body: payload,
  });
}

export function updateProductCategory(storeId: string, categoryId: string, payload: UpdateProductCategoryInput) {
  return apiClient<ProductCategory>(`/stores/${storeId}/categories/${categoryId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function getProductCategoryProducts(
  storeId: string,
  categoryId: string,
  query: { search?: string; page?: number; limit?: number } = {},
) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 100),
  });

  if (query.search) params.set("search", query.search);

  return apiClient<ProductCategoryProductsCollection>(
    `/stores/${storeId}/categories/${categoryId}/products?${params.toString()}`,
  );
}

export function getPriceGroups(storeId: string) {
  return apiClient<ProductReference[]>(`/product/price-group/store/${storeId}`);
}

export function getStorePriceGroups(storeId: string, query: { active?: boolean; search?: string } = {}) {
  const params = new URLSearchParams();

  if (query.active !== undefined) {
    params.set("active", String(query.active));
  }

  if (query.search) {
    params.set("search", query.search);
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiClient<PriceGroupCollection>(`/stores/${storeId}/price-groups${suffix}`);
}

export function getStorePriceGroup(storeId: string, priceGroupId: string) {
  return apiClient<PriceGroup>(`/stores/${storeId}/price-groups/${priceGroupId}`);
}

export function createPriceGroup(storeId: string, payload: CreatePriceGroupInput) {
  return apiClient<PriceGroup>(`/stores/${storeId}/price-groups`, {
    method: "POST",
    body: payload,
  });
}

export function updatePriceGroup(storeId: string, priceGroupId: string, payload: UpdatePriceGroupInput) {
  return apiClient<PriceGroup>(`/stores/${storeId}/price-groups/${priceGroupId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function getPriceGroupProducts(
  storeId: string,
  priceGroupId: string,
  query: { search?: string; match?: "all" | "matches" | "mismatches"; page?: number; limit?: number } = {},
) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 100),
    match: query.match ?? "all",
  });

  if (query.search) {
    params.set("search", query.search);
  }

  return apiClient<PriceGroupProductsCollection>(
    `/stores/${storeId}/price-groups/${priceGroupId}/products?${params.toString()}`,
  );
}

export async function getTaxes(storeId: string) {
  const response = await getStoreTaxes(storeId, { active: true, limit: 100 });

  return response.items.map<ProductReference>((tax) => ({
    id: tax.id,
    storeId: tax.storeId,
    name: tax.name,
    rate: Number(tax.rate) / 100,
    surchargeAmount: tax.surchargeAmount,
    isActive: tax.isActive,
  }));
}

export function getStoreTaxes(
  storeId: string,
  query: { active?: boolean; search?: string; page?: number; limit?: number; sort?: string; order?: "asc" | "desc" } = {},
) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 100),
    sort: query.sort ?? "name",
    order: query.order ?? "asc",
  });

  if (query.active !== undefined) params.set("active", String(query.active));
  if (query.search) params.set("search", query.search);

  return apiClient<TaxCollection>(`/stores/${storeId}/taxes?${params.toString()}`);
}

export function createTax(storeId: string, payload: TaxPayload) {
  return apiClient<TaxRecord>(`/stores/${storeId}/taxes`, {
    method: "POST",
    body: payload,
  });
}

export function updateTax(storeId: string, taxId: string, payload: Partial<TaxPayload>) {
  return apiClient<TaxRecord>(`/stores/${storeId}/taxes/${taxId}`, {
    method: "PATCH",
    body: payload,
  });
}
