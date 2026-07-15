import { apiClient } from "@/src/lib/apiClient";

export type ProductSaleType = "piece" | "weight" | "meat_barcode" | "service" | "lottery" | "other";
export type TaxStyle = "pre_discount" | "post_discount";

export type ProductReference = {
  id: string;
  name: string;
  rate?: number;
  defaultAllowEbt?: boolean;
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

export function getDepartments(storeId: string) {
  return apiClient<ProductReference[]>(`/product/department/store/${storeId}`);
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
