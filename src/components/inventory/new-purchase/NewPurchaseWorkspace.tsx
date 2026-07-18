"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { AlertTriangle, ArrowLeft, ChevronDown, ChevronRight, Columns3, FilePlus2, LoaderCircle, Pencil, Plus, RotateCcw, Save, Search, Trash2, Upload, X } from "lucide-react";
import { BackOfficeShell, type BackOfficeShellContext } from "@/src/components/layout/BackOfficeShell";
import { FormSelect } from "@/src/components/ui/FormSelect";
import {
  getStoreDepartments,
  getStorePriceGroups,
  getStoreProductCategories,
  lookupProductByBarcode,
  listPriceBookProducts,
  type Department,
  type PriceBookProduct,
  type PriceGroup,
  type ProductCategory,
  type ProductRecord,
} from "@/src/features/products/api";
import {
  createStorePurchase,
  listStorePayees,
  type CreatePurchaseInput,
  type Payee,
  type PurchaseStatus,
  type PurchaseType,
} from "@/src/features/purchases/api";
import {
  calculateLine,
  calculateMargin,
  calculatePurchaseSummaryTable,
  calculatePurchaseTotals,
  calculateRetailFromMargin,
  formatCurrency,
  formatPercent,
  getLineWarnings,
  isValidNonNegativeAmount,
  parseAmount,
  type PurchaseSummaryTableData,
  type SummaryTotals,
} from "./purchaseCalculations";
import type {
  DetailedPurchaseLine,
  FieldErrors,
  ManualPurchaseEntryState,
  PurchaseExpense,
  PurchaseHeaderState,
  PurchaseTabId,
  ThemeClasses,
} from "./purchaseFormTypes";

const EMPTY = "\u2014";
const tabs: Array<{ id: PurchaseTabId; label: string }> = [
  { id: "manual", label: "Manual Entry" },
  { id: "detailed", label: "Item Detailed Entry" },
  { id: "scanner", label: "Using Scanner" },
  { id: "expenses", label: "Expenses" },
  { id: "summary", label: "Purchase Summary" },
];

const purchaseTypes: Array<[PurchaseType, string]> = [
  ["CASH_DAILY", "Cash - Daily"],
  ["CHECK", "Check"],
  ["CREDIT", "Credit"],
];

type BulkField = "quantity" | "unitsPerCase" | "caseCost" | "caseDiscount" | "unitCost" | "newRetail" | "departmentId" | "priceGroupId" | "categoryId" | "rebate";
type ScannerEntryType = "purchase" | "return";
type ScannerState = "input" | "reviewing" | "reviewed" | "saving" | "error";

type UnresolvedScanCode = {
  id: string;
  scanCode: string;
  entryType: ScannerEntryType;
  occurrences: number;
  reason: string;
};

type ColumnId =
  | "expand"
  | "select"
  | "productNumber"
  | "barcode"
  | "quantity"
  | "description"
  | "priceGroup"
  | "department"
  | "category"
  | "unitsPerCase"
  | "caseCost"
  | "caseDiscount"
  | "unitCostBeforeDiscount"
  | "unitCostAfterDiscount"
  | "extendedCaseCost"
  | "currentRetail"
  | "newRetail"
  | "extendedRetail"
  | "margin"
  | "rebate"
  | "marginAfterRebate"
  | "taxRate"
  | "vendorItemNumber"
  | "payee"
  | "invoiceNumber";

type ColumnDefinition = {
  id: ColumnId;
  label: string;
  essential?: boolean;
  defaultVisible?: boolean;
  align?: "left" | "right" | "center";
};

const detailedColumnStorageKey = "paydesk.purchaseDetailedEntry.columns.v1";
const detailedColumns: ColumnDefinition[] = [
  { id: "expand", label: "", essential: true, defaultVisible: true, align: "center" },
  { id: "select", label: "", essential: true, defaultVisible: true, align: "center" },
  { id: "productNumber", label: "Product #", defaultVisible: false, align: "right" },
  { id: "barcode", label: "Barcode", defaultVisible: false },
  { id: "quantity", label: "Qty", defaultVisible: true, align: "right" },
  { id: "description", label: "Item Description", defaultVisible: true },
  { id: "priceGroup", label: "Price Group", defaultVisible: true },
  { id: "department", label: "Department", defaultVisible: false },
  { id: "category", label: "Category", defaultVisible: false },
  { id: "unitsPerCase", label: "Units", defaultVisible: true, align: "right" },
  { id: "caseCost", label: "Case Cost", defaultVisible: true, align: "right" },
  { id: "caseDiscount", label: "Case Disc", defaultVisible: true, align: "right" },
  { id: "unitCostBeforeDiscount", label: "Cost/Unit Before Disc", defaultVisible: false, align: "right" },
  { id: "unitCostAfterDiscount", label: "Cost/Unit After Disc", defaultVisible: true, align: "right" },
  { id: "extendedCaseCost", label: "Extd Case Cost", defaultVisible: true, align: "right" },
  { id: "currentRetail", label: "Current Retail", defaultVisible: false, align: "right" },
  { id: "newRetail", label: "New Retail", defaultVisible: false, align: "right" },
  { id: "extendedRetail", label: "Extended Retail", defaultVisible: false, align: "right" },
  { id: "margin", label: "Margin", defaultVisible: false, align: "right" },
  { id: "rebate", label: "Rebate", defaultVisible: false, align: "right" },
  { id: "marginAfterRebate", label: "Margin After Rebate", defaultVisible: false, align: "right" },
  { id: "taxRate", label: "Tax Rate", defaultVisible: false },
  { id: "vendorItemNumber", label: "Vendor Item #", defaultVisible: false },
  { id: "payee", label: "Payee", defaultVisible: false },
  { id: "invoiceNumber", label: "Invoice #", defaultVisible: false },
];

const bulkFieldOptions: Array<{ id: BulkField; label: string; kind: "currency" | "number" | "percent" | "department" | "priceGroup" | "category" }> = [
  { id: "quantity", label: "Quantity", kind: "number" },
  { id: "unitsPerCase", label: "Units per case", kind: "number" },
  { id: "caseCost", label: "Case cost", kind: "currency" },
  { id: "caseDiscount", label: "Case discount", kind: "currency" },
  { id: "unitCost", label: "Unit cost", kind: "currency" },
  { id: "newRetail", label: "Retail", kind: "currency" },
  { id: "departmentId", label: "Department", kind: "department" },
  { id: "priceGroupId", label: "Price group", kind: "priceGroup" },
  { id: "categoryId", label: "Category", kind: "category" },
  { id: "rebate", label: "Rebate", kind: "currency" },
];

function todayInput() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function createClientId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function newLine(product?: PriceBookProduct, id = createClientId("line")): DetailedPurchaseLine {
  return {
    id,
    productId: product?.id ?? "",
    productNumber: product?.productNumber ?? null,
    barcode: product?.barcode ?? "",
    description: product?.name ?? "",
    priceGroupId: product?.priceGroup?.id ?? "",
    priceGroupName: product?.priceGroup?.name ?? "",
    categoryId: product?.category?.id ?? "",
    categoryName: product?.category?.name ?? "",
    quantity: product ? "1" : "",
    unitsPerCase: product?.unitsPerCase ? String(product.unitsPerCase) : "1",
    caseCost: product?.caseCost ?? "",
    caseDiscount: product?.caseDiscount ?? "",
    unitCost: product?.unitCost ?? "",
    currentRetail: product?.unitRetail ?? "",
    newRetail: product?.unitRetail ?? "",
    rebate: product?.caseRebate ?? "",
    departmentId: product?.department.id ?? "",
    departmentName: product?.department.name ?? "",
    taxName: product?.tax ? formatTaxName(product.tax) : "",
    vendorItemNumber: "",
    existingInventoryQuantity: product?.currentQuantity ?? null,
    scannerEntryType: "purchase",
  };
}

function newLineFromProduct(product: ProductRecord): DetailedPurchaseLine {
  return {
    id: createClientId("line"),
    productId: product.id,
    productNumber: product.productNumber,
    barcode: product.barcode,
    description: product.name,
    priceGroupId: product.priceGroupId ?? "",
    priceGroupName: product.priceGroup?.name ?? "",
    categoryId: product.productCategoryId ?? "",
    categoryName: product.productCategory?.name ?? "",
    quantity: "1",
    unitsPerCase: product.unitsPerCase ? String(product.unitsPerCase) : "1",
    caseCost: product.caseCost === null ? "" : String(product.caseCost),
    caseDiscount: String(product.caseDiscount),
    unitCost: product.unitCost === null ? "" : String(product.unitCost),
    currentRetail: String(product.unitRetail),
    newRetail: String(product.unitRetail),
    rebate: String(product.caseRebate),
    departmentId: product.departmentId,
    departmentName: product.department?.name ?? "",
    taxName: product.taxId,
    vendorItemNumber: "",
    existingInventoryQuantity: product.currentQuantity,
    scannerEntryType: "purchase",
  };
}

function formatTaxName(tax: PriceBookProduct["tax"]) {
  const rate = Number(tax.rate);
  return Number.isFinite(rate) ? `${tax.name} (${rate.toFixed(3)}%)` : tax.name;
}

function newExpense(id = createClientId("expense")): PurchaseExpense {
  return { id, description: "", amount: "" };
}

function classesFor(theme: "light" | "dark"): ThemeClasses {
  const isDark = theme === "dark";
  return {
    isDark,
    panel: isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white",
    nested: isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]",
    border: isDark ? "border-slate-400/15" : "border-[#ded8f3]",
    muted: isDark ? "text-slate-400" : "text-slate-500",
    input: isDark
      ? "border-slate-400/15 bg-white/[0.04] text-white placeholder:text-slate-500"
      : "border-[#ded8f3] bg-white text-slate-950 placeholder:text-slate-400",
    subtle: isDark ? "bg-[#261b62]/35 text-[#d9d4ff]" : "bg-[#f0edff] text-[#4f2df2]",
  };
}

function canManagePurchases(context: BackOfficeShellContext) {
  return context.account?.role === "owner" || context.account?.role === "partner" || context.account?.permissions?.includes("manage_purchases") === true;
}

export function NewPurchaseWorkspace() {
  return (
    <BackOfficeShell activeItem="inventory" requiredPermission="manage_purchases" layoutMode="workspace">
      {(context) => <NewPurchaseContent {...context} />}
    </BackOfficeShell>
  );
}

function NewPurchaseContent(context: BackOfficeShellContext) {
  const router = useRouter();
  const styles = classesFor(context.theme);
  const [header, setHeader] = useState<PurchaseHeaderState>({
    purchaseDate: todayInput(),
    payeeId: "",
    payeeSearch: "",
    invoiceNumber: "",
    purchaseType: "CASH_DAILY",
    autoAddCaseDiscounts: false,
    doNotAddLinkedItemCostRetail: false,
  });
  const [manual, setManual] = useState<ManualPurchaseEntryState>({ defaultMargin: "", cost: "", retail: "", departmentId: "", retailTouched: false });
  const [lines, setLines] = useState<DetailedPurchaseLine[]>([]);
  const [expenses, setExpenses] = useState<PurchaseExpense[]>([newExpense("expense-initial")]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [priceGroups, setPriceGroups] = useState<PriceGroup[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [activeTab, setActiveTab] = useState<PurchaseTabId>("manual");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [payeeState, setPayeeState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [departmentError, setDepartmentError] = useState(false);
  const [saving, setSaving] = useState<PurchaseStatus | null>(null);
  const [detailMessage, setDetailMessage] = useState("");
  const [pendingScannerLines, setPendingScannerLines] = useState<DetailedPurchaseLine[]>([]);
  const scannerInputRef = useRef<HTMLTextAreaElement>(null);
  const detailedHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) setPayeeState("loading");
    });
    Promise.all([
      listStorePayees(context.selectedStore.id, { active: true, limit: 100 }),
      getStoreDepartments(context.selectedStore.id, { active: true, limit: 100 }),
      getStorePriceGroups(context.selectedStore.id, { active: true }),
      getStoreProductCategories(context.selectedStore.id, { active: true, limit: 100 }),
    ])
      .then(([payeeResponse, departmentResponse, priceGroupResponse, categoryResponse]) => {
        if (!mounted) return;
        setPayees(payeeResponse.items);
        setPayeeState(payeeResponse.items.length ? "ready" : "empty");
        setDepartments(departmentResponse);
        setPriceGroups(priceGroupResponse.items);
        setCategories(categoryResponse.items);
        setDepartmentError(false);
      })
      .catch(() => {
        if (!mounted) return;
        setPayeeState("error");
        setDepartmentError(true);
      });

    return () => {
      mounted = false;
    };
  }, [context.selectedStore.id]);

  useEffect(() => {
    if (activeTab === "scanner") {
      scannerInputRef.current?.focus();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!detailMessage) return;
    const timeout = window.setTimeout(() => setDetailMessage(""), 6000);
    return () => window.clearTimeout(timeout);
  }, [detailMessage]);

  useEffect(() => {
    if (activeTab === "detailed") {
      queueMicrotask(() => detailedHeadingRef.current?.focus());
    }
  }, [activeTab, detailMessage]);

  const selectedPayee = payees.find((payee) => payee.id === header.payeeId) ?? null;
  const filteredPayees = useMemo(() => {
    const query = header.payeeSearch.trim().toLowerCase();
    return query ? payees.filter((payee) => payee.name.toLowerCase().includes(query)).slice(0, 8) : payees.slice(0, 8);
  }, [header.payeeSearch, payees]);
  const summaryTable = useMemo(() => calculatePurchaseSummaryTable(manual, [...lines, ...pendingScannerLines], expenses, departments), [departments, expenses, lines, manual, pendingScannerLines]);
  const totals = useMemo(() => calculatePurchaseTotals(manual, [...lines, ...pendingScannerLines], expenses), [expenses, lines, manual, pendingScannerLines]);
  const manualMargin = calculateMargin(parseAmount(manual.cost), parseAmount(manual.retail));
  const canSubmit = canManagePurchases(context) && !saving;

  function updateHeader<K extends keyof PurchaseHeaderState>(key: K, value: PurchaseHeaderState[K]) {
    setHeader((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
  }

  function updateManual<K extends keyof ManualPurchaseEntryState>(key: K, value: ManualPurchaseEntryState[K]) {
    setManual((current) => {
      const next = { ...current, [key]: value };
      if ((key === "cost" || key === "defaultMargin") && !next.retailTouched) {
        const cost = parseAmount(next.cost);
        const margin = parseAmount(next.defaultMargin);
        const retail = calculateRetailFromMargin(cost, margin);
        next.retail = retail > 0 ? retail.toFixed(2) : next.retail;
      }
      return next;
    });
  }

  function updateExpense(id: string, patch: Partial<PurchaseExpense>) {
    setExpenses((current) => current.map((expense) => (expense.id === id ? { ...expense, ...patch } : expense)));
  }

  async function searchDetailedProduct(query: string) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return;
    setDetailMessage("");
    try {
      const response = await listPriceBookProducts(context.selectedStore.id, { search: cleanQuery, isActive: true, limit: 1 });
      const product = response.items[0];
      if (product) {
        setLines((current) => mergeScannerLinesIntoDetailed(current, [newLine(product)]));
        setDetailMessage("1 product was added to Item Detailed Entry.");
        return;
      }
      setDetailMessage("No matching product was found.");
    } catch {
      setFieldErrors((current) => ({ ...current, form: "Product search is unavailable right now." }));
    }
  }

  function validateForm() {
    const errors: FieldErrors = {};
    if (!header.purchaseDate) errors.purchaseDate = "Select a purchase date.";
    if (!header.payeeId) errors.payeeId = "Select an active payee.";
    if (!header.invoiceNumber.trim()) errors.invoiceNumber = "Invoice number is required.";
    if (!isValidNonNegativeAmount(manual.cost) || !isValidNonNegativeAmount(manual.retail) || !isValidNonNegativeAmount(manual.defaultMargin)) {
      errors.form = "Manual entry amounts must be valid non-negative numbers.";
    }
    if (lines.some((line) => [line.quantity, line.unitsPerCase, line.caseCost, line.caseDiscount, line.unitCost, line.currentRetail, line.newRetail, line.rebate].some((value) => !isValidNonNegativeAmount(value)))) {
      errors.form = "Detailed entry amounts must be valid non-negative numbers.";
    }
    if (expenses.some((expense) => !isValidNonNegativeAmount(expense.amount))) {
      errors.form = "Expense amounts must be valid non-negative numbers.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit(status: PurchaseStatus, options: { stayOnPage?: boolean } = {}) {
    if (!canSubmit || !validateForm()) return;
    setSaving(status);
    try {
      await createStorePurchase(context.selectedStore.id, buildPayload(status, header, manual, lines, expenses));
      router.refresh();
      if (options.stayOnPage) {
        setDetailMessage("Purchase draft saved.");
        setSaving(null);
        return;
      }
      router.push("/inventory/purchases");
    } catch (error) {
      setFieldErrors({ form: error instanceof Error ? error.message : "We could not save this purchase right now." });
      setSaving(null);
    }
  }

  const warnings = validationWarnings(header, manual, lines, expenses, payeeState, departmentError);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/inventory/purchases" className={`inline-flex h-10 w-fit items-center gap-2 rounded-[8px] border px-3 text-sm font-extrabold transition ${styles.input}`}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Purchases
        </Link>
        <ActionBar saving={saving} canSubmit={canSubmit} onCancel={() => router.push("/inventory/purchases")} onSaveDraft={() => void submit("DRAFT")} onCreate={() => void submit("OPEN")} />
      </div>

      <PurchaseHeaderForm
        header={header}
        payees={payees}
        filteredPayees={filteredPayees}
        selectedPayee={selectedPayee}
        payeeState={payeeState}
        errors={fieldErrors}
        styles={styles}
        onUpdate={updateHeader}
      />

      {fieldErrors.form ? <Alert message={fieldErrors.form} styles={styles} /> : null}
      <p className={`text-xs font-semibold ${styles.muted}`}>
        Checkbox preferences are held in this workspace only. They are intentionally not sent until the purchase backend exposes supported fields.
      </p>

      <section className={`overflow-hidden rounded-[8px] border ${styles.panel}`}>
        <TabList activeTab={activeTab} onChange={setActiveTab} styles={styles} />
        <div className="p-4 sm:p-5">
          {activeTab === "manual" ? (
            <ManualPurchaseEntry manual={manual} margin={manualMargin} departments={departments} styles={styles} onUpdate={updateManual} />
          ) : null}
          {activeTab === "detailed" ? (
            <DetailedPurchaseEntry
              header={header}
              selectedPayee={selectedPayee}
              lines={lines}
              departments={departments}
              priceGroups={priceGroups}
              categories={categories}
              styles={styles}
              headingRef={detailedHeadingRef}
              message={detailMessage}
              saving={saving === "DRAFT"}
              onLookup={(query) => void searchDetailedProduct(query)}
              onRemove={(id) => setLines((current) => current.filter((line) => line.id !== id))}
              onReplaceLines={setLines}
              onSaveChanges={() => void submit("DRAFT", { stayOnPage: true })}
              onMessage={setDetailMessage}
            />
          ) : null}
          {activeTab === "scanner" ? (
            <ScannerPurchaseEntry
              inputRef={scannerInputRef}
              storeId={context.selectedStore.id}
              departments={departments}
              styles={styles}
              onPendingLinesChange={setPendingScannerLines}
              onSave={(scannerLines) => {
                setLines((current) => mergeScannerLinesIntoDetailed(current.filter((line) => line.description || line.barcode), scannerLines));
                setPendingScannerLines([]);
                setDetailMessage(`${scannerLines.length} scanner item${scannerLines.length === 1 ? " was" : "s were"} added to Item Detailed Entry.`);
                setActiveTab("detailed");
                return true;
              }}
            />
          ) : null}
          {activeTab === "expenses" ? (
            <PurchaseExpenses expenses={expenses} styles={styles} onAdd={() => setExpenses((current) => [...current, newExpense()])} onRemove={(id) => setExpenses((current) => current.length > 1 ? current.filter((expense) => expense.id !== id) : [newExpense()])} onUpdate={updateExpense} />
          ) : null}
          {activeTab === "summary" ? (
            <PurchaseSummary header={header} selectedPayee={selectedPayee} manual={manual} summaryTable={summaryTable} warnings={warnings} styles={styles} />
          ) : null}
        </div>
      </section>

      {activeTab !== "summary" ? <CompactPurchaseTotalsTable totals={totals} styles={styles} /> : null}
      <div className="flex justify-end">
        <ActionBar saving={saving} canSubmit={canSubmit} onCancel={() => router.push("/inventory/purchases")} onSaveDraft={() => void submit("DRAFT")} onCreate={() => void submit("OPEN")} />
      </div>
    </section>
  );
}

function PurchaseHeaderForm({ header, payees, filteredPayees, selectedPayee, payeeState, errors, styles, onUpdate }: {
  header: PurchaseHeaderState;
  payees: Payee[];
  filteredPayees: Payee[];
  selectedPayee: Payee | null;
  payeeState: "loading" | "ready" | "empty" | "error";
  errors: FieldErrors;
  styles: ThemeClasses;
  onUpdate: <K extends keyof PurchaseHeaderState>(key: K, value: PurchaseHeaderState[K]) => void;
}) {
  return (
    <section className={`rounded-[8px] border p-5 ${styles.panel}`}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Purchase Date" error={errors.purchaseDate} required styles={styles}>
          <input type="date" value={header.purchaseDate} onChange={(event) => onUpdate("purchaseDate", event.target.value)} className={inputClass(styles)} />
        </Field>
        <Field label="Payee" error={errors.payeeId} helper={payeeHelper(payeeState, payees.length, selectedPayee)} required styles={styles}>
          <div className="space-y-2">
            <input value={header.payeeSearch} onChange={(event) => onUpdate("payeeSearch", event.target.value)} placeholder="Search active payees" disabled={payeeState === "loading" || payeeState === "error"} className={inputClass(styles)} />
            <FormSelect value={header.payeeId} onChange={(event) => onUpdate("payeeId", event.target.value)} disabled={payeeState !== "ready"} selectClassName={styles.input}>
              <option value="">{payeeState === "loading" ? "Loading payees..." : "Select payee"}</option>
              {filteredPayees.map((payee) => <option key={payee.id} value={payee.id}>{payee.name}</option>)}
            </FormSelect>
          </div>
        </Field>
        <Field label="Invoice Number" error={errors.invoiceNumber} required styles={styles}>
          <input value={header.invoiceNumber} onChange={(event) => onUpdate("invoiceNumber", event.target.value)} onBlur={() => onUpdate("invoiceNumber", header.invoiceNumber.trim())} className={inputClass(styles)} />
        </Field>
        <Field label="Purchase Type" styles={styles}>
          <FormSelect value={header.purchaseType} onChange={(event) => onUpdate("purchaseType", event.target.value as PurchaseType)} selectClassName={styles.input}>
            {purchaseTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </FormSelect>
        </Field>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Checkbox label="Auto add case discounts" checked={header.autoAddCaseDiscounts} onChange={(checked) => onUpdate("autoAddCaseDiscounts", checked)} styles={styles} />
        <Checkbox label="Do not add linked item cost/retail" checked={header.doNotAddLinkedItemCostRetail} onChange={(checked) => onUpdate("doNotAddLinkedItemCostRetail", checked)} styles={styles} />
      </div>
    </section>
  );
}

function ManualPurchaseEntry({ manual, margin, departments, styles, onUpdate }: {
  manual: ManualPurchaseEntryState;
  margin: number | null;
  departments: Department[];
  styles: ThemeClasses;
  onUpdate: <K extends keyof ManualPurchaseEntryState>(key: K, value: ManualPurchaseEntryState[K]) => void;
}) {
  return (
    <div className="space-y-4" role="tabpanel" id="panel-manual" aria-labelledby="tab-manual">
      <p className={`text-sm font-semibold leading-6 ${styles.muted}`}>Use these fields for a single summary entry of the complete invoice. Only total case cost and total case retail are required here.</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Field label="Default Margin" styles={styles}><input inputMode="decimal" value={manual.defaultMargin} onChange={(event) => onUpdate("defaultMargin", event.target.value)} className={inputClass(styles)} /></Field>
        <Field label="Cost" styles={styles}><input inputMode="decimal" value={manual.cost} onChange={(event) => onUpdate("cost", event.target.value)} className={inputClass(styles)} /></Field>
        <Field label="Retail" styles={styles}><input inputMode="decimal" value={manual.retail} onChange={(event) => { onUpdate("retailTouched", true); onUpdate("retail", event.target.value); }} className={inputClass(styles)} /></Field>
        <Field label="Margin" helper="Calculated from cost and retail." styles={styles}><input readOnly value={formatPercent(margin)} className={`${inputClass(styles)} cursor-default opacity-80`} /></Field>
        <Field label="Department" styles={styles}>
          <DepartmentSelect value={manual.departmentId} departments={departments} styles={styles} onChange={(value) => onUpdate("departmentId", value)} />
        </Field>
      </div>
    </div>
  );
}

function DetailedPurchaseEntry({
  header,
  selectedPayee,
  lines,
  departments,
  priceGroups,
  categories,
  styles,
  headingRef,
  message,
  saving,
  onLookup,
  onRemove,
  onReplaceLines,
  onSaveChanges,
  onMessage,
}: {
  header: PurchaseHeaderState;
  selectedPayee: Payee | null;
  lines: DetailedPurchaseLine[];
  departments: Department[];
  priceGroups: PriceGroup[];
  categories: ProductCategory[];
  styles: ThemeClasses;
  headingRef: RefObject<HTMLHeadingElement | null>;
  message: string;
  saving: boolean;
  onLookup: (query: string) => void;
  onRemove: (id: string) => void;
  onReplaceLines: (lines: DetailedPurchaseLine[]) => void;
  onSaveChanges: () => void;
  onMessage: (message: string) => void;
}) {
  const [searchBarcode, setSearchBarcode] = useState("");
  const [searchDescription, setSearchDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [bulkField, setBulkField] = useState<"" | BulkField>("");
  const [bulkValue, setBulkValue] = useState("");
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(() => defaultVisibleColumns());
  const [undoLines, setUndoLines] = useState<DetailedPurchaseLine[] | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const duplicateProductIds = useMemo(() => findDuplicateProductIds(lines), [lines]);
  const visibleDataColumns = detailedColumns.filter((column) => column.essential || visibleColumns.has(column.id));
  const selectedCount = selectedIds.size;
  const editableField = bulkField ? bulkFieldOptions.find((field) => field.id === bulkField) : null;
  const bulkValueIsValid = validateBulkValue(editableField, bulkValue);
  const canBulkUpdate = selectedCount > 0 && Boolean(editableField) && bulkValueIsValid;

  useEffect(() => {
    queueMicrotask(() => {
      const stored = window.localStorage.getItem(detailedColumnStorageKey);
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored) as unknown;
        if (!Array.isArray(parsed)) return;
        const allowed = new Set(detailedColumns.map((column) => column.id));
        setVisibleColumns(new Set(parsed.filter((column): column is ColumnId => typeof column === "string" && allowed.has(column as ColumnId))));
      } catch {
        window.localStorage.removeItem(detailedColumnStorageKey);
      }
    });
  }, []);

  useEffect(() => {
    window.localStorage.setItem(detailedColumnStorageKey, JSON.stringify([...visibleColumns]));
  }, [visibleColumns]);

  useEffect(() => {
    const visibleIds = new Set(lines.map((line) => line.id));
    queueMicrotask(() => {
      setSelectedIds((current) => new Set([...current].filter((id) => visibleIds.has(id))));
      setExpandedIds((current) => new Set([...current].filter((id) => visibleIds.has(id))));
    });
  }, [lines]);

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = selectedIds.size > 0 && selectedIds.size < lines.length;
  }, [lines.length, selectedIds.size]);

  function toggleColumn(columnId: ColumnId, checked: boolean) {
    const column = detailedColumns.find((item) => item.id === columnId);
    if (column?.essential) return;
    setVisibleColumns((current) => {
      const next = new Set(current);
      if (checked) next.add(columnId);
      else next.delete(columnId);
      return next;
    });
  }

  function toggleSelected(lineId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(lineId);
      else next.delete(lineId);
      return next;
    });
  }

  function toggleExpanded(lineId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  }

  function applyBulkUpdate() {
    if (!editableField || !canBulkUpdate) return;
    if (["departmentId", "priceGroupId", "newRetail", "caseCost"].includes(editableField.id)) {
      const confirmed = window.confirm(`Update ${selectedCount} selected row${selectedCount === 1 ? "" : "s"}?`);
      if (!confirmed) return;
    }
    const selected = new Set(selectedIds);
    const nextLines = lines.map((line) => selected.has(line.id) ? applyBulkValue(line, editableField.id, bulkValue, departments, priceGroups, categories) : line);
    setUndoLines(lines);
    onReplaceLines(nextLines);
    onMessage(`Updated ${selectedCount} selected row${selectedCount === 1 ? "" : "s"}.`);
  }

  function undoBulkUpdate() {
    if (!undoLines) return;
    onReplaceLines(undoLines);
    setUndoLines(null);
    onMessage("Last bulk update undone.");
  }

  function submitSearch() {
    const query = searchBarcode.trim() || searchDescription.trim();
    if (!query) return;
    onLookup(query);
    setSearchBarcode("");
    setSearchDescription("");
  }

  return (
    <div className="space-y-4" role="tabpanel" id="panel-detailed" aria-labelledby="tab-detailed">
      <div className="flex flex-col gap-1">
        <h3 ref={headingRef} tabIndex={-1} className="text-base font-extrabold outline-none">Item Detailed Entry</h3>
        <p className={`text-xs font-semibold ${styles.muted}`}>Scanner-created rows are merged into this read-only purchase-line table.</p>
      </div>
      <div className={`rounded-[8px] border p-4 ${styles.nested}`}>
        <div className="grid gap-4 2xl:grid-cols-[minmax(520px,760px)_1fr] 2xl:items-end">
          <div className="grid gap-3 md:grid-cols-[220px_minmax(220px,1fr)_110px] md:items-end">
            <label className="text-sm font-bold">
              Change Value
              <FormSelect value={bulkField} onChange={(event) => { setBulkField(event.target.value as "" | BulkField); setBulkValue(""); }} selectClassName={`${styles.input} mt-2`}>
                <option value="">---SELECT---</option>
                {bulkFieldOptions.map((field) => <option key={field.id} value={field.id}>{field.label}</option>)}
              </FormSelect>
            </label>
            <BulkValueControl field={editableField} value={bulkValue} departments={departments} priceGroups={priceGroups} categories={categories} styles={styles} onChange={setBulkValue} />
            <button type="button" onClick={applyBulkUpdate} disabled={!canBulkUpdate} className="h-11 self-end rounded-[8px] bg-[#4f2df2] px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60">Update</button>
          </div>

          <div className="flex flex-wrap items-end justify-start gap-2 2xl:justify-end">
            <span className={`inline-flex h-11 items-center rounded-[8px] px-3 text-xs font-extrabold ${styles.subtle}`}>{selectedCount} selected</span>
            {selectedCount ? <button type="button" onClick={() => setSelectedIds(new Set())} className={`h-11 rounded-[8px] border px-3 text-xs font-extrabold ${styles.input}`}>Clear Selection</button> : null}
            {undoLines ? <button type="button" onClick={undoBulkUpdate} className={`inline-flex h-11 items-center gap-2 rounded-[8px] border px-3 text-xs font-extrabold ${styles.input}`}><RotateCcw className="size-4" />Undo</button> : null}
            <button type="button" onClick={onSaveChanges} disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-[#4f2df2] px-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}Save Changes</button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className={`inline-flex h-11 items-center gap-2 rounded-[8px] border px-3 text-sm font-extrabold ${styles.input}`}><Upload className="size-4" />Import Invoice</button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => { if (event.target.files?.length) onMessage("Invoice import parsing is not implemented yet. No rows were changed."); event.target.value = ""; }} />
            <div className="relative">
              <button type="button" onClick={() => setColumnsOpen((open) => !open)} className={`inline-flex h-11 items-center gap-2 rounded-[8px] border px-3 text-sm font-extrabold ${styles.input}`}><Columns3 className="size-4" />Columns</button>
              {columnsOpen ? <ColumnMenu visibleColumns={visibleColumns} styles={styles} onToggle={toggleColumn} onShowAll={() => setVisibleColumns(new Set(detailedColumns.map((column) => column.id)))} onHideNonessential={() => setVisibleColumns(defaultVisibleColumns())} onReset={() => setVisibleColumns(defaultVisibleColumns())} /> : null}
            </div>
          </div>
        </div>
        <p className={`mt-3 text-xs font-semibold leading-5 ${styles.muted}`}>
          Cost and retail changes from this purchase are kept in purchase form state here. Any Price Book effect must be enforced by the purchase API, including the purchase-date window rule.
        </p>
        {message ? <p className="mt-2 text-xs font-extrabold text-emerald-500">{message}</p> : null}
      </div>

      <div className={`rounded-[8px] border p-3 ${styles.nested}`}>
        <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
          <input value={searchBarcode} onChange={(event) => setSearchBarcode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitSearch(); }} placeholder="Barcode / product search" className={inputClass(styles)} />
          <input value={searchDescription} onChange={(event) => setSearchDescription(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitSearch(); }} placeholder="Product description search" className={inputClass(styles)} />
          <button type="button" onClick={submitSearch} disabled={!searchBarcode.trim() && !searchDescription.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"><Search className="size-4" />Find Product</button>
        </div>
      </div>

      <div className={`overflow-hidden rounded-[8px] border ${styles.panel}`}>
        <div className="max-h-[620px] overflow-auto">
          <table className="w-full min-w-[1320px] border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-10">
              <tr className={`${styles.isDark ? "bg-[#111b32]" : "bg-[#f0edff]"} text-xs font-extrabold uppercase ${styles.muted}`}>
                {visibleDataColumns.map((column) => (
                  <th key={column.id} className={`border-b px-3 py-3 ${styles.border} ${column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : ""} ${column.id === "expand" ? "sticky left-0 z-20 w-12" : ""} ${column.id === "select" ? "sticky left-12 z-20 w-12" : ""} ${column.id === "description" ? "sticky left-24 z-20 min-w-[260px]" : ""} ${styles.isDark ? "bg-[#111b32]" : "bg-[#f0edff]"}`}>
                    {column.id === "select" ? <input ref={selectAllRef} type="checkbox" checked={lines.length > 0 && selectedIds.size === lines.length} onChange={(event) => setSelectedIds(event.target.checked ? new Set(lines.map((line) => line.id)) : new Set())} className="size-4 accent-[#4f2df2]" aria-label="Select all rows" /> : column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.length ? lines.map((line) => {
                const warnings = getLineWarnings(line, duplicateProductIds);
                const expanded = expandedIds.has(line.id);
                return (
                  <Fragment key={line.id}>
                    <tr key={line.id} className={`border-b ${warnings.length ? styles.isDark ? "bg-amber-500/10" : "bg-amber-50" : ""}`}>
                      {visibleDataColumns.map((column) => <ReadOnlyCell key={`${line.id}-${column.id}`} column={column} line={line} selectedPayee={selectedPayee} invoiceNumber={header.invoiceNumber} selected={selectedIds.has(line.id)} expanded={expanded} warnings={warnings} styles={styles} onToggleSelected={toggleSelected} onToggleExpanded={toggleExpanded} />)}
                    </tr>
                    {expanded ? (
                      <tr key={`${line.id}-expanded`}>
                        <td colSpan={visibleDataColumns.length} className={`border-b p-4 ${styles.border}`}>
                          <ExpandedLinePanel line={line} warnings={warnings} selectedPayee={selectedPayee} invoiceNumber={header.invoiceNumber} styles={styles} onRemove={onRemove} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              }) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BulkValueControl({ field, value, departments, priceGroups, categories, styles, onChange }: {
  field: (typeof bulkFieldOptions)[number] | null | undefined;
  value: string;
  departments: Department[];
  priceGroups: PriceGroup[];
  categories: ProductCategory[];
  styles: ThemeClasses;
  onChange: (value: string) => void;
}) {
  if (!field) {
    return <Field label="New Value" styles={styles}><input value="" readOnly className={`${inputClass(styles)} opacity-70`} /></Field>;
  }

  if (field.kind === "department") {
    return <Field label="New Value" styles={styles}><DepartmentSelect value={value} departments={departments} styles={styles} onChange={onChange} /></Field>;
  }

  if (field.kind === "priceGroup") {
    return <Field label="New Value" styles={styles}><FormSelect value={value} onChange={(event) => onChange(event.target.value)} selectClassName={styles.input}><option value="">Select price group</option>{priceGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</FormSelect></Field>;
  }

  if (field.kind === "category") {
    return <Field label="New Value" styles={styles}><FormSelect value={value} onChange={(event) => onChange(event.target.value)} selectClassName={styles.input}><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</FormSelect></Field>;
  }

  return <Field label="New Value" styles={styles}><input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} className={inputClass(styles)} placeholder={field.kind === "percent" ? "0.00%" : "0.00"} /></Field>;
}

function ReadOnlyCell({ column, line, selectedPayee, invoiceNumber, selected, expanded, warnings, styles, onToggleSelected, onToggleExpanded }: {
  column: ColumnDefinition;
  line: DetailedPurchaseLine;
  selectedPayee: Payee | null;
  invoiceNumber: string;
  selected: boolean;
  expanded: boolean;
  warnings: string[];
  styles: ThemeClasses;
  onToggleSelected: (lineId: string, checked: boolean) => void;
  onToggleExpanded: (lineId: string) => void;
}) {
  const calculated = calculateLine(line);
  const commonClass = `border-b px-3 py-3 align-top ${styles.border} ${column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : ""}`;
  const stickyClass = column.id === "expand" ? `sticky left-0 z-[5] ${styles.isDark ? "bg-[#0f172a]" : "bg-white"}` : column.id === "select" ? `sticky left-12 z-[5] ${styles.isDark ? "bg-[#0f172a]" : "bg-white"}` : column.id === "description" ? `sticky left-24 z-[4] min-w-[260px] ${styles.isDark ? "bg-[#0f172a]" : "bg-white"}` : "";

  if (column.id === "expand") {
    return <td className={`${commonClass} ${stickyClass}`}><button type="button" onClick={() => onToggleExpanded(line.id)} className={`grid size-8 place-items-center rounded-[8px] border ${styles.input}`} aria-label={expanded ? "Collapse row" : "Expand row"}>{expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</button></td>;
  }
  if (column.id === "select") {
    return <td className={`${commonClass} ${stickyClass}`}><input type="checkbox" checked={selected} onChange={(event) => onToggleSelected(line.id, event.target.checked)} className="size-4 accent-[#4f2df2]" aria-label={`Select ${line.description || line.barcode || "purchase line"}`} /></td>;
  }

  const valueByColumn: Record<Exclude<ColumnId, "expand" | "select">, ReactNode> = {
    productNumber: line.productNumber ?? EMPTY,
    barcode: line.barcode || EMPTY,
    quantity: calculated.quantity || 0,
    description: <span className="inline-flex items-start gap-2">{warnings.length ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" aria-label="Row warnings" /> : null}{line.description || EMPTY}</span>,
    priceGroup: line.priceGroupName || EMPTY,
    department: line.departmentName || EMPTY,
    category: line.categoryName || EMPTY,
    unitsPerCase: calculated.unitsPerCase || 0,
    caseCost: formatCurrency(calculated.caseCost),
    caseDiscount: formatCurrency(calculated.caseDiscount),
    unitCostBeforeDiscount: formatCurrency(calculated.unitCostBeforeDiscount),
    unitCostAfterDiscount: formatCurrency(calculated.unitCostAfterDiscount),
    extendedCaseCost: formatCurrency(calculated.extendedCaseCost),
    currentRetail: formatCurrency(parseAmount(line.currentRetail)),
    newRetail: formatCurrency(parseAmount(line.newRetail)),
    extendedRetail: formatCurrency(calculated.extendedRetail),
    margin: formatPercent(calculated.margin),
    rebate: formatCurrency(calculated.rebate),
    marginAfterRebate: formatPercent(calculated.marginAfterRebate),
    taxRate: line.taxName || EMPTY,
    vendorItemNumber: line.vendorItemNumber || EMPTY,
    payee: selectedPayee?.name ?? EMPTY,
    invoiceNumber: invoiceNumber.trim() || EMPTY,
  };

  return <td className={`${commonClass} ${stickyClass} font-semibold`}>{valueByColumn[column.id]}</td>;
}

function ExpandedLinePanel({ line, warnings, selectedPayee, invoiceNumber, styles, onRemove }: {
  line: DetailedPurchaseLine;
  warnings: string[];
  selectedPayee: Payee | null;
  invoiceNumber: string;
  styles: ThemeClasses;
  onRemove: (id: string) => void;
}) {
  const calculated = calculateLine(line);
  return (
    <div className={`rounded-[8px] border p-4 ${styles.nested}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold">{line.description || "Purchase line"}</h3>
          <p className={`mt-1 text-xs font-semibold ${styles.muted}`}>{line.barcode || EMPTY} / Product #{line.productNumber ?? EMPTY}</p>
        </div>
        <button type="button" onClick={() => onRemove(line.id)} className={`inline-flex h-9 items-center gap-2 rounded-[8px] border px-3 text-xs font-extrabold ${styles.input}`}><Trash2 className="size-4" />Remove row</button>
      </div>
      <dl className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryField label="Department" value={line.departmentName || EMPTY} />
        <SummaryField label="Category" value={line.categoryName || EMPTY} />
        <SummaryField label="Price group" value={line.priceGroupName || EMPTY} />
        <SummaryField label="Tax rate" value={line.taxName || EMPTY} />
        <SummaryField label="Current inventory" value={line.existingInventoryQuantity === null ? EMPTY : String(line.existingInventoryQuantity)} />
        <SummaryField label="Payee" value={selectedPayee?.name ?? EMPTY} />
        <SummaryField label="Invoice number" value={invoiceNumber.trim() || EMPTY} />
        <SummaryField label="Discounted case cost" value={formatCurrency(calculated.discountedCaseCost)} />
        <SummaryField label="Cost per unit after discount" value={formatCurrency(calculated.unitCostAfterDiscount)} />
        <SummaryField label="Extended case cost" value={formatCurrency(calculated.extendedCaseCost)} />
        <SummaryField label="Extended retail" value={formatCurrency(calculated.extendedRetail)} />
        <SummaryField label="Margin after rebate" value={formatPercent(calculated.marginAfterRebate)} />
      </dl>
      {warnings.length ? <ul className="mt-4 space-y-1 text-sm font-semibold text-amber-500">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
    </div>
  );
}

function ColumnMenu({ visibleColumns, styles, onToggle, onShowAll, onHideNonessential, onReset }: {
  visibleColumns: Set<ColumnId>;
  styles: ThemeClasses;
  onToggle: (columnId: ColumnId, checked: boolean) => void;
  onShowAll: () => void;
  onHideNonessential: () => void;
  onReset: () => void;
}) {
  return (
    <div className={`absolute right-0 top-12 z-30 w-[320px] rounded-[8px] border p-3 shadow-xl ${styles.panel}`}>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onShowAll} className={`h-8 rounded-[8px] border px-2 text-xs font-extrabold ${styles.input}`}>Show All</button>
        <button type="button" onClick={onHideNonessential} className={`h-8 rounded-[8px] border px-2 text-xs font-extrabold ${styles.input}`}>Hide All Nonessential</button>
        <button type="button" onClick={onReset} className={`h-8 rounded-[8px] border px-2 text-xs font-extrabold ${styles.input}`}>Reset to Default</button>
      </div>
      <div className="mt-3 max-h-[360px] space-y-2 overflow-auto">
        {detailedColumns.map((column) => (
          <label key={column.id} className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={column.essential || visibleColumns.has(column.id)} disabled={column.essential} onChange={(event) => onToggle(column.id, event.target.checked)} className="size-4 accent-[#4f2df2]" />
            {column.label || (column.id === "expand" ? "Row expansion" : "Row selection")}
          </label>
        ))}
      </div>
    </div>
  );
}

function defaultVisibleColumns() {
  return new Set(detailedColumns.filter((column) => column.defaultVisible).map((column) => column.id));
}

function validateBulkValue(field: (typeof bulkFieldOptions)[number] | null | undefined, value: string) {
  if (!field) return false;
  if (field.kind === "department" || field.kind === "priceGroup" || field.kind === "category") return Boolean(value);
  if (!value.trim()) return false;
  const amount = Number(value.trim().replace(/[$,%]/g, ""));
  return Number.isFinite(amount) && amount >= 0;
}

function applyBulkValue(
  line: DetailedPurchaseLine,
  field: BulkField,
  value: string,
  departments: Department[],
  priceGroups: PriceGroup[],
  categories: ProductCategory[],
): DetailedPurchaseLine {
  if (field === "departmentId") {
    const department = departments.find((item) => item.id === value);
    return { ...line, departmentId: value, departmentName: department?.name ?? "" };
  }

  if (field === "priceGroupId") {
    const priceGroup = priceGroups.find((item) => item.id === value);
    return { ...line, priceGroupId: value, priceGroupName: priceGroup?.name ?? "" };
  }

  if (field === "categoryId") {
    const category = categories.find((item) => item.id === value);
    return { ...line, categoryId: value, categoryName: category?.name ?? "" };
  }

  return { ...line, [field]: value };
}

function findDuplicateProductIds(lines: DetailedPurchaseLine[]) {
  const counts = new Map<string, number>();
  lines.forEach((line) => {
    if (!line.productId) return;
    const key = `${line.productId}:${line.scannerEntryType ?? "purchase"}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key.split(":")[0]));
}

function mergeScannerLinesIntoDetailed(existingLines: DetailedPurchaseLine[], scannerLines: DetailedPurchaseLine[]) {
  return scannerLines.reduce<DetailedPurchaseLine[]>((merged, scannerLine) => {
    const compatibleIndex = merged.findIndex((line) => areCompatiblePurchaseLines(line, scannerLine));
    if (compatibleIndex === -1) {
      return [...merged, scannerLine];
    }

    return merged.map((line, index) => (
      index === compatibleIndex
        ? { ...line, quantity: String(parseAmount(line.quantity) + parseAmount(scannerLine.quantity)) }
        : line
    ));
  }, existingLines);
}

function areCompatiblePurchaseLines(left: DetailedPurchaseLine, right: DetailedPurchaseLine) {
  return Boolean(left.productId && left.productId === right.productId) &&
    (left.scannerEntryType ?? "purchase") === (right.scannerEntryType ?? "purchase") &&
    left.unitsPerCase === right.unitsPerCase &&
    left.caseCost === right.caseCost &&
    left.caseDiscount === right.caseDiscount &&
    left.unitCost === right.unitCost &&
    left.currentRetail === right.currentRetail &&
    left.newRetail === right.newRetail &&
    left.rebate === right.rebate &&
    left.departmentId === right.departmentId &&
    left.priceGroupId === right.priceGroupId &&
    left.categoryId === right.categoryId;
}

function ScannerPurchaseEntry({ inputRef, storeId, departments, styles, onPendingLinesChange, onSave }: {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  storeId: string;
  departments: Department[];
  styles: ThemeClasses;
  onPendingLinesChange: (lines: DetailedPurchaseLine[]) => void;
  onSave: (lines: DetailedPurchaseLine[]) => boolean;
}) {
  const [scannerState, setScannerState] = useState<ScannerState>("input");
  const [purchaseText, setPurchaseText] = useState("");
  const [returnText, setReturnText] = useState("");
  const [reviewRows, setReviewRows] = useState<DetailedPurchaseLine[]>([]);
  const [unresolved, setUnresolved] = useState<UnresolvedScanCode[]>([]);
  const [message, setMessage] = useState("");
  const [savedReview, setSavedReview] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);
  const editingRow = reviewRows.find((row) => row.id === editingId) ?? null;

  useEffect(() => {
    if (scannerState === "input") inputRef.current?.focus();
    if (scannerState === "reviewed") reviewHeadingRef.current?.focus();
  }, [inputRef, scannerState]);

  useEffect(() => {
    queueMicrotask(() => {
      onPendingLinesChange(scannerState === "reviewed" && !savedReview ? reviewRows : []);
    });
  }, [onPendingLinesChange, reviewRows, savedReview, scannerState]);

  async function reviewScanCodes() {
    if (scannerState === "reviewing") return;
    setScannerState("reviewing");
    setMessage("");
    setSavedReview(false);
    const parsed = [
      ...aggregateScanCodes(parseScanCodes(purchaseText), "purchase"),
      ...aggregateScanCodes(parseScanCodes(returnText), "return"),
    ];

    if (!parsed.length) {
      setReviewRows([]);
      setUnresolved([]);
      setMessage("Enter at least one scan code before review.");
      setScannerState("input");
      return;
    }

    const nextRows: DetailedPurchaseLine[] = [];
    const nextUnresolved: UnresolvedScanCode[] = [];

    for (const item of parsed) {
      if (!isValidScanCode(item.scanCode)) {
        nextUnresolved.push({ id: createClientId("unresolved"), scanCode: item.scanCode, entryType: item.entryType, occurrences: item.occurrences, reason: "Scan code format is invalid." });
        continue;
      }

      try {
        const response = await lookupProductByBarcode(storeId, item.scanCode);
        if (!response.found) {
          nextUnresolved.push({ id: createClientId("unresolved"), scanCode: item.scanCode, entryType: item.entryType, occurrences: item.occurrences, reason: "No product matched this scan code." });
          continue;
        }

        nextRows.push({
          ...newLineFromProduct(response.product),
          id: createClientId("scanner"),
          quantity: String(item.occurrences),
          scannerEntryType: item.entryType,
        });
      } catch {
        nextUnresolved.push({ id: createClientId("unresolved"), scanCode: item.scanCode, entryType: item.entryType, occurrences: item.occurrences, reason: "Lookup failed. Retry after checking the connection." });
      }
    }

    setReviewRows(nextRows);
    setUnresolved(nextUnresolved);
    setScannerState("reviewed");
  }

  function updateReviewRow(id: string, patch: Partial<DetailedPurchaseLine>) {
    setReviewRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function removeUnresolved(id: string) {
    setUnresolved((current) => current.filter((item) => item.id !== id));
  }

  function saveReviewedRows() {
    if (scannerState === "saving" || savedReview) return;
    const invalidRows = reviewRows.filter((row) => getLineWarnings(row, findDuplicateProductIds(reviewRows)).length > 0);
    if (unresolved.length) {
      setMessage("Remove unresolved scan codes before saving valid rows.");
      return;
    }
    if (invalidRows.length) {
      setMessage("Resolve scanner row warnings before saving.");
      return;
    }
    setSavedReview(true);
    setScannerState("saving");
    try {
      const saved = onSave(reviewRows);
      if (!saved) {
        setSavedReview(false);
        setScannerState("reviewed");
        setMessage("Scanner rows could not be saved. Please retry.");
        return;
      }
      setPurchaseText("");
      setReturnText("");
      setReviewRows([]);
      setUnresolved([]);
      setEditingId(null);
      setMessage("");
      setScannerState("input");
    } catch {
      setSavedReview(false);
      setScannerState("reviewed");
      setMessage("Scanner rows could not be saved. Please retry.");
    }
  }

  return (
    <div className="space-y-4" role="tabpanel" id="panel-scanner" aria-labelledby="tab-scanner">
      {scannerState === "input" || scannerState === "reviewing" || scannerState === "error" ? (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <label className="block text-sm font-bold">
              Purchase Items
              <textarea ref={inputRef} value={purchaseText} onChange={(event) => setPurchaseText(event.target.value)} className={`${inputClass(styles, "min-h-36 py-3")} mt-2 resize-y`} placeholder="Enter one scan code per line" />
            </label>
            <label className="block text-sm font-bold">
              Return Items
              <textarea value={returnText} onChange={(event) => setReturnText(event.target.value)} className={`${inputClass(styles, "min-h-36 py-3")} mt-2 resize-y`} placeholder="Enter returned scan codes, one per line" />
            </label>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => void reviewScanCodes()} disabled={scannerState === "reviewing"} className="inline-flex h-11 min-w-28 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {scannerState === "reviewing" ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Review
            </button>
          </div>
        </div>
      ) : null}

      {scannerState === "reviewed" || scannerState === "saving" ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 ref={reviewHeadingRef} tabIndex={-1} className="text-base font-extrabold outline-none">Scanner Review Results</h3>
            <div className="flex gap-2">
              <button type="button" onClick={() => setScannerState("input")} disabled={scannerState === "saving"} className={`h-10 rounded-[8px] border px-4 text-sm font-extrabold ${styles.input}`}>Back</button>
              <button type="button" onClick={saveReviewedRows} disabled={scannerState === "saving" || savedReview || !reviewRows.length || Boolean(unresolved.length)} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60">
                {scannerState === "saving" ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save
              </button>
            </div>
          </div>

          <div className={`overflow-hidden rounded-[8px] border ${styles.panel}`}>
            <div className="max-h-[360px] overflow-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className={`sticky top-0 z-10 ${styles.isDark ? "bg-[#111b32]" : "bg-[#f0edff]"}`}>
                  <tr className={`border-b text-xs font-extrabold uppercase ${styles.border} ${styles.muted}`}>
                    {["Scan Code", "Description", "Qty", "Case Cost", "Department", "Entry Type", "Actions"].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {reviewRows.length ? reviewRows.map((row) => {
                    const warnings = getLineWarnings(row, findDuplicateProductIds(reviewRows));
                    return (
                      <tr key={row.id} className={`border-b ${styles.border} ${warnings.length ? styles.isDark ? "bg-amber-500/10" : "bg-amber-50" : ""}`}>
                        <td className="px-3 py-3 font-semibold">{row.barcode}</td>
                        <td className="px-3 py-3 font-semibold">{warnings.length ? <AlertTriangle className="mr-2 inline size-4 text-amber-500" /> : null}{row.description}</td>
                        <td className="px-3 py-3 text-right font-semibold">{parseAmount(row.quantity)}</td>
                        <td className="px-3 py-3 text-right font-semibold">{row.caseCost ? formatCurrency(parseAmount(row.caseCost)) : EMPTY}</td>
                        <td className="px-3 py-3 font-semibold">{row.departmentName || EMPTY}</td>
                        <td className="px-3 py-3"><span className={`rounded-[8px] px-2 py-1 text-xs font-extrabold ${row.scannerEntryType === "return" ? "bg-amber-500/15 text-amber-500" : styles.subtle}`}>{row.scannerEntryType === "return" ? "Return" : "Purchase"}</span></td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setEditingId(row.id)} disabled={savedReview} className={`grid size-9 place-items-center rounded-[8px] border disabled:cursor-not-allowed disabled:opacity-60 ${styles.input}`} aria-label={`Edit ${row.description}`}><Pencil className="size-4" /></button>
                            <button type="button" onClick={() => setReviewRows((current) => current.filter((item) => item.id !== row.id))} disabled={savedReview} className={`grid size-9 place-items-center rounded-[8px] border disabled:cursor-not-allowed disabled:opacity-60 ${styles.input}`} aria-label={`Remove ${row.description}`}><X className="size-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : <tr><td colSpan={7} className={`p-6 text-sm font-semibold ${styles.muted}`}>No valid products resolved.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {unresolved.length ? <UnresolvedScanCodes items={unresolved} styles={styles} onRemove={removeUnresolved} onRetry={() => void reviewScanCodes()} /> : null}
        </div>
      ) : null}

      <div className={`rounded-[8px] border p-3 text-xs font-semibold leading-5 ${styles.nested}`}>
        Import from file or copy and paste scan codes. Enter each scan code on a separate line.
        <span className="mt-1 block">Example: 123456789012</span>
        <span className="block">987654321098</span>
      </div>

      {message ? <p className={`text-sm font-bold ${message.includes("Saved") ? "text-emerald-500" : "text-amber-500"}`}>{message}</p> : null}

      {editingRow ? <ScannerEditPanel row={editingRow} departments={departments} styles={styles} onClose={() => setEditingId(null)} onUpdate={(patch) => updateReviewRow(editingRow.id, patch)} /> : null}
    </div>
  );
}

function ScannerEditPanel({ row, departments, styles, onClose, onUpdate }: {
  row: DetailedPurchaseLine;
  departments: Department[];
  styles: ThemeClasses;
  onClose: () => void;
  onUpdate: (patch: Partial<DetailedPurchaseLine>) => void;
}) {
  return (
    <div className={`rounded-[8px] border p-4 ${styles.nested}`} role="dialog" aria-label="Edit scanner row">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-extrabold">Edit Scanner Row</h3>
          <p className={`mt-1 text-xs font-semibold ${styles.muted}`}>{row.description}</p>
        </div>
        <button type="button" onClick={onClose} className={`grid size-9 place-items-center rounded-[8px] border ${styles.input}`} aria-label="Close scanner row editor"><X className="size-4" /></button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Field label="Quantity" styles={styles}><input inputMode="decimal" value={row.quantity} onChange={(event) => onUpdate({ quantity: event.target.value })} className={inputClass(styles)} /></Field>
        <Field label="Case Cost" styles={styles}><input inputMode="decimal" value={row.caseCost} onChange={(event) => onUpdate({ caseCost: event.target.value })} className={inputClass(styles)} /></Field>
        <Field label="Department" styles={styles}><DepartmentSelect value={row.departmentId} departments={departments} styles={styles} onChange={(value) => { const department = departments.find((item) => item.id === value); onUpdate({ departmentId: value, departmentName: department?.name ?? "" }); }} /></Field>
        <Field label="Entry Type" styles={styles}>
          <FormSelect value={row.scannerEntryType ?? "purchase"} onChange={(event) => onUpdate({ scannerEntryType: event.target.value as ScannerEntryType })} selectClassName={styles.input}>
            <option value="purchase">Purchase</option>
            <option value="return">Return</option>
          </FormSelect>
        </Field>
      </div>
    </div>
  );
}

function UnresolvedScanCodes({ items, styles, onRemove, onRetry }: { items: UnresolvedScanCode[]; styles: ThemeClasses; onRemove: (id: string) => void; onRetry: () => void }) {
  return (
    <section className={`rounded-[8px] border p-4 ${styles.nested}`} aria-label="Unresolved scan codes">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-extrabold">Unresolved Scan Codes</h3>
        <button type="button" onClick={onRetry} className={`h-9 rounded-[8px] border px-3 text-xs font-extrabold ${styles.input}`}>Retry</button>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead><tr className={`border-b text-xs font-extrabold uppercase ${styles.border} ${styles.muted}`}>{["Scan Code", "Source", "Occurrences", "Reason", "Actions"].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead>
          <tbody>{items.map((item) => <tr key={item.id} className={`border-b ${styles.border}`}><td className="px-3 py-2 font-semibold">{item.scanCode}</td><td className="px-3 py-2 font-semibold">{item.entryType === "return" ? "Return" : "Purchase"}</td><td className="px-3 py-2 font-semibold">{item.occurrences}</td><td className="px-3 py-2 font-semibold text-amber-500">{item.reason}</td><td className="px-3 py-2"><button type="button" onClick={() => onRemove(item.id)} className={`h-9 rounded-[8px] border px-3 text-xs font-extrabold ${styles.input}`}>Remove</button></td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function parseScanCodes(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function isValidScanCode(value: string) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$/.test(value);
}

function aggregateScanCodes(codes: string[], entryType: ScannerEntryType) {
  const counts = new Map<string, number>();
  codes.forEach((code) => counts.set(code, (counts.get(code) ?? 0) + 1));
  return [...counts.entries()].map(([scanCode, occurrences]) => ({ scanCode, occurrences, entryType }));
}

function PurchaseExpenses({ expenses, styles, onAdd, onRemove, onUpdate }: {
  expenses: PurchaseExpense[];
  styles: ThemeClasses;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<PurchaseExpense>) => void;
}) {
  return (
    <div className="space-y-3" role="tabpanel" id="panel-expenses" aria-labelledby="tab-expenses">
      {expenses.map((expense) => (
        <div key={expense.id} className="grid gap-3 md:grid-cols-[1fr_220px_44px]">
          <input value={expense.description} onChange={(event) => onUpdate(expense.id, { description: event.target.value })} placeholder="Description" className={inputClass(styles)} />
          <input inputMode="decimal" value={expense.amount} onChange={(event) => onUpdate(expense.id, { amount: event.target.value })} placeholder="Amount" className={inputClass(styles)} />
          <button type="button" onClick={() => onRemove(expense.id)} className={`grid size-11 place-items-center rounded-[8px] border ${styles.input}`} aria-label="Remove expense"><Trash2 className="size-4" /></button>
        </div>
      ))}
      <button type="button" onClick={onAdd} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#4f2df2] px-3 text-sm font-extrabold text-white"><Plus className="size-4" />Add expense</button>
    </div>
  );
}

function PurchaseSummary({ header, selectedPayee, manual, summaryTable, warnings, styles }: {
  header: PurchaseHeaderState;
  selectedPayee: Payee | null;
  manual: ManualPurchaseEntryState;
  summaryTable: PurchaseSummaryTableData;
  warnings: string[];
  styles: ThemeClasses;
}) {
  const typeLabel = purchaseTypes.find(([value]) => value === header.purchaseType)?.[1] ?? header.purchaseType;
  return (
    <div className="space-y-4" role="tabpanel" id="panel-summary" aria-labelledby="tab-summary">
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <dl className={`grid gap-4 rounded-[8px] border p-4 md:grid-cols-2 ${styles.nested}`}>
          <SummaryField label="Purchase date" value={header.purchaseDate || EMPTY} />
          <SummaryField label="Payee" value={selectedPayee?.name ?? EMPTY} />
          <SummaryField label="Invoice number" value={header.invoiceNumber.trim() || EMPTY} />
          <SummaryField label="Purchase type" value={typeLabel} />
          <SummaryField label="Manual entry totals" value={`${formatCurrency(parseAmount(manual.cost))} cost / ${formatCurrency(parseAmount(manual.retail))} retail`} />
          <SummaryField label="Purchase subtotal" value={`${formatCurrency(summaryTable.purchaseSubtotal.cost)} cost / ${formatCurrency(summaryTable.purchaseSubtotal.extendedRetail)} retail`} />
          <SummaryField label="Expense totals" value={formatCurrency(summaryTable.expenses.reduce((total, expense) => total + expense.cost, 0))} />
          <SummaryField label="Total cost" value={formatCurrency(summaryTable.grandTotal.cost)} />
          <SummaryField label="Total retail" value={formatCurrency(summaryTable.grandTotal.extendedRetail)} />
          <SummaryField label="Overall margin" value={formatPercent(summaryTable.grandTotal.marginPercent)} />
        </dl>
        <div className={`rounded-[8px] border p-4 ${styles.nested}`}>
          <h3 className="font-extrabold">Validation warnings</h3>
          {warnings.length ? <ul className="mt-3 space-y-2 text-sm font-semibold text-amber-500">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : <p className={`mt-3 text-sm font-semibold ${styles.muted}`}>No warnings.</p>}
        </div>
      </div>
      <DepartmentPurchaseSummaryTable summaryTable={summaryTable} styles={styles} />
    </div>
  );
}

function CompactPurchaseTotalsTable({ totals, styles }: { totals: ReturnType<typeof calculatePurchaseTotals>; styles: ThemeClasses }) {
  const rows = [
    ["Manual Entry", totals.manual],
    ["Detailed / Scanner Entries", totals.detailed],
    ["Expenses", totals.expenses],
    ["Total", totals.total],
  ] as const;

  return (
    <section className={`overflow-hidden rounded-[8px] border ${styles.panel}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead><tr className={`border-b text-xs font-extrabold uppercase ${styles.border} ${styles.muted}`}>{["Entry Type", "Quantity", "Cost", "Retail", "Margin", "Margin After Rebate"].map((label) => <th key={label} className="px-4 py-3 text-right first:text-left">{label}</th>)}</tr></thead>
          <tbody>{rows.map(([label, row]) => <tr key={label} className={`border-b ${styles.border} ${label === "Total" ? styles.subtle : ""}`}><td className="px-4 py-3 font-extrabold">{label}</td><td className="px-4 py-3 text-right font-bold">{formatQuantity(row.quantity)}</td><td className="px-4 py-3 text-right font-bold">{formatCurrency(row.cost)}</td><td className="px-4 py-3 text-right font-bold">{formatCurrency(row.retail)}</td><td className="px-4 py-3 text-right font-bold">{formatPercent(row.margin)}</td><td className="px-4 py-3 text-right font-bold">{formatPercent(row.marginAfterRebate)}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function DepartmentPurchaseSummaryTable({ summaryTable, styles }: { summaryTable: PurchaseSummaryTableData; styles: ThemeClasses }) {
  return (
    <section className={`overflow-hidden rounded-[8px] border ${styles.panel}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead><tr className={`border-b text-xs font-extrabold uppercase ${styles.border} ${styles.muted}`}>{["Department / Entry", "Quantity", "Cost", "Extended Retail", "Margin", "Margin After Rebate"].map((label) => <th key={label} className="px-4 py-3 text-right first:text-left">{label}</th>)}</tr></thead>
          <tbody>
            {summaryTable.departments.map((department) => (
              <SummaryTableRow
                key={department.departmentId ?? "unassigned"}
                label={department.departmentName}
                totals={department}
                styles={styles}
                issue={department.hasValidationIssue}
              />
            ))}
            <SummaryTableRow label="Purchase Subtotal" totals={summaryTable.purchaseSubtotal} styles={styles} tone="subtotal" />
            {summaryTable.expenses.map((expense) => (
              <tr key={expense.id} className={`border-b ${styles.border} ${styles.isDark ? "bg-white/[0.02]" : "bg-slate-50"}`}>
                <td className="px-4 py-3 font-bold">Expense - {expense.description}</td>
                <td className="px-4 py-3 text-right font-bold">{expense.quantity}</td>
                <td className="px-4 py-3 text-right font-bold">{formatCurrency(expense.cost)}</td>
                <td className="px-4 py-3 text-right font-bold">{formatCurrency(0)}</td>
                <td className="px-4 py-3 text-right font-bold">{EMPTY}</td>
                <td className="px-4 py-3 text-right font-bold">{EMPTY}</td>
              </tr>
            ))}
            <SummaryTableRow label="Grand Total" totals={summaryTable.grandTotal} styles={styles} tone="grand" />
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SummaryTableRow({ label, totals, styles, tone, issue }: { label: string; totals: SummaryTotals; styles: ThemeClasses; tone?: "subtotal" | "grand"; issue?: boolean }) {
  const toneClass = tone === "grand" ? "bg-[#4f2df2] text-white" : tone === "subtotal" ? styles.subtle : "";
  const issueClass = issue ? "text-amber-500" : "";
  return (
    <tr className={`border-b ${styles.border} ${toneClass}`}>
      <td className={`px-4 py-3 font-extrabold ${issueClass}`}>{label}</td>
      <td className="px-4 py-3 text-right font-bold">{formatQuantity(totals.quantity)}</td>
      <td className="px-4 py-3 text-right font-bold">{formatCurrency(totals.cost)}</td>
      <td className="px-4 py-3 text-right font-bold">{formatCurrency(totals.extendedRetail)}</td>
      <td className="px-4 py-3 text-right font-bold">{formatPercent(totals.marginPercent)}</td>
      <td className="px-4 py-3 text-right font-bold">{formatPercent(totals.marginAfterRebatePercent)}</td>
    </tr>
  );
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function TabList({ activeTab, styles, onChange }: { activeTab: PurchaseTabId; styles: ThemeClasses; onChange: (tab: PurchaseTabId) => void }) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const offset = event.key === "ArrowRight" ? 1 : -1;
    onChange(tabs[(currentIndex + offset + tabs.length) % tabs.length].id);
  }
  return (
    <div role="tablist" aria-label="Purchase entry sections" onKeyDown={handleKeyDown} className={`flex gap-1 overflow-x-auto border-b p-2 ${styles.border}`}>
      {tabs.map((tab) => <button key={tab.id} id={`tab-${tab.id}`} role="tab" aria-selected={activeTab === tab.id} aria-controls={`panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => onChange(tab.id)} className={`h-10 whitespace-nowrap rounded-[8px] px-3 text-sm font-extrabold transition ${activeTab === tab.id ? "bg-[#4f2df2] text-white" : `${styles.muted} hover:bg-[#7c5cff]/10`}`}>{tab.label}</button>)}
    </div>
  );
}

function ActionBar({ saving, canSubmit, onCancel, onSaveDraft, onCreate }: { saving: PurchaseStatus | null; canSubmit: boolean; onCancel: () => void; onSaveDraft: () => void; onCreate: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={onSaveDraft} disabled={!canSubmit} className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#7c5cff]/35 px-3 text-sm font-extrabold text-[#7c5cff] disabled:cursor-not-allowed disabled:opacity-60">{saving === "DRAFT" ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}Save Draft</button>
      <button type="button" onClick={onCreate} disabled={!canSubmit} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#4f2df2] px-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60">{saving === "OPEN" ? <LoaderCircle className="size-4 animate-spin" /> : <FilePlus2 className="size-4" />}Save / Create Purchase</button>
      <button type="button" onClick={onCancel} disabled={Boolean(saving)} className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-slate-400/30 px-3 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-60"><X className="size-4" />Cancel</button>
    </div>
  );
}

function DepartmentSelect({ value, departments, styles, compact, onChange }: { value: string; departments: Department[]; styles: ThemeClasses; compact?: boolean; onChange: (value: string) => void }) {
  return (
    <FormSelect value={value} onChange={(event) => onChange(event.target.value)} selectClassName={`${styles.input} ${compact ? "h-10" : ""}`}>
      <option value="">Select department</option>
      {departments.map((department) => <option key={department.id} value={department.id}>{department.posDepartmentNumber} - {department.name}</option>)}
    </FormSelect>
  );
}

function Checkbox({ label, checked, styles, onChange }: { label: string; checked: boolean; styles: ThemeClasses; onChange: (checked: boolean) => void }) {
  return <label className={`inline-flex items-center gap-2 rounded-[8px] border px-3 py-2 text-sm font-bold ${styles.nested}`}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[#4f2df2]" />{label}</label>;
}

function Field({ label, children, styles, required, helper, error }: { label: string; children: ReactNode; styles: ThemeClasses; required?: boolean; helper?: string; error?: string }) {
  return <label className="block text-sm font-bold">{label}{required ? <span aria-hidden="true"> *</span> : null}<span className="mt-2 block">{children}</span>{helper ? <span className={`mt-2 block text-xs font-semibold leading-5 ${styles.muted}`}>{helper}</span> : null}{error ? <span className="mt-2 block text-xs font-bold text-red-500">{error}</span> : null}</label>;
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-extrabold uppercase text-slate-500">{label}</dt><dd className="mt-1 text-sm font-bold">{value}</dd></div>;
}

function Alert({ message, styles }: { message: string; styles: ThemeClasses }) {
  return <div className={`rounded-[8px] border p-3 text-sm font-bold text-red-500 ${styles.nested}`}>{message}</div>;
}

function inputClass(styles: ThemeClasses, extra = "h-11") {
  return `${extra} w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 disabled:cursor-not-allowed disabled:opacity-70 ${styles.input}`;
}

function payeeHelper(state: "loading" | "ready" | "empty" | "error", count: number, selectedPayee: Payee | null) {
  if (state === "loading") return "Loading active payees...";
  if (state === "error") return "Unable to load active payees.";
  if (state === "empty") return "No active payees are available.";
  return selectedPayee ? `Selected: ${selectedPayee.name}` : `${count} active payees available.`;
}

function buildPayload(status: PurchaseStatus, header: PurchaseHeaderState, manual: ManualPurchaseEntryState, lines: DetailedPurchaseLine[], expenses: PurchaseExpense[]): CreatePurchaseInput {
  return {
    purchaseDate: header.purchaseDate,
    payeeId: header.payeeId,
    invoiceNumber: header.invoiceNumber.trim(),
    purchaseType: header.purchaseType,
    status,
    manualEntry: {
      defaultMargin: manual.defaultMargin.trim() || null,
      cost: manual.cost.trim() || null,
      retail: manual.retail.trim() || null,
      margin: calculateMargin(parseAmount(manual.cost), parseAmount(manual.retail))?.toFixed(2) ?? null,
      departmentId: manual.departmentId || null,
    },
    lineItems: lines.filter((line) => line.productId || line.barcode || line.description).map((line) => ({
      productId: line.productId || undefined,
      barcode: line.barcode.trim() || undefined,
      description: line.description.trim() || undefined,
      quantity: parseAmount(line.quantity),
      unitsPerCase: line.unitsPerCase.trim() ? parseAmount(line.unitsPerCase) : null,
      caseCost: line.caseCost.trim() || null,
      caseDiscount: line.caseDiscount.trim() || null,
      unitCost: line.unitCost.trim() || null,
      currentRetail: line.currentRetail.trim() || null,
      newRetail: line.newRetail.trim() || null,
      rebate: line.rebate.trim() || null,
      departmentId: line.departmentId || null,
      priceGroupId: line.priceGroupId || null,
      categoryId: line.categoryId || null,
      entryType: line.scannerEntryType,
    })),
    expenses: expenses.filter((expense) => expense.description.trim() || parseAmount(expense.amount) > 0).map((expense) => ({
      description: expense.description.trim(),
      amount: expense.amount.trim() || "0",
    })),
  };
}

function validationWarnings(header: PurchaseHeaderState, manual: ManualPurchaseEntryState, lines: DetailedPurchaseLine[], expenses: PurchaseExpense[], payeeState: string, departmentError: boolean) {
  const warnings: string[] = [];
  if (!header.payeeId && payeeState !== "loading") warnings.push("Select an active payee before saving.");
  if (!header.invoiceNumber.trim()) warnings.push("Invoice number is required.");
  if (departmentError) warnings.push("Departments could not be loaded; department validation may fail.");
  if (parseAmount(manual.cost) === 0 && lines.every((line) => parseAmount(line.unitCost) === 0 && parseAmount(line.caseCost) === 0) && expenses.every((expense) => parseAmount(expense.amount) === 0)) warnings.push("No purchase cost has been entered yet.");
  return warnings;
}
