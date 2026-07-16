"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Edit3, LoaderCircle, RotateCcw, Save, Search, ToggleLeft, ToggleRight, X } from "lucide-react";
import { z } from "zod";
import { BackOfficeShell } from "@/src/components/layout/BackOfficeShell";
import {
  createDepartment,
  getStoreDepartments,
  getTaxes,
  updateDepartment,
  type Department,
  type DepartmentMinimumAge,
  type DepartmentType,
  type ProductReference,
} from "@/src/features/products/api";

type DepartmentFormState = {
  name: string;
  posDepartmentNumber: string;
  type: DepartmentType | "";
  defaultTaxId: string;
  minimumAge: DepartmentMinimumAge;
  defaultRetailMargin: string;
  minimumRingUpAmount: string;
  maximumRingUpAmount: string;
  trackInventory: boolean;
  allowNegativeInventorySales: boolean;
  allowEbt: boolean;
  allowManualRingUp: boolean;
  onPos: boolean;
  isActive: boolean;
};

type StatusFilter = "all" | "active" | "inactive";

const defaultForm: DepartmentFormState = {
  name: "",
  posDepartmentNumber: "",
  type: "merchandise",
  defaultTaxId: "",
  minimumAge: "none",
  defaultRetailMargin: "",
  minimumRingUpAmount: "",
  maximumRingUpAmount: "",
  trackInventory: true,
  allowNegativeInventorySales: false,
  allowEbt: false,
  allowManualRingUp: false,
  onPos: true,
  isActive: true,
};

const departmentTypes = [
  ["merchandise", "Merchandise"],
  ["lottery", "Lottery"],
  ["fuel", "Fuel"],
  ["misc_services", "Misc. Services"],
] satisfies Array<[DepartmentType, string]>;

const minimumAges = [
  ["none", "None"],
  ["age_18", "18"],
  ["age_18_time_sensitive", "18 - Time Sensitive"],
  ["age_21", "21"],
  ["age_21_time_sensitive", "21 - Time Sensitive"],
] satisfies Array<[DepartmentMinimumAge, string]>;

const nameSchema = z
  .string()
  .transform((value) => value.trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(2, "Department name must be at least 2 characters.")
      .max(100, "Department name must be 100 characters or fewer.")
      .refine((value) => !/[\x00-\x1f\x7f]/.test(value), "Department name contains unsupported characters.")
      .refine((value) => /^[A-Za-z0-9 '&\-\/()]+$/.test(value), "Use letters, numbers, spaces, apostrophes, ampersands, hyphens, slashes, or parentheses."),
  );

const departmentSchema = z.object({
  name: nameSchema,
  posDepartmentNumber: z
    .string()
    .trim()
    .regex(/^\d+$/, "POS department number is required.")
    .transform((value) => Number(value))
    .pipe(z.number().int().min(1, "POS department number must be at least 1.").max(9999, "POS department number must be 9999 or lower.")),
  type: z.enum(["merchandise", "lottery", "fuel", "misc_services"], { error: "Department type is required." }),
  defaultTaxId: z.string().min(1, "Default tax rate is required."),
  minimumAge: z.enum(["none", "age_18", "age_18_time_sensitive", "age_21", "age_21_time_sensitive"]),
  defaultRetailMargin: optionalDecimalString("Default retail margin", 4).refine((value) => value === null || (value >= 0 && value <= 100), "Default retail margin must be between 0 and 100."),
  minimumRingUpAmount: optionalDecimalString("Minimum ring-up amount", 2),
  maximumRingUpAmount: optionalDecimalString("Maximum ring-up amount", 2),
  trackInventory: z.boolean(),
  allowNegativeInventorySales: z.boolean(),
  allowEbt: z.boolean(),
  allowManualRingUp: z.boolean(),
  onPos: z.boolean(),
  isActive: z.boolean(),
}).refine(
  (value) =>
    value.minimumRingUpAmount === null ||
    value.maximumRingUpAmount === null ||
    value.minimumRingUpAmount <= value.maximumRingUpAmount,
  {
    path: ["maximumRingUpAmount"],
    message: "Maximum ring-up amount must be greater than or equal to the minimum.",
  },
);

function optionalDecimalString(label: string, maxScale: number) {
  return z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .pipe(
      z.union([
        z.null(),
        z
          .string()
          .regex(/^\d+(\.\d+)?$/, `${label} must be a valid number.`)
          .refine((value) => (value.split(".")[1] ?? "").length <= maxScale, `${label} must have ${maxScale} or fewer decimal places.`)
          .transform((value) => Number(value))
          .refine((value) => Number.isFinite(value), `${label} must be finite.`)
          .refine((value) => value >= 0, `${label} must be zero or greater.`),
      ]),
    );
}

export function DepartmentsWorkspace() {
  return (
    <BackOfficeShell activeItem="productSetup" requiredPermission="manage_products">
      {({ theme, selectedStore, account }) => (
        <DepartmentsWorkspaceContent
          theme={theme}
          storeId={selectedStore.id}
          canEdit={account?.role === "owner" || account?.role === "partner" || account?.permissions?.includes("manage_products") === true}
        />
      )}
    </BackOfficeShell>
  );
}

function DepartmentsWorkspaceContent({
  theme,
  storeId,
  canEdit,
}: {
  theme: "light" | "dark";
  storeId: string;
  canEdit: boolean;
}) {
  const isDark = theme === "dark";
  const formRef = useRef<HTMLFormElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [taxes, setTaxes] = useState<ProductReference[]>([]);
  const [form, setForm] = useState<DepartmentFormState>(defaultForm);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof DepartmentFormState, string>>>({});
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Department | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const cardClass = isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white";
  const nestedClass = isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]";
  const inputClass = isDark
    ? "border-slate-400/15 bg-white/[0.04] text-[#f4f1ff] placeholder:text-slate-500 disabled:bg-white/[0.02] disabled:text-slate-500"
    : "border-[#ded8f3] bg-white text-slate-950 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";

  const refreshDepartments = useCallback(async () => {
    setIsLoading(true);
    setPageError("");

    try {
      const [departmentItems, taxItems] = await Promise.all([
        getStoreDepartments(storeId),
        getTaxes(storeId),
      ]);
      setDepartments(departmentItems);
      setTaxes(taxItems);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Departments request failed for", `/stores/${storeId}/departments`, error);
      }
      setPageError("Departments could not be loaded. Please refresh and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshDepartments();
    });
  }, [refreshDepartments]);

  const visibleDepartments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return departments.filter((department) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && department.isActive) ||
        (statusFilter === "inactive" && !department.isActive);
      const matchesSearch = !normalizedSearch || department.name.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [departments, search, statusFilter]);

  function updateForm<K extends keyof DepartmentFormState>(field: K, value: DepartmentFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setPageError("");
    setSuccessMessage("");
  }

  function resetForm() {
    if (isSaving) return;
    setForm(defaultForm);
    setEditingDepartment(null);
    setFieldErrors({});
    setPageError("");
    setSuccessMessage("");
    queueMicrotask(() => nameInputRef.current?.focus());
  }

  function startEdit(department: Department) {
    if (department.defaultTax && !taxes.some((tax) => tax.id === department.defaultTaxId)) {
      setTaxes((current) => [...current, { ...department.defaultTax!, name: `${department.defaultTax!.name} (Inactive)` }]);
    }
    setEditingDepartment(department);
    setForm({
      name: department.name,
      posDepartmentNumber: String(department.posDepartmentNumber),
      type: department.type,
      defaultTaxId: department.defaultTaxId ?? "",
      minimumAge: department.minimumAge,
      defaultRetailMargin: numberInputValue(department.defaultRetailMargin),
      minimumRingUpAmount: numberInputValue(department.minimumRingUpAmount),
      maximumRingUpAmount: numberInputValue(department.maximumRingUpAmount),
      trackInventory: department.trackInventory,
      allowNegativeInventorySales: department.allowNegativeInventorySales,
      allowEbt: department.allowEbt,
      allowManualRingUp: department.allowManualRingUp,
      onPos: department.onPos,
      isActive: department.isActive,
    });
    setFieldErrors({});
    setPageError("");
    setSuccessMessage("");
    queueMicrotask(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      nameInputRef.current?.focus();
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!canEdit || isSaving) return;
    setFieldErrors({});
    setPageError("");
    setSuccessMessage("");

    const parsed = departmentSchema.safeParse(form);

    if (!parsed.success) {
      setFieldErrors(
        parsed.error.issues.reduce<Partial<Record<keyof DepartmentFormState, string>>>((errors, issue) => {
          const field = issue.path[0] as keyof DepartmentFormState | undefined;
          if (field && !errors[field]) errors[field] = issue.message;
          return errors;
        }, {}),
      );
      return;
    }

    setIsSaving(true);

    try {
      if (editingDepartment) {
        await updateDepartment(storeId, editingDepartment.id, parsed.data);
        setSuccessMessage("Department updated.");
      } else {
        await createDepartment(storeId, parsed.data);
        setSuccessMessage("Department created.");
      }

      setForm(defaultForm);
      setEditingDepartment(null);
      await refreshDepartments();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Department could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function setDepartmentStatus(department: Department, isActive: boolean) {
    if (!canEdit || statusChangingId) return;
    setStatusChangingId(department.id);
    setPageError("");
    setSuccessMessage("");

    try {
      await updateDepartment(storeId, department.id, { isActive });
      setSuccessMessage(isActive ? "Department activated." : "Department deactivated.");
      await refreshDepartments();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Department status could not be updated.");
    } finally {
      setStatusChangingId(null);
      setDeactivateTarget(null);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[1320px] space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-normal">Departments</h1>
        <p className={`mt-2 max-w-[760px] text-sm font-semibold leading-6 ${mutedClass}`}>
          Organize products into store departments for catalog and register workflows.
        </p>
      </header>

      <div className="space-y-3" aria-live="polite">
        {successMessage ? <Alert tone="success" title={successMessage} /> : null}
        {pageError ? <Alert tone="error" title={pageError} /> : null}
        {!canEdit ? <Alert tone="warning" title="You do not have permission to manage departments." /> : null}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <DepartmentFormSection
          title="Department Details"
          subtitle={editingDepartment ? "Update this department's core setup." : "Add the core setup for products and POS workflows."}
          className={cardClass}
          mutedClass={mutedClass}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Department name" error={fieldErrors.name} helper="Used to group products in the catalog and POS.">
              <input ref={nameInputRef} value={form.name} onChange={(event) => updateForm("name", event.target.value)} disabled={!canEdit || isSaving} placeholder="e.g. Beverages" className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 disabled:cursor-not-allowed ${inputClass}`} />
            </Field>
            <Field label="POS department number" error={fieldErrors.posDepartmentNumber} helper="Controls POS card order and report line number.">
              <input value={form.posDepartmentNumber} onChange={(event) => updateForm("posDepartmentNumber", event.target.value)} disabled={!canEdit || isSaving} inputMode="numeric" placeholder="1" className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 disabled:cursor-not-allowed ${inputClass}`} />
            </Field>
            <Field label="Department type" error={fieldErrors.type}>
              <select value={form.type} onChange={(event) => updateForm("type", event.target.value as DepartmentFormState["type"])} disabled={!canEdit || isSaving} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 disabled:cursor-not-allowed ${inputClass}`}>
                {departmentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Default tax rate" error={fieldErrors.defaultTaxId} helper={!taxes.length ? "Create an active tax rate before creating a department." : undefined}>
              <select value={form.defaultTaxId} onChange={(event) => updateForm("defaultTaxId", event.target.value)} disabled={!canEdit || isSaving || !taxes.length} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 disabled:cursor-not-allowed ${inputClass}`}>
                <option value="">Select tax</option>
                {taxes.map((tax) => (
                  <option key={tax.id} value={tax.id}>
                    {tax.rate === undefined ? tax.name : `${tax.name} - ${Number(tax.rate * 100).toFixed(2)}%`}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Minimum age" error={fieldErrors.minimumAge}>
              <select value={form.minimumAge} onChange={(event) => updateForm("minimumAge", event.target.value as DepartmentMinimumAge)} disabled={!canEdit || isSaving} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 disabled:cursor-not-allowed ${inputClass}`}>
                {minimumAges.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
          </div>
        </DepartmentFormSection>

        <DepartmentFormSection
          title="Pricing and Ring-Up Defaults"
          subtitle="Set optional product defaults and manual ring-up guardrails."
          className={cardClass}
          mutedClass={mutedClass}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Default retail margin" error={fieldErrors.defaultRetailMargin} helper="Optional percentage used as a product default.">
              <input value={form.defaultRetailMargin} onChange={(event) => updateForm("defaultRetailMargin", event.target.value)} disabled={!canEdit || isSaving} inputMode="decimal" placeholder="30.00" className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 disabled:cursor-not-allowed ${inputClass}`} />
            </Field>
            <Field label="Minimum ring-up amount" error={fieldErrors.minimumRingUpAmount}>
              <input value={form.minimumRingUpAmount} onChange={(event) => updateForm("minimumRingUpAmount", event.target.value)} disabled={!canEdit || isSaving} inputMode="decimal" placeholder="0.00" className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 disabled:cursor-not-allowed ${inputClass}`} />
            </Field>
            <Field label="Maximum ring-up amount" error={fieldErrors.maximumRingUpAmount}>
              <input value={form.maximumRingUpAmount} onChange={(event) => updateForm("maximumRingUpAmount", event.target.value)} disabled={!canEdit || isSaving} inputMode="decimal" placeholder="999.99" className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 disabled:cursor-not-allowed ${inputClass}`} />
            </Field>
          </div>
        </DepartmentFormSection>

        <DepartmentFormSection
          title="Department Behavior"
          subtitle="Choose the default sales, inventory, and POS behavior for this department."
          className={cardClass}
          mutedClass={mutedClass}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <ToggleRow label="Track inventory" helper="Products in this department track on-hand quantities by default." checked={form.trackInventory} disabled={!canEdit || isSaving} onChange={(checked) => updateForm("trackInventory", checked)} />
            <ToggleRow label="Allow negative inventory sales" helper="Allow sales when tracked inventory is below zero." checked={form.allowNegativeInventorySales} disabled={!canEdit || isSaving} onChange={(checked) => updateForm("allowNegativeInventorySales", checked)} />
            <ToggleRow label="Allow EBT" helper="Products in this department are EBT eligible by default." checked={form.allowEbt} disabled={!canEdit || isSaving} onChange={(checked) => updateForm("allowEbt", checked)} />
            <ToggleRow label="Allow manual ring-up" helper="Allow cashiers to enter a department sale without selecting a product." checked={form.allowManualRingUp} disabled={!canEdit || isSaving} onChange={(checked) => updateForm("allowManualRingUp", checked)} />
            <ToggleRow label="On POS" helper="Show this department as a selectable department on the POS." checked={form.onPos} disabled={!canEdit || isSaving} onChange={(checked) => updateForm("onPos", checked)} />
            <ToggleRow label="Active department" helper="Allow this department to be used for new product assignments." checked={form.isActive} disabled={!canEdit || isSaving} onChange={(checked) => updateForm("isActive", checked)} />
          </div>
        </DepartmentFormSection>

        <div className={`flex flex-col-reverse gap-3 rounded-[8px] border p-6 sm:flex-row sm:justify-end ${cardClass}`}>
          {editingDepartment ? (
            <button
              type="button"
              onClick={resetForm}
              disabled={isSaving}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}
            >
              <X className="size-4" aria-hidden="true" />
              Cancel Edit
            </button>
          ) : null}
          <button
            type="button"
            onClick={resetForm}
            disabled={isSaving}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset
          </button>
          <button
            type="submit"
            disabled={!canEdit || isSaving || !taxes.length}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35"
          >
            {isSaving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
            {isSaving ? "Saving..." : editingDepartment ? "Update Department" : "Save Department"}
          </button>
        </div>
      </form>

      <div className={`rounded-[8px] border p-6 ${cardClass}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-normal">Existing Departments</h2>
              <p className={`mt-1 text-sm font-semibold leading-6 ${mutedClass}`}>
                Search, edit, activate, or deactivate store departments.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshDepartments()}
              disabled={isLoading}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}
            >
              {isLoading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
              Refresh
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
            <label className="relative block">
              <span className="sr-only">Search departments</span>
              <Search className={`pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 ${mutedClass}`} aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search departments"
                className={`h-11 w-full rounded-[8px] border py-2 pl-10 pr-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`}
              />
            </label>
            <label>
              <span className="sr-only">Status filter</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>

          <div className={`mt-5 overflow-hidden rounded-[8px] border ${nestedClass}`}>
            {isLoading ? (
              <div className="flex min-h-44 items-center justify-center gap-2 text-sm font-bold">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Loading departments...
              </div>
            ) : visibleDepartments.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-[1120px] text-left text-sm">
                  <thead className={isDark ? "bg-white/[0.04] text-slate-400" : "bg-[#f0edff] text-slate-600"}>
                    <tr>
                      <TableHeader>POS #</TableHeader>
                      <TableHeader>Department</TableHeader>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>Default Tax</TableHeader>
                      <TableHeader>Minimum Age</TableHeader>
                      <TableHeader>On POS</TableHeader>
                      <TableHeader>Inventory</TableHeader>
                      <TableHeader>EBT</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader>Actions</TableHeader>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDepartments.map((department) => (
                      <tr key={department.id} className={`border-t ${isDark ? "border-slate-400/10" : "border-[#ded8f3]"}`}>
                        <td className={`px-4 py-3 font-extrabold ${mutedClass}`}>{department.posDepartmentNumber}</td>
                        <td className="px-4 py-3 font-bold">
                          <div>{department.name}</div>
                          <div className={`mt-1 text-xs font-semibold ${mutedClass}`}>{department.productCount ?? 0} products</div>
                        </td>
                        <td className="px-4 py-3"><Badge tone="neutral">{departmentTypeLabel(department.type)}</Badge></td>
                        <td className="px-4 py-3 font-semibold">
                          {department.defaultTax ? `${department.defaultTax.name}${department.defaultTax.rate === undefined ? "" : ` (${Number(department.defaultTax.rate * 100).toFixed(2)}%)`}` : "Configure tax"}
                        </td>
                        <td className="px-4 py-3"><Badge tone="neutral">{minimumAgeLabel(department.minimumAge)}</Badge></td>
                        <td className="px-4 py-3">
                          <Badge tone={department.onPos ? "success" : "neutral"}>{department.onPos ? "Yes" : "No"}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={department.trackInventory ? "success" : "neutral"}>{department.trackInventory ? "Tracked" : "Not tracked"}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={department.allowEbt ? "success" : "neutral"}>{department.allowEbt ? "Yes" : "No"}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={department.isActive ? "success" : "warning"}>{department.isActive ? "Active" : "Inactive"}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(department)}
                              disabled={!canEdit || isSaving}
                              className={`inline-flex h-9 items-center gap-2 rounded-[8px] border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}
                            >
                              <Edit3 className="size-3.5" aria-hidden="true" />
                              Edit
                            </button>
                            {department.isActive ? (
                              <button
                                type="button"
                                onClick={() => setDeactivateTarget(department)}
                                disabled={!canEdit || statusChangingId === department.id}
                                className={`inline-flex h-9 items-center gap-2 rounded-[8px] border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}
                              >
                                {statusChangingId === department.id ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <ToggleLeft className="size-3.5" aria-hidden="true" />}
                                Deactivate
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void setDepartmentStatus(department, true)}
                                disabled={!canEdit || statusChangingId === department.id}
                                className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#4f2df2] px-3 text-xs font-bold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35"
                              >
                                {statusChangingId === department.id ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <ToggleRight className="size-3.5" aria-hidden="true" />}
                                Activate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="min-h-44 p-6">
                <h3 className="text-base font-bold tracking-normal">No departments yet</h3>
                <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>
                  Create a department to begin organizing products.
                </p>
              </div>
            )}
          </div>
      </div>

      {deactivateTarget ? (
        <DeactivateDialog
          theme={theme}
          departmentName={deactivateTarget.name}
          isProcessing={statusChangingId === deactivateTarget.id}
          onCancel={() => setDeactivateTarget(null)}
          onConfirm={() => void setDepartmentStatus(deactivateTarget, false)}
        />
      ) : null}
    </section>
  );
}

function DepartmentFormSection({
  title,
  subtitle,
  className,
  mutedClass,
  children,
}: {
  title: string;
  subtitle: string;
  className: string;
  mutedClass: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-[8px] border p-6 ${className}`}>
      <div>
        <h2 className="text-lg font-bold tracking-normal">{title}</h2>
        <p className={`mt-1.5 text-sm font-semibold leading-6 ${mutedClass}`}>{subtitle}</p>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  helper,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  helper: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition ${checked ? "bg-[#4f2df2]" : "bg-slate-300"} peer-focus-visible:ring-4 peer-focus-visible:ring-[#7c5cff]/35 peer-disabled:cursor-not-allowed peer-disabled:opacity-60`}>
        <span className={`size-4 rounded-full bg-white transition ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </span>
      <span>
        <span className="block text-sm font-bold">{label}</span>
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{helper}</span>
      </span>
    </label>
  );
}

function Field({
  label,
  helper,
  error,
  children,
}: {
  label: string;
  helper?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <span className="mt-2 block">{children}</span>
      {helper ? <span className="mt-2 block text-xs font-semibold leading-5 text-slate-500">{helper}</span> : null}
      {error ? <span className="mt-2 block text-xs font-bold text-red-500">{error}</span> : null}
    </label>
  );
}

function Alert({ tone, title }: { tone: "success" | "warning" | "error"; title: string }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  const toneClass = {
    success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-600",
    error: "border-red-500/20 bg-red-500/10 text-red-600",
  }[tone];

  return (
    <div className={`flex items-start gap-2 rounded-[8px] border p-3 text-sm font-bold ${toneClass}`} role={tone === "error" ? "alert" : "status"}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {title}
    </div>
  );
}

function Badge({ tone, children }: { tone: "success" | "warning" | "neutral"; children: string }) {
  const toneClass = {
    success: "bg-emerald-500/15 text-emerald-500",
    warning: "bg-amber-500/15 text-amber-500",
    neutral: "bg-slate-500/15 text-slate-500",
  }[tone];

  return <span className={`inline-flex rounded-[6px] px-2 py-1 text-xs font-extrabold ${toneClass}`}>{children}</span>;
}

function TableHeader({ children }: { children: string }) {
  return <th className="px-4 py-3 text-xs font-extrabold uppercase tracking-[0.06em]">{children}</th>;
}

function departmentTypeLabel(value: DepartmentType) {
  return departmentTypes.find(([key]) => key === value)?.[1] ?? value;
}

function minimumAgeLabel(value: DepartmentMinimumAge) {
  return minimumAges.find(([key]) => key === value)?.[1] ?? value;
}

function numberInputValue(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function DeactivateDialog({
  theme,
  departmentName,
  isProcessing,
  onCancel,
  onConfirm,
}: {
  theme: "light" | "dark";
  departmentName: string;
  isProcessing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isDark = theme === "dark";
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    queueMicrotask(() => cancelRef.current?.focus());
  }, []);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && !isProcessing) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProcessing, onCancel]);

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-0 backdrop-blur-sm sm:items-center sm:py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isProcessing) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deactivate-department-title"
        aria-describedby="deactivate-department-description"
        onKeyDown={trapFocus}
        className={`w-full max-w-[520px] rounded-t-[18px] border p-5 shadow-[0_28px_90px_rgba(15,23,42,0.24)] sm:rounded-[14px] sm:p-6 ${
          isDark ? "border-slate-400/15 bg-[#0b1224] text-[#f4f1ff]" : "border-[#ded8f3] bg-white text-slate-950"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="deactivate-department-title" className="text-xl font-bold tracking-normal">
              Deactivate Department?
            </h2>
            <p id="deactivate-department-description" className={`mt-3 text-sm font-semibold leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              This department will no longer be available for new product assignments. Existing products will remain assigned to it.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className={`grid size-9 shrink-0 place-items-center rounded-[8px] border transition disabled:cursor-not-allowed disabled:opacity-60 ${isDark ? "border-slate-400/15 text-slate-300" : "border-[#ded8f3] text-slate-600"}`}
            aria-label="Close deactivate department dialog"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <p className={`mt-4 rounded-[8px] border p-3 text-sm font-bold ${isDark ? "border-slate-400/15 bg-white/[0.04]" : "border-[#ded8f3] bg-[#fbfaff]"}`}>
          {departmentName}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className={`inline-flex h-10 items-center justify-center rounded-[8px] border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${isDark ? "border-slate-400/15 bg-white/[0.04] text-slate-300" : "border-[#ded8f3] bg-white text-slate-700"}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35"
          >
            {isProcessing ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            {isProcessing ? "Deactivating..." : "Deactivate"}
          </button>
        </div>
      </div>
    </div>
  );
}
