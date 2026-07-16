"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Edit3, LoaderCircle, RotateCcw, Save, Search } from "lucide-react";
import { z } from "zod";
import { BackOfficeShell } from "@/src/components/layout/BackOfficeShell";
import { FormSelect } from "@/src/components/ui/FormSelect";
import {
  createProductCategory,
  getProductCategoryProducts,
  getStoreDepartments,
  getStoreProductCategories,
  getStoreProductCategory,
  updateProductCategory,
  type Department,
  type ProductCategory,
  type ProductCategoryProduct,
} from "@/src/features/products/api";

type StatusFilter = "all" | "active" | "inactive";

type CategoryFormState = {
  name: string;
  departmentId: string;
  brand: string;
  description: string;
  isActive: boolean;
};

const defaultForm: CategoryFormState = {
  name: "",
  departmentId: "",
  brand: "",
  description: "",
  isActive: true,
};

const categorySchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim().replace(/\s+/g, " "))
    .pipe(
      z
        .string()
        .min(1, "Category Name is required.")
        .max(100, "Category Name must be 100 characters or fewer.")
        .refine((value) => !/[\x00-\x1f\x7f]/.test(value), "Category Name contains unsupported characters."),
    ),
  departmentId: z.string().min(1, "Department is required."),
  brand: z.string().trim().max(100, "Brand must be 100 characters or fewer.").transform((value) => (value ? value : null)),
  description: z.string().trim().max(240, "Description must be 240 characters or fewer.").transform((value) => (value ? value : null)),
  isActive: z.boolean(),
});

export function CategoriesWorkspace({ detail }: { detail?: boolean }) {
  return (
    <BackOfficeShell activeItem="productSetup" requiredPermission="manage_products">
      {({ theme, selectedStore, account }) => (
        <CategoriesWorkspaceContent
          theme={theme}
          storeId={selectedStore.id}
          detail={detail}
          canEdit={account?.role === "owner" || account?.role === "partner" || account?.permissions?.includes("manage_products") === true}
        />
      )}
    </BackOfficeShell>
  );
}

function CategoriesWorkspaceContent({
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
    return <CategoryDetail storeId={storeId} canEdit={canEdit} cardClass={cardClass} nestedClass={nestedClass} inputClass={inputClass} mutedClass={mutedClass} />;
  }

  return <CategoryList storeId={storeId} canEdit={canEdit} cardClass={cardClass} inputClass={inputClass} mutedClass={mutedClass} />;
}

function CategoryList({
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CategoryFormState, string>>>({});
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [categoryResponse, departmentItems] = await Promise.all([
        getStoreProductCategories(storeId),
        getStoreDepartments(storeId, { active: true }),
      ]);
      setCategories(categoryResponse.items);
      setDepartments(departmentItems);
    } catch {
      setError("Categories could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);

  const visibleCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return categories
      .filter((category) => {
        const matchesSearch = !normalizedSearch || category.name.toLowerCase().includes(normalizedSearch);
        const matchesDepartment = departmentFilter === "all" || category.departmentId === departmentFilter;
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && category.isActive) ||
          (statusFilter === "inactive" && !category.isActive);

        return matchesSearch && matchesDepartment && matchesStatus;
      })
      .sort((a, b) => (a.posDepartmentNumber ?? 999999) - (b.posDepartmentNumber ?? 999999) || a.name.localeCompare(b.name));
  }, [categories, departmentFilter, search, statusFilter]);

  function updateForm<K extends keyof CategoryFormState>(field: K, value: CategoryFormState[K]) {
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
    const parsed = categorySchema.safeParse(form);
    setFieldErrors({});
    setMessage("");
    setError("");

    if (!parsed.success) {
      setFieldErrors(
        parsed.error.issues.reduce<Partial<Record<keyof CategoryFormState, string>>>((errors, issue) => {
          const field = issue.path[0] as keyof CategoryFormState | undefined;
          if (field && !errors[field]) errors[field] = issue.message;
          return errors;
        }, {}),
      );
      return;
    }

    setIsSaving(true);
    try {
      await createProductCategory(storeId, parsed.data);
      setMessage("Category created.");
      setForm(defaultForm);
      await refresh();
    } catch (apiError) {
      const text = apiError instanceof Error ? apiError.message : "Category could not be saved.";
      setError(text.includes("already exists") ? "A category with this name already exists in this department." : text);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[1320px] space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-normal">Categories</h1>
        <p className={`mt-2 max-w-[760px] text-sm font-semibold leading-6 ${mutedClass}`}>Organize products inside store departments for future POS category workflows.</p>
      </header>

      <StatusMessages message={message} error={error} />

      <form onSubmit={handleSubmit} className={`rounded-[8px] border p-6 ${cardClass}`}>
        <h2 className="text-lg font-bold tracking-normal">Create Category</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Category Name" error={fieldErrors.name}>
            <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} disabled={!canEdit || isSaving} placeholder="e.g. Disposable Vapes" className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`} />
          </Field>
          <Field label="Department" error={fieldErrors.departmentId}>
            <FormSelect value={form.departmentId} onChange={(event) => updateForm("departmentId", event.target.value)} disabled={!canEdit || isSaving || !departments.length} selectClassName={inputClass}>
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.posDepartmentNumber} - {department.name}</option>
              ))}
            </FormSelect>
          </Field>
          <Field label="Brand" error={fieldErrors.brand}>
            <input value={form.brand} onChange={(event) => updateForm("brand", event.target.value)} disabled={!canEdit || isSaving} placeholder="Optional" className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`} />
          </Field>
          <Field label="Description" error={fieldErrors.description}>
            <input value={form.description} onChange={(event) => updateForm("description", event.target.value)} disabled={!canEdit || isSaving} placeholder="Optional" className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`} />
          </Field>
          <ToggleRow label="Active Category" checked={form.isActive} disabled={!canEdit || isSaving} onChange={(checked) => updateForm("isActive", checked)} />
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={resetForm} disabled={isSaving} className={`inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-bold transition ${inputClass}`}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset
          </button>
          <button type="submit" disabled={!canEdit || isSaving} className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60">
            {isSaving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
            Save Category
          </button>
        </div>
      </form>

      <section className={`rounded-[8px] border p-6 ${cardClass}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-normal">Categories</h2>
            <p className={`mt-1 text-sm font-semibold leading-6 ${mutedClass}`}>All product categories for the selected store.</p>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={isLoading} className={`inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-bold transition ${inputClass}`}>
            {isLoading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            Refresh
          </button>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
          <label className="relative block">
            <Search className={`pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 ${mutedClass}`} aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search categories" className={`h-11 w-full rounded-[8px] border py-2 pl-10 pr-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`} />
          </label>
          <FormSelect value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} selectClassName={inputClass}>
            <option value="all">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>{department.posDepartmentNumber} - {department.name}</option>
            ))}
          </FormSelect>
          <FormSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} selectClassName={inputClass}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </FormSelect>
        </div>

        {isLoading ? (
          <div className="mt-5 flex min-h-44 items-center justify-center gap-2 text-sm font-bold">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Loading categories...
          </div>
        ) : visibleCategories.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleCategories.map((category) => (
              <a key={category.id} href={`/product-setup/categories/details?id=${encodeURIComponent(category.id)}`} className={`group flex min-h-40 flex-col rounded-[8px] border p-4 outline-none transition hover:-translate-y-0.5 hover:border-[#7c5cff] focus-visible:ring-4 focus-visible:ring-[#7c5cff]/25 ${cardClass}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold tracking-normal">{category.name}</h3>
                    <p className={`mt-1 text-sm font-semibold ${mutedClass}`}>{category.posDepartmentNumber ?? "Unconfigured"} - {category.departmentName ?? "Department required"}</p>
                  </div>
                  <Badge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                {category.brand ? <p className={`mt-4 text-sm font-bold ${mutedClass}`}>Brand: {category.brand}</p> : null}
                <div className="mt-auto pt-4">
                  <Metric label="Products" value={category.productCount} mutedClass={mutedClass} />
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="mt-5 min-h-44 rounded-[8px] border border-dashed p-6">
            <h3 className="text-base font-bold tracking-normal">No categories found</h3>
            <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>Create a category or adjust the search and filters.</p>
          </div>
        )}
      </section>
    </section>
  );
}

function CategoryDetail({ storeId, canEdit, cardClass, nestedClass, inputClass, mutedClass }: { storeId: string; canEdit: boolean; cardClass: string; nestedClass: string; inputClass: string; mutedClass: string }) {
  const [categoryId, setCategoryId] = useState("");
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [products, setProducts] = useState<ProductCategoryProduct[]>([]);
  const [tab, setTab] = useState<"contents" | "add-products">("contents");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editForm, setEditForm] = useState(defaultForm);

  useEffect(() => {
    queueMicrotask(() => {
      setCategoryId(new URLSearchParams(window.location.search).get("id") ?? "");
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!categoryId) return;
    setIsLoading(true);
    setError("");
    try {
      const [categoryResponse, departmentItems, productResponse] = await Promise.all([
        getStoreProductCategory(storeId, categoryId),
        getStoreDepartments(storeId, { active: true }),
        getProductCategoryProducts(storeId, categoryId, { search }),
      ]);
      setCategory(categoryResponse);
      setDepartments(departmentItems);
      setProducts(productResponse.items);
      setEditForm({
        name: categoryResponse.name,
        departmentId: categoryResponse.departmentId ?? "",
        brand: categoryResponse.brand ?? "",
        description: categoryResponse.description ?? "",
        isActive: categoryResponse.isActive,
      });
    } catch {
      setError("Products in this category could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [categoryId, search, storeId]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!canEdit || !categoryId || isSaving) return;
    const parsed = categorySchema.safeParse(editForm);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Category could not be updated.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setError("");
    try {
      await updateProductCategory(storeId, categoryId, parsed.data);
      setMessage("Category updated.");
      await refresh();
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Category could not be updated.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!categoryId) {
    return (
      <section className={`mx-auto w-full max-w-[720px] rounded-[8px] border p-6 ${cardClass}`}>
        <h1 className="text-xl font-bold tracking-normal">Category not selected</h1>
        <a href="/product-setup/categories" className="mt-5 inline-flex h-10 items-center justify-center rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white">Back to Categories</a>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[1320px] space-y-6">
      <a href="/product-setup/categories" className={`inline-flex h-10 items-center gap-2 rounded-[8px] border px-4 text-sm font-bold transition ${inputClass}`}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Categories
      </a>
      <StatusMessages message={message} error={error} />
      <section className={`rounded-[8px] border p-6 ${cardClass}`}>
        {isLoading && !category ? (
          <div className="flex min-h-32 items-center justify-center gap-2 text-sm font-bold">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Loading category...
          </div>
        ) : category ? (
          <>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-normal">{category.name}</h1>
                <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>{category.posDepartmentNumber ?? "Unconfigured"} - {category.departmentName ?? "Department required"}</p>
              </div>
              <Badge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "Active" : "Inactive"}</Badge>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Products" value={category.productCount} mutedClass={mutedClass} />
              <Metric label="Brand" value={category.brand ?? "None"} mutedClass={mutedClass} />
            </div>
          </>
        ) : null}
      </section>

      {category ? (
        <form onSubmit={saveEdit} className={`rounded-[8px] border p-6 ${cardClass}`}>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-normal"><Edit3 className="size-4" aria-hidden="true" />Edit Category</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Category Name">
              <input value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} disabled={!canEdit || isSaving} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`} />
            </Field>
            <Field label="Department">
              <FormSelect value={editForm.departmentId} onChange={(event) => setEditForm((current) => ({ ...current, departmentId: event.target.value }))} disabled={!canEdit || isSaving} selectClassName={inputClass}>
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.posDepartmentNumber} - {department.name}</option>
                ))}
              </FormSelect>
            </Field>
            <Field label="Brand">
              <input value={editForm.brand} onChange={(event) => setEditForm((current) => ({ ...current, brand: event.target.value }))} disabled={!canEdit || isSaving} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`} />
            </Field>
            <Field label="Description">
              <input value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} disabled={!canEdit || isSaving} className={`h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`} />
            </Field>
            <ToggleRow label="Active Category" checked={editForm.isActive} disabled={!canEdit || isSaving} onChange={(checked) => setEditForm((current) => ({ ...current, isActive: checked }))} />
          </div>
          <div className="mt-5 flex justify-end">
            <button type="submit" disabled={!canEdit || isSaving} className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60">
              {isSaving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
              Update Category
            </button>
          </div>
        </form>
      ) : null}

      <section className={`rounded-[8px] border p-6 ${cardClass}`}>
        <div role="tablist" aria-label="Category detail tabs" className="flex gap-2 border-b border-slate-500/20">
          <TabButton active={tab === "contents"} onClick={() => setTab("contents")}>Contents</TabButton>
          <TabButton active={tab === "add-products"} onClick={() => setTab("add-products")}>Add Products</TabButton>
        </div>
        {tab === "contents" ? (
          <div className="pt-5">
            <label className="relative block">
              <Search className={`pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 ${mutedClass}`} aria-hidden="true" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product number, barcode, or name" className={`h-11 w-full rounded-[8px] border py-2 pl-10 pr-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 ${inputClass}`} />
            </label>
            <div className={`mt-5 overflow-hidden rounded-[8px] border ${nestedClass}`}>
              {isLoading ? (
                <div className="flex min-h-40 items-center justify-center gap-2 text-sm font-bold"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Loading products...</div>
              ) : products.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-[860px] text-left text-sm">
                    <thead>
                      <tr>{["Product #", "Barcode", "Product Name", "Department", "Unit Retail", "Active Status"].map((heading) => <th key={heading} className="px-4 py-3 text-xs font-extrabold uppercase tracking-[0.06em] text-slate-500">{heading}</th>)}</tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.id} className="border-t border-slate-500/15">
                          <td className="px-4 py-3 font-bold">{product.productNumber}</td>
                          <td className="px-4 py-3 font-bold">{product.barcode}</td>
                          <td className="px-4 py-3 font-bold">{product.name}</td>
                          <td className="px-4 py-3 font-semibold">{product.departmentName ?? "Unassigned"}</td>
                          <td className="px-4 py-3 font-semibold">{formatCurrency(product.unitRetail)}</td>
                          <td className="px-4 py-3"><Badge tone={product.isActive ? "success" : "neutral"}>{product.isActive ? "Active" : "Inactive"}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="min-h-40 p-6"><h3 className="text-base font-bold tracking-normal">No products in this category</h3></div>
              )}
            </div>
          </div>
        ) : (
          <div className="pt-5">
            <h2 className="text-lg font-bold tracking-normal">Add Products</h2>
            <p className={`mt-2 text-sm font-semibold leading-6 ${mutedClass}`}>Add existing store products to this category.</p>
            <p className={`mt-5 rounded-[8px] border p-4 text-sm font-bold ${nestedClass}`}>This workflow will be implemented in a later step.</p>
          </div>
        )}
      </section>
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
    <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`-mb-px h-11 border-b-2 px-4 text-sm font-extrabold outline-none transition focus-visible:ring-4 focus-visible:ring-[#7c5cff]/25 ${active ? "border-[#4f2df2] text-[#4f2df2]" : "border-transparent text-slate-500 hover:text-[#4f2df2]"}`}>{children}</button>
  );
}

function Badge({ tone, children }: { tone: "success" | "neutral"; children: string }) {
  return <span className={`inline-flex rounded-[6px] px-2 py-1 text-xs font-extrabold ${tone === "success" ? "bg-emerald-500/15 text-emerald-500" : "bg-slate-500/15 text-slate-500"}`}>{children}</span>;
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
  return <div className={`flex items-start gap-2 rounded-[8px] border p-3 text-sm font-bold ${toneClass}`} role={tone === "error" ? "alert" : "status"}><Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{title}</div>;
}

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}
