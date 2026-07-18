import type { DetailedPurchaseLine, ManualPurchaseEntryState, PurchaseExpense } from "./purchaseFormTypes";

export type EntryTotals = {
  quantity: number;
  cost: number;
  retail: number;
  margin: number | null;
  marginAfterRebate: number | null;
};

export type LineCalculations = {
  quantity: number;
  unitsPerCase: number;
  caseCost: number;
  caseDiscount: number;
  discountedCaseCost: number;
  unitCostBeforeDiscount: number;
  unitCostAfterDiscount: number;
  extendedCaseCost: number;
  retail: number;
  extendedRetail: number;
  rebate: number;
  margin: number | null;
  marginAfterRebate: number | null;
};

export type PurchaseTotals = {
  manual: EntryTotals;
  detailed: EntryTotals;
  expenses: EntryTotals;
  total: EntryTotals;
};

export type DepartmentSummaryReference = {
  id: string;
  name: string;
  posDepartmentNumber?: number | null;
};

export type SummaryTotals = {
  quantity: number;
  cost: number;
  costAfterRebate: number;
  extendedRetail: number;
  marginPercent: number | null;
  marginAfterRebatePercent: number | null;
};

export type DepartmentPurchaseSummary = SummaryTotals & {
  departmentId: string | null;
  departmentNumber: number | null;
  departmentName: string;
  hasValidationIssue: boolean;
};

export type ExpenseSummaryRow = {
  id: string;
  description: string;
  quantity: number;
  cost: number;
};

export type PurchaseSummaryTableData = {
  departments: DepartmentPurchaseSummary[];
  purchaseSubtotal: SummaryTotals;
  expenses: ExpenseSummaryRow[];
  grandTotal: SummaryTotals;
};

export function parseAmount(value: string) {
  const normalized = value.trim().replace(/[$,]/g, "");
  if (!normalized) return 0;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

export function isValidNonNegativeAmount(value: string) {
  if (!value.trim()) return true;
  const amount = Number(value.trim().replace(/[$,]/g, ""));
  return Number.isFinite(amount) && amount >= 0;
}

export function calculateMargin(cost: number, retail: number) {
  if (retail <= 0) return null;
  return ((retail - cost) / retail) * 100;
}

export function calculateRetailFromMargin(cost: number, margin: number) {
  if (cost <= 0 || margin >= 100) return 0;
  return cost / (1 - margin / 100);
}

export function calculateLine(line: DetailedPurchaseLine): LineCalculations {
  const sign = line.scannerEntryType === "return" ? -1 : 1;
  const quantity = parseAmount(line.quantity);
  const unitsPerCase = parseAmount(line.unitsPerCase);
  const safeUnits = unitsPerCase > 0 ? unitsPerCase : 0;
  const caseCost = parseAmount(line.caseCost);
  const caseDiscount = parseAmount(line.caseDiscount);
  const discountedCaseCost = Math.max(caseCost - caseDiscount, 0);
  const unitCostBeforeDiscount = safeUnits > 0 ? caseCost / safeUnits : 0;
  const unitCostAfterDiscount = safeUnits > 0 ? discountedCaseCost / safeUnits : parseAmount(line.unitCost);
  const extendedCaseCost = quantity * discountedCaseCost * sign;
  const retail = parseAmount(line.newRetail) || parseAmount(line.currentRetail);
  const extendedRetail = quantity * safeUnits * retail * sign;
  const rebate = parseAmount(line.rebate);
  const unitCostAfterRebate = safeUnits > 0 ? Math.max(discountedCaseCost - rebate, 0) / safeUnits : unitCostAfterDiscount;

  return {
    quantity: quantity * sign,
    unitsPerCase,
    caseCost,
    caseDiscount,
    discountedCaseCost,
    unitCostBeforeDiscount,
    unitCostAfterDiscount,
    extendedCaseCost,
    retail,
    extendedRetail,
    rebate,
    margin: calculateMargin(unitCostAfterDiscount, retail),
    marginAfterRebate: calculateMargin(unitCostAfterRebate, retail),
  };
}

export function getLineWarnings(line: DetailedPurchaseLine, duplicateProductIds: Set<string>) {
  const calculations = calculateLine(line);
  const rawQuantity = parseAmount(line.quantity);
  const warnings: string[] = [];

  if (rawQuantity <= 0) warnings.push("Quantity is zero or negative.");
  if (calculations.unitsPerCase <= 0) warnings.push("Units per case is zero.");
  if (calculations.caseCost <= 0) warnings.push("Case cost is missing.");
  if (calculations.retail > 0 && calculations.retail < calculations.unitCostAfterDiscount) warnings.push("Retail is below discounted unit cost.");
  if (line.productId && duplicateProductIds.has(line.productId)) warnings.push("Duplicate product line.");
  if (!line.productId && (line.barcode || line.description)) warnings.push("Product no longer exists or has not been matched.");
  if (!line.departmentId) warnings.push("Department is missing.");

  return warnings;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
}

export function formatPercent(value: number | null) {
  return value === null || !Number.isFinite(value) ? "\u2014" : `${value.toFixed(2)}%`;
}

export function calculatePurchaseTotals(
  manual: ManualPurchaseEntryState,
  lines: DetailedPurchaseLine[],
  expenses: PurchaseExpense[],
): PurchaseTotals {
  const manualCost = parseAmount(manual.cost);
  const manualRetail = parseAmount(manual.retail);
  const manualTotals = buildTotals(manualCost > 0 || manualRetail > 0 ? 1 : 0, manualCost, manualRetail);

  const detailed = lines.reduce(
    (total, line) => {
      const lineTotals = calculateLine(line);
      return {
        quantity: total.quantity + lineTotals.quantity,
        cost: total.cost + lineTotals.extendedCaseCost,
        retail: total.retail + lineTotals.extendedRetail,
      };
    },
    { quantity: 0, cost: 0, retail: 0 },
  );
  const detailedTotals = buildTotals(detailed.quantity, detailed.cost, detailed.retail);

  const expenseCost = expenses.reduce((total, expense) => total + parseAmount(expense.amount), 0);
  const expenseTotals = buildTotals(expenses.filter((expense) => parseAmount(expense.amount) > 0).length, expenseCost, 0);
  const totalCost = manualTotals.cost + detailedTotals.cost + expenseTotals.cost;
  const totalRetail = manualTotals.retail + detailedTotals.retail;

  return {
    manual: manualTotals,
    detailed: detailedTotals,
    expenses: expenseTotals,
    total: buildTotals(manualTotals.quantity + detailedTotals.quantity + expenseTotals.quantity, totalCost, totalRetail),
  };
}

export function calculatePurchaseSummaryTable(
  manual: ManualPurchaseEntryState,
  lines: DetailedPurchaseLine[],
  expenses: PurchaseExpense[],
  departments: DepartmentSummaryReference[],
): PurchaseSummaryTableData {
  const departmentMap = new Map<string, DepartmentSummaryReference>(departments.map((department) => [department.id, department]));
  const grouped = new Map<string, DepartmentPurchaseSummary>();

  function ensureDepartment(departmentId: string | null, fallbackName?: string) {
    const department = departmentId ? departmentMap.get(departmentId) : null;
    const key = department?.id ?? "unassigned";
    const current = grouped.get(key);
    if (current) return current;

    const row: DepartmentPurchaseSummary = {
      departmentId: department?.id ?? null,
      departmentNumber: department?.posDepartmentNumber ?? null,
      departmentName: department?.name || fallbackName || "Unassigned Department",
      quantity: 0,
      cost: 0,
      costAfterRebate: 0,
      extendedRetail: 0,
      marginPercent: null,
      marginAfterRebatePercent: null,
      hasValidationIssue: !department,
    };
    grouped.set(key, row);
    return row;
  }

  const manualCost = parseAmount(manual.cost);
  const manualRetail = parseAmount(manual.retail);
  if (manualCost > 0 || manualRetail > 0) {
    const row = ensureDepartment(manual.departmentId || null);
    row.quantity += 1;
    row.cost += manualCost;
    row.costAfterRebate += manualCost;
    row.extendedRetail += manualRetail;
  }

  lines.forEach((line) => {
    const calculated = calculateLine(line);
    const row = ensureDepartment(line.departmentId || null, line.departmentName || undefined);
    row.quantity += calculated.quantity;
    row.cost += calculated.extendedCaseCost;
    row.costAfterRebate += calculated.extendedCaseCost - calculated.quantity * calculated.rebate;
    row.extendedRetail += calculated.extendedRetail;
  });

  const departmentsRows = [...grouped.values()]
    .map(finalizeTotals)
    .sort(compareDepartmentRows);

  const purchaseSubtotal = finalizeTotals(departmentsRows.reduce<SummaryTotals>(
    (total, row) => ({
      quantity: total.quantity + row.quantity,
      cost: total.cost + row.cost,
      costAfterRebate: total.costAfterRebate + row.costAfterRebate,
      extendedRetail: total.extendedRetail + row.extendedRetail,
      marginPercent: null,
      marginAfterRebatePercent: null,
    }),
    emptySummaryTotals(),
  ));

  const expenseRows = expenses
    .filter((expense) => expense.description.trim() || parseAmount(expense.amount) > 0)
    .map<ExpenseSummaryRow>((expense) => ({
      id: expense.id,
      description: expense.description.trim() || "Expense",
      quantity: 1,
      cost: parseAmount(expense.amount),
    }));
  const expenseCost = expenseRows.reduce((total, expense) => total + expense.cost, 0);

  const grandTotal = finalizeTotals({
    quantity: purchaseSubtotal.quantity,
    cost: purchaseSubtotal.cost + expenseCost,
    costAfterRebate: purchaseSubtotal.costAfterRebate + expenseCost,
    extendedRetail: purchaseSubtotal.extendedRetail,
    marginPercent: null,
    marginAfterRebatePercent: null,
  });

  return {
    departments: departmentsRows,
    purchaseSubtotal,
    expenses: expenseRows,
    grandTotal,
  };
}

function buildTotals(quantity: number, cost: number, retail: number): EntryTotals {
  const margin = calculateMargin(cost, retail);
  return {
    quantity,
    cost,
    retail,
    margin,
    marginAfterRebate: margin,
  };
}

function emptySummaryTotals(): SummaryTotals {
  return {
    quantity: 0,
    cost: 0,
    costAfterRebate: 0,
    extendedRetail: 0,
    marginPercent: null,
    marginAfterRebatePercent: null,
  };
}

function finalizeTotals<T extends SummaryTotals>(totals: T): T {
  return {
    ...totals,
    marginPercent: calculateMargin(totals.cost, totals.extendedRetail),
    marginAfterRebatePercent: calculateMargin(totals.costAfterRebate, totals.extendedRetail),
  };
}

function compareDepartmentRows(left: DepartmentPurchaseSummary, right: DepartmentPurchaseSummary) {
  if (left.departmentId === null && right.departmentId !== null) return 1;
  if (left.departmentId !== null && right.departmentId === null) return -1;

  if (left.departmentNumber !== null && right.departmentNumber !== null && left.departmentNumber !== right.departmentNumber) {
    return left.departmentNumber - right.departmentNumber;
  }

  if (left.departmentNumber !== null && right.departmentNumber === null) return -1;
  if (left.departmentNumber === null && right.departmentNumber !== null) return 1;

  return left.departmentName.localeCompare(right.departmentName);
}
