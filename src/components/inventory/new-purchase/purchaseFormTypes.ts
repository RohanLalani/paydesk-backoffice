import type { PurchaseType } from "@/src/features/purchases/api";

export type PurchaseTabId = "manual" | "detailed" | "scanner" | "expenses" | "summary";

export type PurchaseHeaderState = {
  purchaseDate: string;
  payeeId: string;
  payeeSearch: string;
  invoiceNumber: string;
  purchaseType: PurchaseType;
  autoAddCaseDiscounts: boolean;
  doNotAddLinkedItemCostRetail: boolean;
};

export type ManualPurchaseEntryState = {
  defaultMargin: string;
  cost: string;
  retail: string;
  departmentId: string;
  retailTouched: boolean;
};

export type DetailedPurchaseLine = {
  id: string;
  productId: string;
  productNumber: number | null;
  barcode: string;
  description: string;
  priceGroupId: string;
  priceGroupName: string;
  categoryId: string;
  categoryName: string;
  quantity: string;
  unitsPerCase: string;
  caseCost: string;
  caseDiscount: string;
  unitCost: string;
  currentRetail: string;
  newRetail: string;
  rebate: string;
  departmentId: string;
  departmentName: string;
  taxName: string;
  vendorItemNumber: string;
  existingInventoryQuantity: number | null;
  scannerEntryType?: "purchase" | "return";
};

export type PurchaseExpense = {
  id: string;
  description: string;
  amount: string;
};

export type FieldErrors = {
  payeeId?: string;
  invoiceNumber?: string;
  purchaseDate?: string;
  form?: string;
};

export type ThemeClasses = {
  isDark: boolean;
  panel: string;
  nested: string;
  border: string;
  muted: string;
  input: string;
  subtle: string;
};
