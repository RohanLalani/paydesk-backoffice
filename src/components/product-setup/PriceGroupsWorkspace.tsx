"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Edit3, LoaderCircle, RotateCcw, Save, Search } from "lucide-react";
import { z } from "zod";
import { BackOfficeShell } from "@/src/components/layout/BackOfficeShell";
import { FormSelect } from "@/src/components/ui/FormSelect";
import {
  createPriceGroup,
  getPriceGroupProducts,
  getStorePriceGroup,
  getStorePriceGroups,
  updatePriceGroup,
  type PriceGroup,
  type PriceGroupProduct,
} from "@/src/features/products/api";

type StatusFilter = "all" | "active" | "inactive";
type MatchFilter = "all" | "matches" | "mismatches";

type PriceGroupFormState = {
  name: string;
  defaultUnitRetail: string;
  description: string;
  isActive: boolean;
};

const defaultForm: PriceGroupFormState = {
  name: "",
  defaultUnitRetail: "",
  description: "",
  isActive: true,
};

const priceGroupSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim().replace(/\s+/g, " "))
    .pipe(
      z
        .string()
        .min(1, "Price Group Name is required.")
        .max(100, "Price Group Name must be 100 characters or fewer.")
        .refine((value) => !/[\x00-\x1f\x7f]/.test(value), "Price Group Name contains unsupported characters."),
    ),
  defaultUnitRetail: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "The default price is invalid.")
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value), "The default price is invalid.")
    .refine((value) => value >= 0, "Default Unit Retail must be zero or greater.")
    .refine((value) => value <= 9999999999.99, "Default Unit Retail is too large.")
    .transform((value) => value.toFixed(2)),
  description: z
    .string()
    .trim()
    .max(240, "Description must be 240 characters or fewer.")
    .transform((value) => (value ? value : null)),
  isActive: z.boolean(),
});

export function PriceGroupsWorkspace({ detail }: { detail?: boolean }) {
  return (
    <BackOfficeShell activeItem="productSetup" requiredPermission="manage_products">
      {({ theme, selectedStore, account }) => (
        <PriceGroupsWorkspaceContent
          theme={theme}
          storeId={selectedStore.id}
          detail={detail}
          canEdit={account?.role === "owner" || account?.role === "partner" || account?.permissions?.includes("manage_products") === true}
        />
      )}
    </BackOfficeShell>
  );
}

function PriceGroupsWorkspaceContent({
  theme,
  storeId,
  detail,
  canEdit,
}: {
  theme: "light" | "dark";
  storeId: string;
  detail?: boolean;
  canEdit: boolean;
}) {
  const isDark = theme === "dark";
  const cardClass = isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white";
  const nestedClass = isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]";
  const inputClass = isDark
    ? "border-slate-400/15 bg-white/[0.04] text-[#f4f1ff] placeholder:text-slate-500 disabled:bg-white/[0.02] disabled:text-slate-500"
    : "border-[#ded8f3] bg-white text-slate-950 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";

  if (detail) {
    return <PriceGroupDetail storeId={storeId} canEdit={canEdit} cardClass={cardClass} nestedClass={nestedClass} inputClass={inputClass} mutedClass={mutedClass} />;
  }

  return <PriceGroupList storeId={storeId} canEdit={canEdit} cardClass={cardClass} inputClass={inputClass} mutedClass={mutedClass} />;
}

function PriceGroupList({
  storeId,
  canEdit,
  cardClass,
  inputClass,
  mutedClass,
}: {
  storeId: string;
  canEdit: boolean;
  cardClass: string;
  inputClass: string;
  mutedClass: string;
}) {
  const [form, setForm] = useState(defaultForm);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PriceGroupFormState, string>>>({});
  const [priceGroups, setPriceGroups] = useState<PriceGroup[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await getStorePriceGroups(storeId);
      setPriceGroups(response.items);
    } catch {
      setError("Price groups could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  const visiblePriceGroups = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return priceGroups
      .filter((priceGroup) => {
        const matchesSearch = !normalizedSearch || priceGroup.name.toLowerCase().includes(normalizedSearch);
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && priceGroup.isActive) ||
          (statusFilter === "inactive" && !priceGroup.isActive);

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name));
  }, [priceGroups, search, statusFilter]);

  function updateForm<K extends keyof PriceGroupFormState>(field: K, value: PriceGroupFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setMessage("");
    setError("");
  }

  function resetForm() {
    setForm(defaultForm);
    setFieldErrors({});
    setMessage("");
    setError("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canEdit || isSaving) return;

    const parsed = priceGroupSchema.safeParse(form);
    setFieldErrors({});
    setError("");
    setMessage("");

    if (!parsed.success) {
      setFieldErrors(
        parsed.error.issues.reduce<Partial<Record<keyof PriceGroupFormState, string>>>((errors, issue) => {
          const field = issue.path[0] as keyof PriceGroupFormState | undefined;
          if (field && !errors[field]) errors[field] = issue.message;
          return errors;
        }, {}),
      );
      return;
    }

    setIsSaving(true);
    try {
      await createPriceGroup(storeId, parsed.data);
      setMessage("Price group created.");
      setForm(defaultForm);
      await refresh();
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : "Price group could not be saved.";
      setError(messageText.includes("already exists") ? "A price group with this name already exists." : messageText);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[1320px] space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-normal">Price Groups</h1>
        <p className={`mt-2 max-w-[760px] text-sm font-semibold leading-6 ${mutedClass}`}>Create reusable default retail prices and monitor products that no longer match the group default.</p>
      </header>

      <StatusMessages message={message} error={error} />

      <form onSubmit={handleSubmit} className={`rounded-[8px] border p-6 ${cardClass}`}>
        <div>
          <h2 className="text-lg font-bold tracking-normal">Create Price Group</h2>
          <p className={`mt-1.5 text-sm font-semibold leading-6 ${mutedClass}`}>New groups start with a default retail value; assigned products may still use a different Unit Retail.</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Price Group Name" error={fieldErrors.name}>
            <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} disabled={!canEdit || isSaving} placeholder="e.g. Standard Retail" className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`} />
          </Field>
          <Field label="Default Unit Retail" error={fieldErrors.defaultUnitRetail}>
            <input value={form.defaultUnitRetail} onChange={(event) => updateForm("defaultUnitRetail", event.target.value)} disabled={!canEdit || isSaving} inputMode="decimal" placeholder="0.00" className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`} />
          </Field>
          <Field label="Description" error={fieldErrors.description}>
            <input value={form.description} onChange={(event) => updateForm("description", event.target.value)} disabled={!canEdit || isSaving} placeholder="Optional" className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`} />
          </Field>
          <ToggleRow label="Active Price Group" checked={form.isActive} disabled={!canEdit || isSaving} onChange={(checked) => updateForm("isActive", checked)} />
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={resetForm} disabled={isSaving} className={`inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-bold transition ${inputClass}`}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset
          </button>
          <button type="submit" disabled={!canEdit || isSaving} className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60">
            {isSaving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
            Save Price Group
          </button>
        </div>
      </form>

      <section className={`rounded-[8px] border p-6 ${cardClass}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-normal">Price Groups</h2>
            <p className={`mt-1 text-sm font-semibold leading-6 ${mutedClass}`}>All price groups for the selected store.</p>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={isLoading} className={`inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-bold transition ${inputClass}`}>
            {isLoading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            Refresh
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <label className="relative block">
            <Search className={`pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 ${mutedClass}`} aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search price groups" className={`h-11 w-full rounded-[8px] border py-2 pl-10 pr-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`} />
          </label>
          <FormSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} selectClassName={inputClass}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </FormSelect>
        </div>

        {isLoading ? (
          <div className="mt-5 flex min-h-44 items-center justify-center gap-2 text-sm font-bold">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Loading price groups...
          </div>
        ) : visiblePriceGroups.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visiblePriceGroups.map((priceGroup) => (
              <a key={priceGroup.id} href={`/product-setup/price-groups/details?id=${encodeURIComponent(priceGroup.id)}`} className={`group flex min-h-44 flex-col rounded-[8px] border p-4 outline-none transition hover:-translate-y-0.5 hover:border-[#7c5cff] focus-visible:ring-4 focus-visible:ring-[#7c5cff]/25 ${cardClass}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold tracking-normal">{priceGroup.name}</h3>
                    <p className={`mt-1 text-sm font-semibold ${mutedClass}`}>Default retail: {formatCurrency(priceGroup.defaultUnitRetail)}</p>
                  </div>
                  <Badge tone={priceGroup.isActive ? "success" : "neutral"}>{priceGroup.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm font-bold">
                  <Metric label="Products" value={priceGroup.productCount} mutedClass={mutedClass} />
                  <Metric label="Mismatched" value={priceGroup.mismatchedItemCount} mutedClass={mutedClass} />
                </div>
                <div className="mt-auto pt-4">
                  <Badge tone={priceGroup.mismatchedItemCount > 0 ? "warning" : "success"}>{priceGroup.mismatchedItemCount > 0 ? `${priceGroup.mismatchedItemCount} mismatched` : "No mismatches"}</Badge>
                  <p className={`mt-2 text-xs font-semibold ${mutedClass}`}>{freshnessLabel(priceGroup.mismatchCountUpdatedAt)}</p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="mt-5 min-h-44 rounded-[8px] border border-dashed p-6">
            <h3 className="text-base font-bold tracking-normal">No price groups found</h3>
            <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>Create a price group or adjust the search and status filters.</p>
          </div>
        )}
      </section>
    </section>
  );
}

function PriceGroupDetail({
  storeId,
  canEdit,
  cardClass,
  nestedClass,
  inputClass,
  mutedClass,
}: {
  storeId: string;
  canEdit: boolean;
  cardClass: string;
  nestedClass: string;
  inputClass: string;
  mutedClass: string;
}) {
  const [priceGroupId, setPriceGroupId] = useState("");
  const [priceGroup, setPriceGroup] = useState<PriceGroup | null>(null);
  const [products, setProducts] = useState<PriceGroupProduct[]>([]);
  const [tab, setTab] = useState<"contents" | "add-products">("contents");
  const [search, setSearch] = useState("");
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editForm, setEditForm] = useState(defaultForm);

  useEffect(() => {
    queueMicrotask(() => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id") ?? "";
      setPriceGroupId(id);
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!priceGroupId) return;
    setIsLoading(true);
    setError("");
    try {
      const [groupResponse, productResponse] = await Promise.all([
        getStorePriceGroup(storeId, priceGroupId),
        getPriceGroupProducts(storeId, priceGroupId, { search, match: matchFilter }),
      ]);
      setPriceGroup(groupResponse);
      setEditForm({
        name: groupResponse.name,
        defaultUnitRetail: groupResponse.defaultUnitRetail,
        description: groupResponse.description ?? "",
        isActive: groupResponse.isActive,
      });
      setProducts(productResponse.items);
    } catch {
      setError("Products in this price group could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [matchFilter, priceGroupId, search, storeId]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!canEdit || !priceGroupId || isSaving) return;
    const parsed = priceGroupSchema.safeParse(editForm);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "The default price is invalid.");
      return;
    }

    if (priceGroup?.isActive && !parsed.data.isActive) {
      const confirmed = window.confirm("This price group will no longer be available for new product assignments. Existing products will remain assigned to it.");
      if (!confirmed) return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      await updatePriceGroup(storeId, priceGroupId, parsed.data);
      setMessage("Price group updated.");
      await refresh();
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Price group could not be updated.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!priceGroupId) {
    return <EmptyDetail cardClass={cardClass} mutedClass={mutedClass} />;
  }

  return (
    <section className="mx-auto w-full max-w-[1320px] space-y-6">
      <a href="/product-setup/price-groups" className={`inline-flex h-10 items-center gap-2 rounded-[8px] border px-4 text-sm font-bold transition ${inputClass}`}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Price Groups
      </a>

      <StatusMessages message={message} error={error} />

      <section className={`rounded-[8px] border p-6 ${cardClass}`}>
        {isLoading && !priceGroup ? (
          <div className="flex min-h-32 items-center justify-center gap-2 text-sm font-bold">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Loading price group...
          </div>
        ) : priceGroup ? (
          <>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-normal">{priceGroup.name}</h1>
                <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>{priceGroup.description || "No description"}</p>
              </div>
              <Badge tone={priceGroup.isActive ? "success" : "neutral"}>{priceGroup.isActive ? "Active" : "Inactive"}</Badge>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Default Unit Retail" value={formatCurrency(priceGroup.defaultUnitRetail)} mutedClass={mutedClass} />
              <Metric label="Products" value={priceGroup.productCount} mutedClass={mutedClass} />
              <Metric label="Mismatched" value={priceGroup.mismatchedItemCount} mutedClass={mutedClass} />
              <Metric label="Mismatch Refresh" value={freshnessLabel(priceGroup.mismatchCountUpdatedAt)} mutedClass={mutedClass} />
            </div>
          </>
        ) : null}
      </section>

      {priceGroup ? (
        <form onSubmit={saveEdit} className={`rounded-[8px] border p-6 ${cardClass}`}>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-normal">
            <Edit3 className="size-4" aria-hidden="true" />
            Edit Price Group
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Price Group Name">
              <input value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} disabled={!canEdit || isSaving} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`} />
            </Field>
            <Field label="Default Unit Retail">
              <input value={editForm.defaultUnitRetail} onChange={(event) => setEditForm((current) => ({ ...current, defaultUnitRetail: event.target.value }))} disabled={!canEdit || isSaving} inputMode="decimal" className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`} />
            </Field>
            <Field label="Description">
              <input value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} disabled={!canEdit || isSaving} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`} />
            </Field>
            <ToggleRow label="Active Price Group" checked={editForm.isActive} disabled={!canEdit || isSaving} onChange={(checked) => setEditForm((current) => ({ ...current, isActive: checked }))} />
          </div>
          <div className="mt-5 flex justify-end">
            <button type="submit" disabled={!canEdit || isSaving} className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60">
              {isSaving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
              Update Price Group
            </button>
          </div>
        </form>
      ) : null}

      <section className={`rounded-[8px] border p-6 ${cardClass}`}>
        <div role="tablist" aria-label="Price group detail tabs" className="flex gap-2 border-b border-slate-500/20">
          <TabButton active={tab === "contents"} onClick={() => setTab("contents")}>Contents</TabButton>
          <TabButton active={tab === "add-products"} onClick={() => setTab("add-products")}>Add Products</TabButton>
        </div>

        {tab === "contents" ? (
          <div className="pt-5">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
              <label className="relative block">
                <Search className={`pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 ${mutedClass}`} aria-hidden="true" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search barcode or product" className={`h-11 w-full rounded-[8px] border py-2 pl-10 pr-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`} />
              </label>
              <FormSelect value={matchFilter} onChange={(event) => setMatchFilter(event.target.value as MatchFilter)} selectClassName={inputClass}>
                <option value="all">All</option>
                <option value="matches">Matches</option>
                <option value="mismatches">Mismatches</option>
              </FormSelect>
            </div>
            <div className={`mt-5 overflow-hidden rounded-[8px] border ${nestedClass}`}>
              {isLoading ? (
                <div className="flex min-h-40 items-center justify-center gap-2 text-sm font-bold">
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  Loading products...
                </div>
              ) : products.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-[920px] text-left text-sm">
                    <thead>
                      <tr>
                        {["Barcode", "Product / Description", "Department", "Unit Retail", "Default Group Retail", "Match Status", "Active Status"].map((heading) => (
                          <th key={heading} className="px-4 py-3 text-xs font-extrabold uppercase tracking-[0.06em] text-slate-500">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.id} className="border-t border-slate-500/15">
                          <td className="px-4 py-3 font-bold">{product.barcode}</td>
                          <td className="px-4 py-3 font-bold">{product.name}</td>
                          <td className="px-4 py-3 font-semibold">{product.departmentName ?? "Unassigned"}</td>
                          <td className="px-4 py-3 font-semibold">{formatCurrency(product.unitRetail)}</td>
                          <td className="px-4 py-3 font-semibold">{formatCurrency(product.defaultUnitRetail)}</td>
                          <td className="px-4 py-3"><Badge tone={product.matchesDefaultUnitRetail ? "success" : "warning"}>{product.matchesDefaultUnitRetail ? "Matches" : "Mismatch"}</Badge></td>
                          <td className="px-4 py-3"><Badge tone={product.isActive ? "success" : "neutral"}>{product.isActive ? "Active" : "Inactive"}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="min-h-40 p-6">
                  <h3 className="text-base font-bold tracking-normal">No products in this price group</h3>
                  <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>Products assigned to this price group will appear here.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="pt-5">
            <h2 className="text-lg font-bold tracking-normal">Add Products</h2>
            <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>Add existing store products to this price group.</p>
            <p className={`mt-5 rounded-[8px] border p-4 text-sm font-bold ${nestedClass}`}>This workflow will be implemented in a later step.</p>
          </div>
        )}
      </section>
    </section>
  );
}

function EmptyDetail({ cardClass, mutedClass }: { cardClass: string; mutedClass: string }) {
  return (
    <section className={`mx-auto w-full max-w-[720px] rounded-[8px] border p-6 ${cardClass}`}>
      <h1 className="text-xl font-bold tracking-normal">Price group not selected</h1>
      <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>Open a price group card from the Price Groups workspace.</p>
      <a href="/product-setup/price-groups" className="mt-5 inline-flex h-10 items-center justify-center rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white">Back to Price Groups</a>
    </section>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <span className="mt-2 block">{children}</span>
      {error ? <span className="mt-2 block text-xs font-bold text-red-500">{error}</span> : null}
    </label>
  );
}

function ToggleRow({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition ${checked ? "bg-[#4f2df2]" : "bg-slate-300"} peer-focus-visible:ring-4 peer-focus-visible:ring-[#7c5cff]/35 peer-disabled:cursor-not-allowed peer-disabled:opacity-60`}>
        <span className={`size-4 rounded-full bg-white transition ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </span>
      <span className="text-sm font-bold">{label}</span>
    </label>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`-mb-px h-11 border-b-2 px-4 text-sm font-extrabold outline-none transition focus-visible:ring-4 focus-visible:ring-[#7c5cff]/25 ${active ? "border-[#4f2df2] text-[#4f2df2]" : "border-transparent text-slate-500 hover:text-[#4f2df2]"}`}>
      {children}
    </button>
  );
}

function Badge({ tone, children }: { tone: "success" | "warning" | "neutral"; children: string }) {
  const toneClass = {
    success: "bg-emerald-500/15 text-emerald-500",
    warning: "bg-amber-500/15 text-amber-600",
    neutral: "bg-slate-500/15 text-slate-500",
  }[tone];

  return <span className={`inline-flex rounded-[6px] px-2 py-1 text-xs font-extrabold ${toneClass}`}>{children}</span>;
}

function Metric({ label, value, mutedClass }: { label: string; value: string | number; mutedClass: string }) {
  return (
    <div>
      <p className={`text-xs font-extrabold uppercase tracking-[0.06em] ${mutedClass}`}>{label}</p>
      <p className="mt-1 text-base font-extrabold">{value}</p>
    </div>
  );
}

function StatusMessages({ message, error }: { message: string; error: string }) {
  return (
    <div className="space-y-3" aria-live="polite">
      {message ? <Alert tone="success" title={message} /> : null}
      {error ? <Alert tone="error" title={error} /> : null}
    </div>
  );
}

function Alert({ tone, title }: { tone: "success" | "error"; title: string }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  const toneClass = tone === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600" : "border-red-500/20 bg-red-500/10 text-red-600";
  return (
    <div className={`flex items-start gap-2 rounded-[8px] border p-3 text-sm font-bold ${toneClass}`} role={tone === "error" ? "alert" : "status"}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {title}
    </div>
  );
}

function formatCurrency(value: string | number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? `$${number.toFixed(2)}` : "$0.00";
}

function freshnessLabel(value: string | null) {
  if (!value) return "Count may be stale";
  const ageMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ageMs)) return "Count may be stale";
  const minutes = Math.max(0, Math.round(ageMs / 60000));
  if (minutes > 15) return "Count may be stale";
  if (minutes === 0) return "Updated just now";
  return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
}
