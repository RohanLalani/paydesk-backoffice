"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Edit3, LoaderCircle, Plus, RefreshCw, Search, Trash2, ToggleLeft, ToggleRight, X } from "lucide-react";
import { BackOfficeShell, type BackOfficeShellContext } from "@/src/components/layout/BackOfficeShell";
import { FormSelect } from "@/src/components/ui/FormSelect";
import { PayDeskSwitch } from "@/src/components/ui/Switch";
import {
  createStorePayee,
  listStorePayees,
  updateStorePayee,
  type Payee,
  type PayeeInput,
  type PayeeType,
} from "@/src/features/purchases/api";

const EMPTY = "-";
const PAGE_SIZES = [10, 25, 50] as const;

type StatusFilter = "all" | "active" | "inactive";
type PayeeTypeFilter = "all" | PayeeType;
type PosPaymentsFilter = "all" | "enabled" | "disabled";

type PayeeFormState = {
  name: string;
  accountNumber: string;
  contactName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  notes: string;
  isActive: boolean;
  payeeType: PayeeType;
  allowPosPayments: boolean;
};

type ThemeClasses = {
  isDark: boolean;
  panel: string;
  nested: string;
  input: string;
  muted: string;
  border: string;
  hover: string;
};

const defaultForm: PayeeFormState = {
  name: "",
  accountNumber: "",
  contactName: "",
  phone: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  notes: "",
  isActive: true,
  payeeType: "VENDOR",
  allowPosPayments: false,
};

const payeeTypeOptions = [
  ["VENDOR", "Vendor"],
  ["MISC", "Misc"],
  ["EXPENSE", "Expense"],
] satisfies Array<[PayeeType, string]>;

function classesFor(theme: "light" | "dark"): ThemeClasses {
  const isDark = theme === "dark";

  return {
    isDark,
    panel: isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white",
    nested: isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]",
    input: isDark
      ? "border-slate-400/15 bg-white/[0.04] text-[#f4f1ff] placeholder:text-slate-500 disabled:bg-white/[0.02] disabled:text-slate-500"
      : "border-[#ded8f3] bg-white text-slate-950 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500",
    muted: isDark ? "text-slate-400" : "text-slate-500",
    border: isDark ? "border-slate-400/10" : "border-[#ded8f3]",
    hover: isDark ? "hover:bg-white/[0.04]" : "hover:bg-[#fbfaff]",
  };
}

function canManagePayees(context: BackOfficeShellContext) {
  const account = context.account;
  return account?.role === "owner" || account?.role === "partner" || account?.permissions?.includes("manage_payees") === true;
}

export function PayeesWorkspace() {
  return (
    <BackOfficeShell activeItem="storeSettings">
      {(context) => <PayeesContent {...context} canEdit={canManagePayees(context)} />}
    </BackOfficeShell>
  );
}

function PayeesContent({ theme, selectedStore, canEdit }: BackOfficeShellContext & { canEdit: boolean }) {
  const styles = classesFor(theme);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [payeeTypeFilter, setPayeeTypeFilter] = useState<PayeeTypeFilter>("all");
  const [posPaymentsFilter, setPosPaymentsFilter] = useState<PosPaymentsFilter>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<(typeof PAGE_SIZES)[number]>(25);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editingPayee, setEditingPayee] = useState<Payee | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Payee | null>(null);

  const loadPayees = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await listStorePayees(selectedStore.id, { limit: 1000 });
      setPayees(response.items);
    } catch (loadError) {
      setPayees([]);
      setError(loadError instanceof Error ? loadError.message : "Payees could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedStore.id]);

  useEffect(() => {
    queueMicrotask(() => void loadPayees());
  }, [loadPayees]);

  const visiblePayees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payees
      .filter((payee) => {
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && payee.isActive) ||
          (statusFilter === "inactive" && !payee.isActive);
        const matchesType = payeeTypeFilter === "all" || payee.payeeType === payeeTypeFilter;
        const matchesPosPayments =
          posPaymentsFilter === "all" ||
          (posPaymentsFilter === "enabled" && payee.allowPosPayments) ||
          (posPaymentsFilter === "disabled" && !payee.allowPosPayments);
        const searchFields = [
          payee.name,
          payee.contactName,
          payee.phone,
          payee.email,
          payee.addressLine1,
          payee.city,
          payee.state,
        ];
        const matchesSearch = !query || searchFields.some((field) => field?.toLowerCase().includes(query));

        return matchesStatus && matchesType && matchesPosPayments && matchesSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [payees, payeeTypeFilter, posPaymentsFilter, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(visiblePayees.length / limit));
  const safePage = Math.min(page, totalPages);
  const pagePayees = visiblePayees.slice((safePage - 1) * limit, safePage * limit);
  const start = visiblePayees.length === 0 ? 0 : (safePage - 1) * limit + 1;
  const end = Math.min(safePage * limit, visiblePayees.length);

  function openAddForm() {
    setEditingPayee(null);
    setIsFormOpen(true);
    setError("");
    setSuccessMessage("");
  }

  function openEditForm(payee: Payee) {
    setEditingPayee(payee);
    setIsFormOpen(true);
    setError("");
    setSuccessMessage("");
  }

  async function savePayee(form: PayeeFormState) {
    if (!canEdit || isSaving) return;

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = formToPayload(form);

      if (editingPayee) {
        await updateStorePayee(selectedStore.id, editingPayee.id, payload);
        setSuccessMessage("Payee updated.");
      } else {
        await createStorePayee(selectedStore.id, payload);
        setSuccessMessage("Payee created.");
      }

      setIsFormOpen(false);
      setEditingPayee(null);
      await loadPayees();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Payee could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function setPayeeStatus(payee: Payee, isActive: boolean, action: "status" | "delete" = "status") {
    if (!canEdit || statusChangingId) return;

    setStatusChangingId(payee.id);
    setError("");
    setSuccessMessage("");

    try {
      await updateStorePayee(selectedStore.id, payee.id, { isActive });
      setSuccessMessage(action === "delete" ? "Payee deleted from active management." : isActive ? "Payee activated." : "Payee deactivated.");
      setDeleteTarget(null);
      await loadPayees();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Payee status could not be updated.");
    } finally {
      setStatusChangingId(null);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[1320px] space-y-5">
      <div className={`rounded-[8px] border p-6 ${styles.panel}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-normal">Payees</h1>
            <p className={`mt-2 max-w-[760px] text-sm font-semibold leading-6 ${styles.muted}`}>
              Manage supplier and vendor records for purchases in this store.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddForm}
            disabled={!canEdit}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-extrabold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add Payee
          </button>
        </div>
      </div>

      <div className="space-y-3" aria-live="polite">
        {successMessage ? <Alert tone="success" title={successMessage} /> : null}
        {error ? <Alert tone="error" title={error} /> : null}
        {!canEdit ? <Alert tone="warning" title="You can view payees, but you do not have permission to manage them." /> : null}
      </div>

      <section className={`rounded-[8px] border p-5 ${styles.panel}`} aria-label="Payee filters">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_170px_170px_170px_140px]">
          <label className="relative block">
            <span className="sr-only">Search payees</span>
            <Search className={`pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 ${styles.muted}`} aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search payee, contact, phone, email, or address"
              className={`h-11 w-full rounded-[8px] border py-2 pl-10 pr-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${styles.input}`}
            />
          </label>
          <FormSelect
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter);
              setPage(1);
            }}
            selectClassName={styles.input}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </FormSelect>
          <FormSelect
            value={payeeTypeFilter}
            onChange={(event) => {
              setPayeeTypeFilter(event.target.value as PayeeTypeFilter);
              setPage(1);
            }}
            selectClassName={styles.input}
          >
            <option value="all">All types</option>
            {payeeTypeOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </FormSelect>
          <FormSelect
            value={posPaymentsFilter}
            onChange={(event) => {
              setPosPaymentsFilter(event.target.value as PosPaymentsFilter);
              setPage(1);
            }}
            selectClassName={styles.input}
          >
            <option value="all">All POS payments</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </FormSelect>
          <button
            type="button"
            onClick={() => void loadPayees()}
            disabled={isLoading}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles.input}`}
          >
            {isLoading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
            Refresh
          </button>
        </div>
      </section>

      <div className={`flex flex-col gap-3 rounded-[8px] border p-4 text-sm font-bold sm:flex-row sm:items-center sm:justify-between ${styles.panel}`}>
        <p>{isLoading ? "Loading payees..." : `Showing ${start}-${end} of ${visiblePayees.length} payees`}</p>
        <p className={styles.muted}>Sorted by Payee Name ascending</p>
      </div>

      <section className={`overflow-hidden rounded-[8px] border ${styles.panel}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1480px] border-collapse text-left text-sm">
            <thead>
              <tr className={`border-b text-xs font-extrabold uppercase tracking-[0.06em] ${styles.border} ${styles.muted}`}>
                <TableHeader>Payee Name</TableHeader>
                <TableHeader>Contact Name</TableHeader>
                <TableHeader>Phone</TableHeader>
                <TableHeader>Email</TableHeader>
                <TableHeader>Address</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>POS Payments</TableHeader>
                <TableHeader>Last Updated</TableHeader>
                <TableHeader>Actions</TableHeader>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows />
              ) : (
                pagePayees.map((payee) => (
                  <tr key={payee.id} className={`border-b ${styles.border} ${styles.hover}`}>
                    <td className="px-4 py-3 font-extrabold">{payee.name}</td>
                    <td className="px-4 py-3 font-semibold">{payee.contactName ?? EMPTY}</td>
                    <td className="px-4 py-3 font-semibold">{payee.phone ?? EMPTY}</td>
                    <td className="px-4 py-3 font-semibold">{payee.email ?? EMPTY}</td>
                    <td className="px-4 py-3 font-semibold">{formatAddress(payee)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={payee.isActive ? "success" : "warning"}>{payee.isActive ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold">{payeeTypeLabel(payee.payeeType)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={payee.allowPosPayments ? "success" : "warning"}>{payee.allowPosPayments ? "Yes" : "No"}</Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatDate(payee.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(payee)}
                          disabled={!canEdit || isSaving}
                          className={`inline-flex h-9 items-center gap-2 rounded-[8px] border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles.input}`}
                        >
                          <Edit3 className="size-3.5" aria-hidden="true" />
                          Edit
                        </button>
                        {payee.isActive ? (
                          <button
                            type="button"
                            onClick={() => void setPayeeStatus(payee, false)}
                            disabled={!canEdit || statusChangingId === payee.id}
                            className={`inline-flex h-9 items-center gap-2 rounded-[8px] border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles.input}`}
                          >
                            {statusChangingId === payee.id ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <ToggleLeft className="size-3.5" aria-hidden="true" />}
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void setPayeeStatus(payee, true)}
                            disabled={!canEdit || statusChangingId === payee.id}
                            className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#4f2df2] px-3 text-xs font-bold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35"
                          >
                            {statusChangingId === payee.id ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <ToggleRight className="size-3.5" aria-hidden="true" />}
                            Activate
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(payee)}
                          disabled={!canEdit || statusChangingId === payee.id}
                          className={`inline-flex h-9 items-center gap-2 rounded-[8px] border px-3 text-xs font-bold text-red-500 transition disabled:cursor-not-allowed disabled:opacity-60 ${styles.input}`}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && !pagePayees.length ? (
          <div className="p-8">
            <h2 className="text-xl font-extrabold">{search || statusFilter !== "all" ? "No payees match these filters" : "No payees yet"}</h2>
            <p className={`mt-2 text-sm font-semibold ${styles.muted}`}>
              {search || statusFilter !== "all" ? "Try changing the search or status filter." : "Add a payee to begin using supplier purchase workflows."}
            </p>
          </div>
        ) : null}
      </section>

      <Pagination
        page={safePage}
        totalPages={totalPages}
        limit={limit}
        styles={styles}
        onPageChange={setPage}
        onLimitChange={(nextLimit) => {
          setLimit(nextLimit);
          setPage(1);
        }}
      />

      {isFormOpen ? (
        <PayeeFormDialog
          theme={theme}
          payee={editingPayee}
          isSaving={isSaving}
          error={error}
          onCancel={() => {
            if (!isSaving) {
              setIsFormOpen(false);
              setEditingPayee(null);
              setError("");
            }
          }}
          onSubmit={savePayee}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          theme={theme}
          title="Delete Payee?"
          description="This will remove the payee from active purchase workflows. Existing purchases will keep their payee history."
          targetName={deleteTarget.name}
          confirmLabel="Delete"
          isProcessing={statusChangingId === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void setPayeeStatus(deleteTarget, false, "delete")}
        />
      ) : null}
    </section>
  );
}

function PayeeFormDialog({
  theme,
  payee,
  isSaving,
  error,
  onCancel,
  onSubmit,
}: {
  theme: "light" | "dark";
  payee: Payee | null;
  isSaving: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (form: PayeeFormState) => void;
}) {
  const isDark = theme === "dark";
  const styles = classesFor(theme);
  const dialogRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<PayeeFormState>(() => payeeToForm(payee));
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    queueMicrotask(() => nameRef.current?.focus());
  }, []);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onCancel]);

  function updateField<K extends keyof PayeeFormState>(field: K, value: PayeeFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "name") {
      setNameError("");
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      setNameError("Payee name is required.");
      nameRef.current?.focus();
      return;
    }

    onSubmit(form);
  }

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
        if (event.target === event.currentTarget && !isSaving) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payee-form-title"
        onKeyDown={trapFocus}
        className={`max-h-[92dvh] w-full max-w-[760px] overflow-y-auto rounded-t-[18px] border p-5 shadow-[0_28px_90px_rgba(15,23,42,0.24)] sm:rounded-[14px] sm:p-6 ${
          isDark ? "border-slate-400/15 bg-[#0b1224] text-[#f4f1ff]" : "border-[#ded8f3] bg-white text-slate-950"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="payee-form-title" className="text-xl font-bold tracking-normal">
              {payee ? "Edit Payee" : "Add Payee"}
            </h2>
            <p className={`mt-2 text-sm font-semibold leading-6 ${styles.muted}`}>
              {payee ? "Update this supplier or vendor record." : "Create a supplier or vendor for purchase workflows."}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className={`grid size-9 shrink-0 place-items-center rounded-[8px] border transition disabled:cursor-not-allowed disabled:opacity-60 ${styles.input}`}
            aria-label="Close payee form"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {error ? <div className="mt-4"><Alert tone="error" title={error} /></div> : null}

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Payee name" error={nameError} required>
              <input ref={nameRef} value={form.name} onChange={(event) => updateField("name", event.target.value)} disabled={isSaving} className={inputClass(styles)} placeholder="Supplier or vendor name" />
            </Field>
            <Field label="Account number">
              <input value={form.accountNumber} onChange={(event) => updateField("accountNumber", event.target.value)} disabled={isSaving} className={inputClass(styles)} placeholder="Optional account #" />
            </Field>
            <Field label="Contact name">
              <input value={form.contactName} onChange={(event) => updateField("contactName", event.target.value)} disabled={isSaving} className={inputClass(styles)} placeholder="Primary contact" />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} disabled={isSaving} className={inputClass(styles)} placeholder="Phone number" />
            </Field>
            <Field label="Email">
              <input value={form.email} onChange={(event) => updateField("email", event.target.value)} disabled={isSaving} className={inputClass(styles)} placeholder="Email address" />
            </Field>
            <Field label="Status">
              <FormSelect value={form.isActive ? "active" : "inactive"} onChange={(event) => updateField("isActive", event.target.value === "active")} disabled={isSaving} selectClassName={styles.input}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </FormSelect>
            </Field>
            <Field label="Type of Payee" required>
              <FormSelect value={form.payeeType} onChange={(event) => updateField("payeeType", event.target.value as PayeeType)} disabled={isSaving} selectClassName={styles.input}>
                {payeeTypeOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </FormSelect>
            </Field>
            <div className="md:col-span-2">
              <PayDeskSwitch
                label="Allow this payee to receive payments from the POS."
                helper="When enabled, this payee will be available as a payment recipient from PayDesk POS."
                checked={form.allowPosPayments}
                disabled={isSaving}
                onChange={(checked) => updateField("allowPosPayments", checked)}
                className={`flex-row-reverse items-center justify-between rounded-[8px] border p-4 ${styles.nested}`}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Address line 1">
              <input value={form.addressLine1} onChange={(event) => updateField("addressLine1", event.target.value)} disabled={isSaving} className={inputClass(styles)} placeholder="Street address" />
            </Field>
            <Field label="Address line 2">
              <input value={form.addressLine2} onChange={(event) => updateField("addressLine2", event.target.value)} disabled={isSaving} className={inputClass(styles)} placeholder="Suite, unit, etc." />
            </Field>
            <Field label="City">
              <input value={form.city} onChange={(event) => updateField("city", event.target.value)} disabled={isSaving} className={inputClass(styles)} placeholder="City" />
            </Field>
            <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-3">
              <Field label="State">
                <input value={form.state} onChange={(event) => updateField("state", event.target.value)} disabled={isSaving} className={inputClass(styles)} placeholder="State" />
              </Field>
              <Field label="Postal code">
                <input value={form.postalCode} onChange={(event) => updateField("postalCode", event.target.value)} disabled={isSaving} className={inputClass(styles)} placeholder="ZIP" />
              </Field>
            </div>
          </div>

          <Field label="Notes">
            <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} disabled={isSaving} className={`${inputClass(styles)} min-h-24 py-3`} placeholder="Internal notes" />
          </Field>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} disabled={isSaving} className={`h-10 rounded-[8px] border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles.input}`}>
              Cancel
            </button>
            <button type="submit" disabled={isSaving || !form.name.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35">
              {isSaving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
              {isSaving ? "Saving..." : payee ? "Update Payee" : "Create Payee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDialog({
  theme,
  title,
  description,
  targetName,
  confirmLabel,
  isProcessing,
  onCancel,
  onConfirm,
}: {
  theme: "light" | "dark";
  title: string;
  description: string;
  targetName: string;
  confirmLabel: string;
  isProcessing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const styles = classesFor(theme);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    queueMicrotask(() => cancelRef.current?.focus());
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-0 backdrop-blur-sm sm:items-center sm:py-6" role="presentation">
      <div className={`w-full max-w-[520px] rounded-t-[18px] border p-5 shadow-[0_28px_90px_rgba(15,23,42,0.24)] sm:rounded-[14px] sm:p-6 ${styles.panel}`} role="dialog" aria-modal="true" aria-labelledby="confirm-payee-action-title">
        <h2 id="confirm-payee-action-title" className="text-xl font-bold tracking-normal">{title}</h2>
        <p className={`mt-3 text-sm font-semibold leading-6 ${styles.muted}`}>{description}</p>
        <p className={`mt-4 rounded-[8px] border p-3 text-sm font-bold ${styles.nested}`}>{targetName}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={isProcessing} className={`h-10 rounded-[8px] border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles.input}`}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={isProcessing} className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35">
            {isProcessing ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            {isProcessing ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}{required ? " *" : ""}</span>
      <span className="mt-2 block">{children}</span>
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

function Badge({ tone, children }: { tone: "success" | "warning"; children: string }) {
  const toneClass = tone === "success" ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500";
  return <span className={`inline-flex rounded-[6px] px-2 py-1 text-xs font-extrabold ${toneClass}`}>{children}</span>;
}

function TableHeader({ children }: { children: string }) {
  return <th className="px-4 py-3">{children}</th>;
}

function SkeletonRows() {
  return Array.from({ length: 6 }).map((_, rowIndex) => (
    <tr key={rowIndex} className="border-b border-slate-400/10">
      {Array.from({ length: 10 }).map((__, cellIndex) => (
        <td key={cellIndex} className="px-4 py-3">
          <span className="block h-4 w-24 rounded-[4px] bg-slate-400/20" />
        </td>
      ))}
    </tr>
  ));
}

function Pagination({
  page,
  totalPages,
  limit,
  styles,
  onPageChange,
  onLimitChange,
}: {
  page: number;
  totalPages: number;
  limit: 10 | 25 | 50;
  styles: ThemeClasses;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: 10 | 25 | 50) => void;
}) {
  return (
    <nav className={`flex flex-col gap-3 rounded-[8px] border p-4 sm:flex-row sm:items-center sm:justify-between ${styles.panel}`} aria-label="Payee pagination">
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={`h-10 rounded-[8px] border px-4 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-50 ${styles.input}`}>Previous</button>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className={`h-10 rounded-[8px] border px-4 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-50 ${styles.input}`}>Next</button>
      </div>
      <p className="text-sm font-bold">Page {page} of {totalPages}</p>
      <label className="text-sm font-bold">
        Rows per page
        <select value={limit} onChange={(event) => onLimitChange(Number(event.target.value) as 10 | 25 | 50)} className={`ml-3 h-10 rounded-[8px] border px-3 text-sm font-bold outline-none ${styles.input}`}>
          {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </label>
    </nav>
  );
}

function inputClass(styles: ThemeClasses) {
  return `h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 disabled:cursor-not-allowed ${styles.input}`;
}

function textOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function formToPayload(form: PayeeFormState): PayeeInput {
  return {
    name: form.name.trim(),
    accountNumber: textOrNull(form.accountNumber),
    contactName: textOrNull(form.contactName),
    phone: textOrNull(form.phone),
    email: textOrNull(form.email),
    addressLine1: textOrNull(form.addressLine1),
    addressLine2: textOrNull(form.addressLine2),
    city: textOrNull(form.city),
    state: textOrNull(form.state),
    postalCode: textOrNull(form.postalCode),
    notes: textOrNull(form.notes),
    isActive: form.isActive,
    payeeType: form.payeeType,
    allowPosPayments: form.allowPosPayments,
  };
}

function payeeToForm(payee: Payee | null): PayeeFormState {
  if (!payee) return defaultForm;

  return {
    name: payee.name,
    accountNumber: payee.accountNumber ?? "",
    contactName: payee.contactName ?? "",
    phone: payee.phone ?? "",
    email: payee.email ?? "",
    addressLine1: payee.addressLine1 ?? "",
    addressLine2: payee.addressLine2 ?? "",
    city: payee.city ?? "",
    state: payee.state ?? "",
    postalCode: payee.postalCode ?? "",
    notes: payee.notes ?? "",
    isActive: payee.isActive,
    payeeType: payee.payeeType ?? "VENDOR",
    allowPosPayments: payee.allowPosPayments ?? false,
  };
}

function payeeTypeLabel(value: PayeeType) {
  return payeeTypeOptions.find(([key]) => key === value)?.[1] ?? value;
}

function formatAddress(payee: Payee) {
  const cityLine = [payee.city, payee.state, payee.postalCode].filter(Boolean).join(", ");
  return [payee.addressLine1, payee.addressLine2, cityLine].filter(Boolean).join(", ") || EMPTY;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY;

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
