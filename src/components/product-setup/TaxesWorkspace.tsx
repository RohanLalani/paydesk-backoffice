"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Edit3, LoaderCircle, RotateCcw, Save, Search, ToggleLeft, ToggleRight, X } from "lucide-react";
import { z } from "zod";
import { BackOfficeShell } from "@/src/components/layout/BackOfficeShell";
import { FormSelect } from "@/src/components/ui/FormSelect";
import { createTax, getStoreTaxes, updateTax, type TaxRecord } from "@/src/features/products/api";
import { ApiClientError } from "@/src/lib/apiClient";

type TaxFormState = {
  name: string;
  rate: string;
  surchargeAmount: string;
  isActive: boolean;
};

type StatusFilter = "all" | "active" | "inactive";

type FriendlyError = {
  title: string;
  body?: string;
};

const defaultForm: TaxFormState = {
  name: "",
  rate: "",
  surchargeAmount: "0.00",
  isActive: true,
};

const taxSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim().replace(/\s+/g, " "))
    .pipe(
      z
        .string()
        .min(1, "Tax name is required.")
        .max(100, "Tax name must be 100 characters or fewer.")
        .refine((value) => !/[\x00-\x1f\x7f]/.test(value), "Tax name contains unsupported characters."),
    ),
  rate: decimalString("Tax rate", 4)
    .refine((value) => value >= 0, "Tax rate must be zero or greater.")
    .refine((value) => value <= 100, "Tax rate must be 100 or lower.")
    .transform((value) => formatDecimal(value, 4)),
  surchargeAmount: z
    .string()
    .trim()
    .transform((value) => (value === "" ? "0" : value))
    .pipe(decimalString("Fixed surcharge", 2))
    .refine((value) => value >= 0, "Fixed surcharge must be zero or greater.")
    .refine((value) => value <= 9999999999.99, "Fixed surcharge is too large.")
    .transform((value) => value.toFixed(2)),
  isActive: z.boolean(),
});

function decimalString(label: string, maxScale: number) {
  return z
    .string()
    .trim()
    .regex(/^\d+(\.\d+)?$/, `${label} must be a valid number.`)
    .refine((value) => (value.split(".")[1] ?? "").length <= maxScale, `${label} must have ${maxScale} or fewer decimal places.`)
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value), `${label} must be finite.`);
}

export function TaxesWorkspace() {
  return (
    <BackOfficeShell activeItem="productSetup" requiredPermission="manage_products">
      {({ theme, selectedStore, account }) => (
        <TaxesWorkspaceContent
          theme={theme}
          storeId={selectedStore.id}
          canEdit={account?.role === "owner" || account?.role === "partner" || account?.permissions?.includes("manage_products") === true}
        />
      )}
    </BackOfficeShell>
  );
}

function TaxesWorkspaceContent({ theme, storeId, canEdit }: { theme: "light" | "dark"; storeId: string; canEdit: boolean }) {
  const isDark = theme === "dark";
  const formRef = useRef<HTMLFormElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [taxes, setTaxes] = useState<TaxRecord[]>([]);
  const [form, setForm] = useState<TaxFormState>(defaultForm);
  const [editingTax, setEditingTax] = useState<TaxRecord | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof TaxFormState, string>>>({});
  const [pageError, setPageError] = useState<FriendlyError | null>(null);
  const [loadError, setLoadError] = useState<FriendlyError | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<TaxRecord | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const cardClass = isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white";
  const nestedClass = isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]";
  const inputClass = isDark
    ? "border-slate-400/15 bg-white/[0.04] text-[#f4f1ff] placeholder:text-slate-500 disabled:bg-white/[0.02] disabled:text-slate-500"
    : "border-[#ded8f3] bg-white text-slate-950 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";

  const refreshTaxes = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setPageError(null);

    try {
      const response = await getStoreTaxes(storeId, { limit: 100 });
      setTaxes(response.items);
    } catch (error) {
      console.error("Failed to load taxes", error);
      setLoadError(mapTaxLoadError(error));
      setTaxes([]);
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshTaxes();
    });
  }, [refreshTaxes]);

  const visibleTaxes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return taxes.filter((tax) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && tax.isActive) ||
        (statusFilter === "inactive" && !tax.isActive);
      const matchesSearch = !normalizedSearch || tax.name.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter, taxes]);

  function updateForm<K extends keyof TaxFormState>(field: K, value: TaxFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setPageError(null);
    setSuccessMessage("");
  }

  function resetForm() {
    if (isSaving) return;
    setForm(defaultForm);
    setEditingTax(null);
    setFieldErrors({});
    setPageError(null);
    setSuccessMessage("");
    queueMicrotask(() => nameInputRef.current?.focus());
  }

  function startEdit(tax: TaxRecord) {
    setEditingTax(tax);
    setForm({
      name: tax.name,
      rate: tax.rate,
      surchargeAmount: Number(tax.surchargeAmount).toFixed(2),
      isActive: tax.isActive,
    });
    setFieldErrors({});
    setPageError(null);
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
    setPageError(null);
    setSuccessMessage("");

    const parsed = taxSchema.safeParse(form);

    if (!parsed.success) {
      setFieldErrors(
        parsed.error.issues.reduce<Partial<Record<keyof TaxFormState, string>>>((errors, issue) => {
          const field = issue.path[0] as keyof TaxFormState | undefined;
          if (field && !errors[field]) errors[field] = issue.message;
          return errors;
        }, {}),
      );
      return;
    }

    setIsSaving(true);

    try {
      if (editingTax) {
        await updateTax(storeId, editingTax.id, parsed.data);
        setSuccessMessage("Tax updated.");
      } else {
        await createTax(storeId, parsed.data);
        setSuccessMessage("Tax created.");
      }

      setForm(defaultForm);
      setEditingTax(null);
      await refreshTaxes();
    } catch (error) {
      console.error("Failed to save tax", error);
      setPageError(mapTaxActionError(error, "save"));
    } finally {
      setIsSaving(false);
    }
  }

  async function setTaxStatus(tax: TaxRecord, isActive: boolean) {
    if (!canEdit || statusChangingId) return;
    setStatusChangingId(tax.id);
    setPageError(null);
    setSuccessMessage("");

    try {
      await updateTax(storeId, tax.id, { isActive });
      setSuccessMessage(isActive ? "Tax activated." : "Tax deactivated.");
      await refreshTaxes();
    } catch (error) {
      console.error("Failed to update tax status", error);
      setPageError(mapTaxActionError(error, "status"));
    } finally {
      setStatusChangingId(null);
      setDeactivateTarget(null);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[1320px] space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-normal">Tax Setup</h1>
        <p className={`mt-2 max-w-[760px] text-sm font-semibold leading-6 ${mutedClass}`}>
          Configure store tax rates and optional fixed surcharges.
        </p>
      </header>

      <div className="space-y-3" aria-live="polite">
        {successMessage ? <Alert tone="success" title={successMessage} /> : null}
        {pageError ? <Alert tone="error" title={pageError.title} body={pageError.body} /> : null}
        {!canEdit ? <Alert tone="warning" title="You do not have permission to manage taxes." /> : null}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className={`rounded-[8px] border p-6 ${cardClass}`}>
        <div>
          <h2 className="text-lg font-bold tracking-normal">Create Tax</h2>
          <p className={`mt-1.5 text-sm font-semibold leading-6 ${mutedClass}`}>
            {editingTax ? "Update this tax for future sales." : "Add a percentage tax with an optional fixed line surcharge."}
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          <Field label="Tax name" error={fieldErrors.name}>
            <input ref={nameInputRef} value={form.name} onChange={(event) => updateForm("name", event.target.value)} disabled={!canEdit || isSaving} placeholder="e.g. Standard Sales Tax" className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 disabled:cursor-not-allowed ${inputClass}`} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tax rate" error={fieldErrors.rate}>
              <AffixedInput suffix="%" value={form.rate} onChange={(value) => updateForm("rate", value)} disabled={!canEdit || isSaving} placeholder="8.25" inputClass={inputClass} />
            </Field>
            <Field label="Fixed surcharge" error={fieldErrors.surchargeAmount} helper="Optional fixed amount added after the percentage tax.">
              <AffixedInput prefix="$" value={form.surchargeAmount} onChange={(value) => updateForm("surchargeAmount", value)} disabled={!canEdit || isSaving} placeholder="0.00" inputClass={inputClass} />
            </Field>
          </div>
          <ToggleRow label="Active tax" helper="Active taxes can be assigned to departments." checked={form.isActive} disabled={!canEdit || isSaving} onChange={(checked) => updateForm("isActive", checked)} />
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {editingTax ? (
            <button type="button" onClick={resetForm} disabled={isSaving} className={`inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}>
              <X className="size-4" aria-hidden="true" />
              Cancel Edit
            </button>
          ) : null}
          <button type="button" onClick={resetForm} disabled={isSaving} className={`inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset
          </button>
          <button type="submit" disabled={!canEdit || isSaving} className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35">
            {isSaving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
            {isSaving ? "Saving..." : editingTax ? "Update Tax" : "Save Tax"}
          </button>
        </div>
      </form>

      <div className={`rounded-[8px] border p-6 ${cardClass}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-normal">Existing Taxes</h2>
            <p className={`mt-1 text-sm font-semibold leading-6 ${mutedClass}`}>Search, edit, activate, or deactivate store taxes.</p>
          </div>
          <button type="button" onClick={() => void refreshTaxes()} disabled={isLoading} className={`inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}>
            {isLoading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            Refresh
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <label className="relative block">
            <span className="sr-only">Search taxes</span>
            <Search className={`pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 ${mutedClass}`} aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search taxes" className={`h-11 w-full rounded-[8px] border py-2 pl-10 pr-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`} />
          </label>
          <label>
            <span className="sr-only">Status filter</span>
            <FormSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} selectClassName={inputClass}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </FormSelect>
          </label>
        </div>

        <div className={`mt-5 overflow-hidden rounded-[8px] border ${nestedClass}`}>
          {isLoading ? (
            <div className="flex min-h-44 items-center justify-center gap-2 text-sm font-bold">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Loading taxes...
            </div>
          ) : loadError ? (
            <ErrorCard error={loadError} mutedClass={mutedClass} onRetry={() => void refreshTaxes()} />
          ) : visibleTaxes.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-[1120px] text-left text-sm">
                <thead className={isDark ? "bg-white/[0.04] text-slate-400" : "bg-[#f0edff] text-slate-600"}>
                  <tr>
                    <TableHeader>Tax Name</TableHeader>
                    <TableHeader>Percentage Rate</TableHeader>
                    <TableHeader>Fixed Surcharge</TableHeader>
                    <TableHeader>Display Formula</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Departments</TableHeader>
                    <TableHeader>Updated</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </tr>
                </thead>
                <tbody>
                  {visibleTaxes.map((tax) => (
                    <tr key={tax.id} className={`border-t ${isDark ? "border-slate-400/10" : "border-[#ded8f3]"}`}>
                      <td className="px-4 py-3 font-bold">{tax.name}</td>
                      <td className="px-4 py-3 font-semibold">{formatRate(tax.rate)}</td>
                      <td className="px-4 py-3 font-semibold">${Number(tax.surchargeAmount).toFixed(2)}</td>
                      <td className="px-4 py-3 font-extrabold">{formatTaxFormula(tax)}</td>
                      <td className="px-4 py-3"><Badge tone={tax.isActive ? "success" : "warning"}>{tax.isActive ? "Active" : "Inactive"}</Badge></td>
                      <td className="px-4 py-3 font-semibold">{tax.departmentCount}</td>
                      <td className={`px-4 py-3 font-semibold ${mutedClass}`}>{new Date(tax.updatedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => startEdit(tax)} disabled={!canEdit || isSaving} className={`inline-flex h-9 items-center gap-2 rounded-[8px] border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}>
                            <Edit3 className="size-3.5" aria-hidden="true" />
                            Edit
                          </button>
                          {tax.isActive ? (
                            <button type="button" onClick={() => (tax.departmentCount > 0 ? setDeactivateTarget(tax) : void setTaxStatus(tax, false))} disabled={!canEdit || statusChangingId === tax.id} className={`inline-flex h-9 items-center gap-2 rounded-[8px] border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}>
                              {statusChangingId === tax.id ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <ToggleLeft className="size-3.5" aria-hidden="true" />}
                              Deactivate
                            </button>
                          ) : (
                            <button type="button" onClick={() => void setTaxStatus(tax, true)} disabled={!canEdit || statusChangingId === tax.id} className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#4f2df2] px-3 text-xs font-bold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35">
                              {statusChangingId === tax.id ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <ToggleRight className="size-3.5" aria-hidden="true" />}
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
              <h3 className="text-base font-bold tracking-normal">No taxes found</h3>
              <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>Create an active tax before creating a department.</p>
            </div>
          )}
        </div>
      </div>

      {deactivateTarget ? (
        <DeactivateTaxDialog
          theme={theme}
          tax={deactivateTarget}
          isProcessing={statusChangingId === deactivateTarget.id}
          onCancel={() => setDeactivateTarget(null)}
          onConfirm={() => void setTaxStatus(deactivateTarget, false)}
        />
      ) : null}
    </section>
  );
}

function AffixedInput({ prefix, suffix, value, onChange, disabled, placeholder, inputClass }: { prefix?: string; suffix?: string; value: string; onChange: (value: string) => void; disabled: boolean; placeholder: string; inputClass: string }) {
  return (
    <div className="relative">
      {prefix ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-500">{prefix}</span> : null}
      <input value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} inputMode="decimal" placeholder={placeholder} className={`h-11 w-full rounded-[8px] border py-2 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 disabled:cursor-not-allowed ${prefix ? "pl-8 pr-3" : suffix ? "pl-3 pr-9" : "px-3"} ${inputClass}`} />
      {suffix ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-500">{suffix}</span> : null}
    </div>
  );
}

function ToggleRow({ label, helper, checked, disabled, onChange }: { label: string; helper: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
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

function Field({ label, helper, error, children }: { label: string; helper?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <span className="mt-2 block">{children}</span>
      {helper ? <span className="mt-2 block text-xs font-semibold leading-5 text-slate-500">{helper}</span> : null}
      {error ? <span className="mt-2 block text-xs font-bold text-red-500">{error}</span> : null}
    </label>
  );
}

function Alert({ tone, title, body }: { tone: "success" | "warning" | "error"; title: string; body?: string }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  const toneClass = {
    success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-600",
    error: "border-red-500/20 bg-red-500/10 text-red-600",
  }[tone];

  return (
    <div className={`flex items-start gap-2 rounded-[8px] border p-3 text-sm font-bold ${toneClass}`} role={tone === "error" ? "alert" : "status"}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        <span className="block">{title}</span>
        {body ? <span className="mt-1 block text-xs font-semibold leading-5 opacity-90">{body}</span> : null}
      </span>
    </div>
  );
}

function ErrorCard({ error, mutedClass, onRetry }: { error: FriendlyError; mutedClass: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-44 flex-col items-start justify-center p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-500" aria-hidden="true" />
        <div>
          <h3 className="text-base font-bold tracking-normal">{error.title}</h3>
          {error.body ? <p className={`mt-2 max-w-[520px] text-sm font-semibold leading-6 ${mutedClass}`}>{error.body}</p> : null}
        </div>
      </div>
      <button type="button" onClick={onRetry} className="mt-5 inline-flex h-10 items-center justify-center rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35">
        Retry
      </button>
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

function formatDecimal(value: number, maxScale: number) {
  return value.toFixed(maxScale).replace(/0+$/, "").replace(/\.$/, "");
}

function formatRate(rate: string) {
  return `${formatDecimal(Number(rate), 4)}%`;
}

function formatTaxFormula(tax: Pick<TaxRecord, "rate" | "surchargeAmount">) {
  const base = formatRate(tax.rate);
  const surcharge = Number(tax.surchargeAmount);

  return surcharge > 0 ? `${base} + $${surcharge.toFixed(2)}` : base;
}

function mapTaxLoadError(error: unknown): FriendlyError {
  if (isTaxSetupUnavailable(error)) {
    return {
      title: "Unable to load taxes",
      body: "We couldn't load your taxes right now. Please try again in a few minutes.",
    };
  }

  if (isStatus(error, 0)) {
    return {
      title: "Connection problem",
      body: "We couldn't connect to PayDesk. Please check your internet connection and try again.",
    };
  }

  if (isStatus(error, 401)) {
    return {
      title: "Please sign in again",
      body: "Your session has expired.",
    };
  }

  if (isStatus(error, 403)) {
    return {
      title: "Access denied",
      body: "You don't have permission to view this page.",
    };
  }

  if (isStatus(error, 500)) {
    return {
      title: "Something went wrong",
      body: "Something went wrong while loading your taxes. Please try again.",
    };
  }

  return {
    title: "Unable to load taxes",
    body: error instanceof ApiClientError
      ? "We couldn't load your taxes right now. Please try again in a few minutes."
      : "Something went wrong. Please try again.",
  };
}

function mapTaxActionError(error: unknown, action: "save" | "status"): FriendlyError {
  if (isTaxSetupUnavailable(error)) {
    return {
      title: "Unable to load taxes",
      body: "We couldn't load your taxes right now. Please try again in a few minutes.",
    };
  }

  if (isStatus(error, 0)) {
    return {
      title: "Connection problem",
      body: "We couldn't connect to PayDesk. Please check your internet connection and try again.",
    };
  }

  if (isStatus(error, 401)) {
    return {
      title: "Please sign in again",
      body: "Your session has expired.",
    };
  }

  if (isStatus(error, 403)) {
    return {
      title: "Access denied",
      body: "You don't have permission to view this page.",
    };
  }

  if (isStatus(error, 500)) {
    return {
      title: "Something went wrong",
      body: action === "save" ? "Something went wrong while saving your tax. Please try again." : "Something went wrong while updating your tax. Please try again.",
    };
  }

  if (error instanceof ApiClientError) {
    return {
      title: action === "save" ? "Unable to save tax" : "Unable to update tax",
      body: "Please try again.",
    };
  }

  return {
    title: action === "save" ? "Unable to save tax" : "Unable to update tax",
    body: "Something went wrong. Please try again.",
  };
}

function isTaxSetupUnavailable(error: unknown) {
  return isStatus(error, 404) || isStatus(error, 405) || /cannot get|route not found/i.test(errorMessage(error));
}

function isStatus(error: unknown, status: number) {
  return error instanceof ApiClientError && error.status === status;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

function DeactivateTaxDialog({ theme, tax, isProcessing, onCancel, onConfirm }: { theme: "light" | "dark"; tax: TaxRecord; isProcessing: boolean; onCancel: () => void; onConfirm: () => void }) {
  const isDark = theme === "dark";
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    queueMicrotask(() => cancelRef.current?.focus());
  }, []);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && !isProcessing) onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProcessing, onCancel]);

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-0 backdrop-blur-sm sm:items-center sm:py-6" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isProcessing) onCancel();
    }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="deactivate-tax-title" aria-describedby="deactivate-tax-description" onKeyDown={trapFocus} className={`w-full max-w-[520px] rounded-t-[18px] border p-5 shadow-[0_28px_90px_rgba(15,23,42,0.24)] sm:rounded-[14px] sm:p-6 ${isDark ? "border-slate-400/15 bg-[#0b1224] text-[#f4f1ff]" : "border-[#ded8f3] bg-white text-slate-950"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="deactivate-tax-title" className="text-xl font-bold tracking-normal">Deactivate Tax?</h2>
            <p id="deactivate-tax-description" className={`mt-3 text-sm font-semibold leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              This tax will no longer be available for new department assignments. Existing departments will retain it until changed.
            </p>
          </div>
          <button type="button" onClick={onCancel} disabled={isProcessing} className={`grid size-9 shrink-0 place-items-center rounded-[8px] border transition disabled:cursor-not-allowed disabled:opacity-60 ${isDark ? "border-slate-400/15 text-slate-300" : "border-[#ded8f3] text-slate-600"}`} aria-label="Close deactivate tax dialog">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <p className={`mt-4 rounded-[8px] border p-3 text-sm font-bold ${isDark ? "border-slate-400/15 bg-white/[0.04]" : "border-[#ded8f3] bg-[#fbfaff]"}`}>
          {tax.name} - {formatTaxFormula(tax)}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={isProcessing} className={`inline-flex h-10 items-center justify-center rounded-[8px] border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${isDark ? "border-slate-400/15 bg-white/[0.04] text-slate-300" : "border-[#ded8f3] bg-white text-slate-700"}`}>Cancel</button>
          <button type="button" onClick={onConfirm} disabled={isProcessing} className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35">
            {isProcessing ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            {isProcessing ? "Deactivating..." : "Deactivate"}
          </button>
        </div>
      </div>
    </div>
  );
}
