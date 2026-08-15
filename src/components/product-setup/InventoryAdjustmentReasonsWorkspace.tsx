"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, Plus, Search } from "lucide-react";
import { BackOfficeShell } from "@/src/components/layout/BackOfficeShell";
import {
  createInventoryAdjustmentReason,
  getInventoryAdjustmentReasons,
  type InventoryAdjustmentReason,
} from "@/src/features/product-setup/api";
import { ApiClientError } from "@/src/lib/apiClient";

type ReasonFormState = {
  name: string;
  description: string;
};

const defaultForm: ReasonFormState = {
  name: "",
  description: "",
};

export function InventoryAdjustmentReasonsWorkspace() {
  return (
    <BackOfficeShell activeItem="productSetup" requiredPermission="manage_products">
      {({ theme, selectedStore, account }) => (
        <InventoryAdjustmentReasonsContent
          theme={theme}
          storeId={selectedStore.id}
          canEdit={account?.role === "owner" || account?.role === "partner" || account?.permissions?.includes("manage_products") === true}
        />
      )}
    </BackOfficeShell>
  );
}

function InventoryAdjustmentReasonsContent({
  theme,
  storeId,
  canEdit,
}: {
  theme: "light" | "dark";
  storeId: string;
  canEdit: boolean;
}) {
  const isDark = theme === "dark";
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [reasons, setReasons] = useState<InventoryAdjustmentReason[]>([]);
  const [form, setForm] = useState<ReasonFormState>(defaultForm);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ReasonFormState, string>>>({});
  const [pageError, setPageError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");

  const cardClass = isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white";
  const nestedClass = isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]";
  const inputClass = isDark
    ? "border-slate-400/15 bg-white/[0.04] text-[#f4f1ff] placeholder:text-slate-500 disabled:bg-white/[0.02] disabled:text-slate-500"
    : "border-[#ded8f3] bg-white text-slate-950 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";

  const refreshReasons = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    setPageError("");

    try {
      const response = await getInventoryAdjustmentReasons(storeId);
      setReasons(response.items);
    } catch (error) {
      console.error("Failed to load inventory adjustment reasons", error);
      setLoadError("Inventory adjustment reasons could not be loaded. Please refresh and try again.");
      setReasons([]);
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshReasons();
    });
  }, [refreshReasons]);

  const visibleReasons = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return reasons;

    return reasons.filter((reason) => {
      return (
        reason.name.toLowerCase().includes(normalizedSearch) ||
        (reason.description ?? "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [reasons, search]);

  function updateForm<K extends keyof ReasonFormState>(field: K, value: ReasonFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setPageError("");
    setSuccessMessage("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canEdit || isSaving) return;

    const name = form.name.trim().replace(/\s+/g, " ");
    const description = form.description.trim();
    const errors: Partial<Record<keyof ReasonFormState, string>> = {};

    setFieldErrors({});
    setPageError("");
    setSuccessMessage("");

    if (!name) {
      errors.name = "Name is required.";
    } else if (name.length > 100) {
      errors.name = "Name must be 100 characters or fewer.";
    }

    if (description.length > 240) {
      errors.description = "Description must be 240 characters or fewer.";
    }

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setIsSaving(true);

    try {
      await createInventoryAdjustmentReason(storeId, {
        name,
        description: description || null,
      });
      setForm(defaultForm);
      setSuccessMessage("Inventory adjustment reason created.");
      await refreshReasons();
      queueMicrotask(() => nameInputRef.current?.focus());
    } catch (error) {
      console.error("Failed to create inventory adjustment reason", error);
      setPageError(getCreateErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[1320px] space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-normal">Inventory Adjustment Reasons</h1>
        <p className={`mt-2 max-w-[760px] text-sm font-semibold leading-6 ${mutedClass}`}>
          Configure reasons for inventory adjustments.
        </p>
      </header>

      <div className="space-y-3" aria-live="polite">
        {successMessage ? <Alert tone="success" title={successMessage} /> : null}
        {pageError ? <Alert tone="error" title={pageError} /> : null}
        {!canEdit ? <Alert tone="warning" title="You do not have permission to manage inventory adjustment reasons." /> : null}
      </div>

      <form onSubmit={handleSubmit} className={`rounded-[8px] border p-6 ${cardClass}`}>
        <div>
          <h2 className="text-lg font-bold tracking-normal">Create Reason</h2>
          <p className={`mt-1.5 text-sm font-semibold leading-6 ${mutedClass}`}>
            Add a short reason employees can use when inventory is adjusted.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Name" error={fieldErrors.name}>
            <input
              ref={nameInputRef}
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              disabled={!canEdit || isSaving}
              placeholder="Damaged Product"
              className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 disabled:cursor-not-allowed ${inputClass}`}
            />
          </Field>
          <Field label="Description" error={fieldErrors.description}>
            <textarea
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              disabled={!canEdit || isSaving}
              placeholder="Used when inventory is reduced because an item was damaged."
              className={`min-h-24 w-full resize-y rounded-[8px] border px-3 py-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 disabled:cursor-not-allowed ${inputClass}`}
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={!canEdit || isSaving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35"
          >
            {isSaving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
            {isSaving ? "Creating..." : "Create Reason"}
          </button>
        </div>
      </form>

      <div className={`rounded-[8px] border p-6 ${cardClass}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-normal">Existing Reasons</h2>
            <p className={`mt-1 text-sm font-semibold leading-6 ${mutedClass}`}>
              Search existing reasons before creating another one.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshReasons()}
            disabled={isLoading}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}
          >
            {isLoading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            Refresh
          </button>
        </div>

        <label className="relative mt-5 block">
          <span className="sr-only">Search inventory adjustment reasons</span>
          <Search className={`pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 ${mutedClass}`} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or description"
            className={`h-11 w-full rounded-[8px] border py-2 pl-10 pr-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`}
          />
        </label>

        <div className={`mt-5 overflow-hidden rounded-[8px] border ${nestedClass}`}>
          {isLoading ? (
            <div className="flex min-h-44 items-center justify-center gap-2 text-sm font-bold">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Loading reasons...
            </div>
          ) : loadError ? (
            <div className="min-h-44 p-6">
              <h3 className="text-base font-bold tracking-normal">Unable to load reasons</h3>
              <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>{loadError}</p>
            </div>
          ) : visibleReasons.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-[760px] text-left text-sm">
                <thead className={isDark ? "bg-white/[0.04] text-slate-400" : "bg-[#f0edff] text-slate-600"}>
                  <tr>
                    <TableHeader>Name</TableHeader>
                    <TableHeader>Description</TableHeader>
                    <TableHeader>Created</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </tr>
                </thead>
                <tbody>
                  {visibleReasons.map((reason) => (
                    <tr key={reason.id} className={`border-t ${isDark ? "border-slate-400/10" : "border-[#ded8f3]"}`}>
                      <td className="px-4 py-3 font-bold">{reason.name}</td>
                      <td className={`px-4 py-3 font-semibold ${reason.description ? "" : mutedClass}`}>
                        {reason.description || "No description"}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${mutedClass}`}>{formatDate(reason.createdAt)}</td>
                      <td className="px-4 py-3"><Badge>Active</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="min-h-44 p-6">
              <h3 className="text-base font-bold tracking-normal">
                {search.trim() ? "No reasons match your search." : "No inventory adjustment reasons have been created yet."}
              </h3>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
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

function TableHeader({ children }: { children: string }) {
  return <th className="px-4 py-3 text-xs font-extrabold uppercase tracking-[0.06em]">{children}</th>;
}

function Badge({ children }: { children: string }) {
  return <span className="inline-flex rounded-[6px] bg-emerald-500/15 px-2 py-1 text-xs font-extrabold text-emerald-500">{children}</span>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function getCreateErrorMessage(error: unknown) {
  if (error instanceof ApiClientError && error.status === 409) {
    return "An inventory adjustment reason with this name already exists.";
  }

  if (error instanceof ApiClientError) {
    return error.message;
  }

  return "Inventory adjustment reason could not be created.";
}
