"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  LoaderCircle,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { BackOfficeShell } from "@/src/components/layout/BackOfficeShell";
import { ProductsSidebar } from "@/src/components/layout/ProductsSidebar";
import {
  createPromotion,
  deletePromotion,
  getPromotion,
  promotionTypes,
  searchPromotionProducts,
  transitionPromotion,
  updatePromotion,
  type PromotionPayload,
  type PromotionProduct,
  type PromotionType,
} from "@/src/features/promotions/api";

const schema = z
  .object({
    name: z.string().trim().min(1, "Promotion name is required"),
    description: z.string(),
    type: z.enum(promotionTypes),
    startAt: z.string(),
    endAt: z.string(),
    priority: z.number().int().min(0),
    stackable: z.boolean(),
    conflictStrategy: z.enum([
      "PRIORITY",
      "BEST_CUSTOMER_DISCOUNT",
      "BEST_STORE_MARGIN",
    ]),
    internalNotes: z.string(),
    useSeparateRewardProducts: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.startAt && v.endAt && new Date(v.endAt) <= new Date(v.startAt))
      ctx.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "End must be after start",
      });
  });
type Form = z.infer<typeof schema>;
const defaults: Form = {
  name: "",
  description: "",
  type: "BUY_X_GET_Y_FREE",
  startAt: "",
  endAt: "",
  priority: 0,
  stackable: false,
  conflictStrategy: "PRIORITY",
  internalNotes: "",
  useSeparateRewardProducts: false,
};
const fields: Record<
  PromotionType,
  Array<[string, string, "number" | "boolean"]>
> = {
  BUY_X_GET_Y_FREE: [
    ["buyQuantity", "Buy quantity", "number"],
    ["rewardQuantity", "Reward quantity", "number"],
    ["sameProductOnly", "Same product only", "boolean"],
  ],
  BUY_X_GET_Y_PERCENT_OFF: [
    ["buyQuantity", "Buy quantity", "number"],
    ["discountedQuantity", "Discounted quantity", "number"],
    ["discountPercentage", "Discount percentage", "number"],
  ],
  BUY_X_GET_Y_FIXED_PRICE: [
    ["buyQuantity", "Buy quantity", "number"],
    ["discountedQuantity", "Discounted quantity", "number"],
    ["fixedRewardPrice", "Fixed reward price", "number"],
  ],
  QUANTITY_BUNDLE_PRICE: [
    ["requiredQuantity", "Required quantity", "number"],
    ["bundlePrice", "Bundle price", "number"],
    ["allowMultiples", "Allow multiples", "boolean"],
  ],
  QUANTITY_PERCENT_OFF: [
    ["requiredQuantity", "Required quantity", "number"],
    ["discountPercentage", "Discount percentage", "number"],
    ["allowMultiples", "Allow multiples", "boolean"],
  ],
  FIXED_AMOUNT_OFF_ITEM: [
    ["discountAmount", "Discount per item", "number"],
    ["minimumQuantity", "Minimum quantity", "number"],
  ],
  PERCENT_OFF_ITEM: [
    ["discountPercentage", "Discount percentage", "number"],
    ["minimumQuantity", "Minimum quantity", "number"],
  ],
  FIXED_AMOUNT_OFF_GROUP: [
    ["requiredQuantity", "Required quantity", "number"],
    ["discountAmount", "Discount amount", "number"],
  ],
  MIX_AND_MATCH_BUNDLE: [
    ["requiredQuantity", "Required quantity", "number"],
    ["bundlePrice", "Bundle price", "number"],
    ["allowMultiples", "Allow multiples", "boolean"],
  ],
  SPEND_THRESHOLD_FIXED_OFF: [
    ["minimumSpend", "Minimum qualifying spend", "number"],
    ["discountAmount", "Discount amount", "number"],
  ],
  SPEND_THRESHOLD_PERCENT_OFF: [
    ["minimumSpend", "Minimum qualifying spend", "number"],
    ["discountPercentage", "Discount percentage", "number"],
    ["maximumDiscountAmount", "Maximum discount", "number"],
  ],
  CUSTOM_PRICE: [
    ["promotionalUnitPrice", "Promotional unit price", "number"],
    ["maximumQuantity", "Maximum quantity", "number"],
  ],
};

export function PromotionEditor({ mode }: { mode: "new" | "edit" }) {
  return (
    <BackOfficeShell
      activeItem="products"
      requiredPermission="manage_products"
      sectionSidebar={({ theme }) => <ProductsSidebar theme={theme} />}
    >
      {({ theme, selectedStore, account }) => (
        <Content
          mode={mode}
          storeId={selectedStore.id}
          dark={theme === "dark"}
          canActivate={
            account?.role === "owner" ||
            account?.role === "partner" ||
            account?.permissions?.includes("activate_promotions") === true
          }
        />
      )}
    </BackOfficeShell>
  );
}
function Content({
  mode,
  storeId,
  dark,
  canActivate,
}: {
  mode: "new" | "edit";
  storeId: string;
  dark: boolean;
  canActivate: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const id = mode === "edit" ? params.get("id") : null;
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: defaults });
  const type = useWatch({ control, name: "type" });
  const separate = useWatch({ control, name: "useSeparateRewardProducts" });
  const promotionName = useWatch({ control, name: "name" });
  const stackable = useWatch({ control, name: "stackable" });
  const [configuration, setConfiguration] = useState<
    Record<string, number | boolean>
  >({ buyQuantity: 1, rewardQuantity: 1 });
  const [qualifying, setQualifying] = useState<PromotionProduct[]>([]);
  const [rewards, setRewards] = useState<PromotionProduct[]>([]);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [message, setMessage] = useState("");
  const [advanced, setAdvanced] = useState({
    allowCashierOverride: false,
    requireManagerApproval: false,
    applyAutomatically: true,
    printOnReceipt: true,
    displayAtPos: true,
    stopLowerPriority: false,
    excludePriceOverrides: true,
    allowRepeatedApplications: true,
    limitOneUsePerCustomer: false,
    loyaltyRequired: false,
    allowEbtProducts: true,
    applyBeforeTax: true,
    maxApplicationsPerTransaction: "" as string,
    maxDiscountedQuantityPerTransaction: "" as string,
  });
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    addEventListener("beforeunload", before);
    return () => removeEventListener("beforeunload", before);
  }, [isDirty]);
  const detail = useQuery({
    queryKey: ["promotion", storeId, id],
    queryFn: () => getPromotion(storeId, id!),
    enabled: Boolean(id),
  });
  useEffect(() => {
    if (!detail.data) return;
    const p = detail.data;
    reset({
      name: p.name,
      description: p.description ?? "",
      type: p.type,
      startAt: local(p.startAt),
      endAt: local(p.endAt),
      priority: p.priority,
      stackable: p.stackable,
      conflictStrategy: p.conflictStrategy,
      internalNotes: p.internalNotes ?? "",
      useSeparateRewardProducts: p.useSeparateRewardProducts,
    });
    // The server record is the external source used to initialize this shared editor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfiguration(p.configuration);
    setQualifying(p.qualifyingProducts);
    setRewards(p.rewardProducts);
    setAdvanced((a) => ({
      ...a,
      allowCashierOverride: p.allowCashierOverride,
      requireManagerApproval: p.requireManagerApproval,
      applyAutomatically: p.applyAutomatically,
      printOnReceipt: p.printOnReceipt,
      displayAtPos: p.displayAtPos,
      stopLowerPriority: p.stopLowerPriority,
      excludePriceOverrides: p.excludePriceOverrides,
      allowRepeatedApplications: p.allowRepeatedApplications,
      limitOneUsePerCustomer: p.limitOneUsePerCustomer,
      loyaltyRequired: p.loyaltyRequired,
      allowEbtProducts: p.allowEbtProducts,
      applyBeforeTax: p.applyBeforeTax,
      maxApplicationsPerTransaction:
        p.maxApplicationsPerTransaction?.toString() ?? "",
      maxDiscountedQuantityPerTransaction:
        p.maxDiscountedQuantityPerTransaction?.toString() ?? "",
    }));
  }, [detail.data, reset]);
  const products = useQuery({
    queryKey: ["promotion-products", storeId, debounced],
    queryFn: () => searchPromotionProducts(storeId, debounced),
    enabled: debounced.length >= 2,
  });
  const save = useMutation({
    mutationFn: ({
      form,
      status,
    }: {
      form: Form;
      status: "DRAFT" | "ACTIVE";
    }) => {
      const payload = {
        ...form,
        status,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
        configuration,
        qualifyingProductIds: qualifying.map((p) => p.id),
        rewardProductIds: separate ? rewards.map((p) => p.id) : [],
        ...advanced,
        maxApplicationsPerTransaction: advanced.maxApplicationsPerTransaction
          ? Number(advanced.maxApplicationsPerTransaction)
          : null,
        maxDiscountedQuantityPerTransaction:
          advanced.maxDiscountedQuantityPerTransaction
            ? Number(advanced.maxDiscountedQuantityPerTransaction)
            : null,
      } as PromotionPayload;
      return id
        ? updatePromotion(storeId, id, payload)
        : createPromotion(storeId, payload);
    },
    onSuccess: (p) => {
      setMessage("Promotion saved.");
      qc.invalidateQueries({ queryKey: ["promotions", storeId] });
      if (!id) router.replace(`/products/promotions/edit?id=${p.id}`);
    },
  });
  const remove = useMutation({
    mutationFn: () => deletePromotion(storeId, id!),
    onSuccess: () => router.push("/products/promotions"),
  });
  const transition = useMutation({
    mutationFn: (action: "activate" | "pause" | "deactivate" | "archive") =>
      transitionPromotion(storeId, id!, action),
    onSuccess: () => {
      detail.refetch();
      qc.invalidateQueries({ queryKey: ["promotions", storeId] });
    },
  });
  const panel = dark
    ? "border-slate-400/15 bg-[#0f172a]"
    : "border-[#ded8f3] bg-white";
  const input = `mt-2 h-11 w-full rounded-[8px] border px-3 text-sm font-semibold outline-none focus:border-[#7c5cff] ${dark ? "border-slate-400/20 bg-slate-900" : "border-[#ded8f3] bg-white"}`;
  const selectedIds = useMemo(
    () => new Set([...qualifying, ...rewards].map((p) => p.id)),
    [qualifying, rewards],
  );
  const summary = `${promotionName || "This promotion"}: ${type.replaceAll("_", " ").toLowerCase()}. Applies to ${qualifying.length} qualifying product${qualifying.length === 1 ? "" : "s"}${separate ? ` and ${rewards.length} reward products` : ""}. ${stackable ? "Can" : "Cannot"} combine with other promotions.`;
  if (mode === "edit" && !id)
    return (
      <div className={`rounded-[8px] border p-8 ${panel}`}>
        Promotion ID is missing.
      </div>
    );
  if (detail.isLoading)
    return (
      <div
        className={`grid min-h-96 place-items-center rounded-[8px] border ${panel}`}
      >
        <LoaderCircle className="animate-spin" />
      </div>
    );
  return (
    <form
      onSubmit={handleSubmit((form) => save.mutate({ form, status: "ACTIVE" }))}
      className="space-y-4"
    >
      <div className={`rounded-[8px] border p-5 ${panel}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/products/promotions"
              className="grid size-10 place-items-center rounded-[8px] border border-slate-400/25"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">
                {mode === "new" ? "Create Promotion" : "Edit Promotion"}
              </h1>
              {message && (
                <p className="text-sm font-bold text-emerald-500">{message}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {id && canActivate && (
              <button
                type="button"
                onClick={() =>
                  transition.mutate(
                    detail.data?.effectiveStatus === "ACTIVE"
                      ? "pause"
                      : "activate",
                  )
                }
                className="h-10 rounded-[8px] border border-[#7c5cff] px-3 font-bold text-[#7c5cff]"
              >
                {detail.data?.effectiveStatus === "ACTIVE"
                  ? "Pause"
                  : "Activate"}
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit((form) =>
                save.mutate({ form, status: "DRAFT" }),
              )}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#7c5cff] px-3 font-bold text-[#7c5cff]"
            >
              <Save className="size-4" />
              Save as Draft
            </button>
            <button
              disabled={save.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#4f2df2] px-3 font-bold text-white"
            >
              {save.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save
            </button>
            {id && (
              <button
                type="button"
                onClick={() =>
                  confirm("Delete or archive this promotion?") &&
                  remove.mutate()
                }
                className="grid size-10 place-items-center rounded-[8px] border border-red-500 text-red-500"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </div>
        {save.error && (
          <p className="mt-3 text-sm font-bold text-red-500">
            {save.error.message}
          </p>
        )}
      </div>
      <Card title="1. Promotion details" panel={panel}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Promotion name" error={errors.name?.message}>
            <input {...register("name")} className={input} />
          </Field>
          <Field label="Promotion type">
            <select {...register("type")} className={input}>
              {promotionTypes.map((t) => (
                <option key={t}>{t.replaceAll("_", " ")}</option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <textarea
              {...register("description")}
              className={`${input} h-24 py-3`}
            />
          </Field>
          <Field label="Internal notes">
            <textarea
              {...register("internalNotes")}
              className={`${input} h-24 py-3`}
            />
          </Field>
        </div>
      </Card>
      <Card title="2. Promotion configuration" panel={panel}>
        <div className="grid gap-4 md:grid-cols-3">
          {fields[type].map(([key, label, kind]) =>
            kind === "boolean" ? (
              <Check
                key={key}
                label={label}
                checked={configuration[key] === true}
                onChange={(v) => setConfiguration((c) => ({ ...c, [key]: v }))}
              />
            ) : (
              <Field key={key} label={label}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={Number(configuration[key] ?? "")}
                  onChange={(e) =>
                    setConfiguration((c) => ({
                      ...c,
                      [key]: Number(e.target.value),
                    }))
                  }
                  className={input}
                />
              </Field>
            ),
          )}
        </div>
      </Card>
      <Card title="3. Qualifying products" panel={panel}>
        <ProductFinder
          search={search}
          setSearch={setSearch}
          products={products.data?.items ?? []}
          loading={products.isFetching}
          selected={qualifying}
          selectedIds={selectedIds}
          input={input}
          onAdd={(p) =>
            setQualifying((s) => (s.some((x) => x.id === p.id) ? s : [...s, p]))
          }
          onRemove={(id) => setQualifying((s) => s.filter((p) => p.id !== id))}
        />
        <div className="mt-4">
          <Check
            label="Use separate reward products"
            checked={separate}
            register={register("useSeparateRewardProducts")}
          />
        </div>
      </Card>
      {separate && (
        <Card title="4. Reward products" panel={panel}>
          <ProductFinder
            search={search}
            setSearch={setSearch}
            products={products.data?.items ?? []}
            loading={products.isFetching}
            selected={rewards}
            selectedIds={selectedIds}
            input={input}
            onAdd={(p) =>
              setRewards((s) => (s.some((x) => x.id === p.id) ? s : [...s, p]))
            }
            onRemove={(id) => setRewards((s) => s.filter((p) => p.id !== id))}
          />
        </Card>
      )}
      <Card title="5. Behavior and conflict rules" panel={panel}>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Check
            label="Can combine with other promotions"
            checked={stackable}
            register={register("stackable")}
          />
          {(
            [
              "applyAutomatically",
              "allowCashierOverride",
              "requireManagerApproval",
              "displayAtPos",
              "printOnReceipt",
              "allowRepeatedApplications",
              "excludePriceOverrides",
              "stopLowerPriority",
              "limitOneUsePerCustomer",
              "loyaltyRequired",
              "allowEbtProducts",
              "applyBeforeTax",
            ] as const
          ).map((key) => (
            <Check
              key={key}
              label={key.replace(/([A-Z])/g, " $1")}
              checked={Boolean(advanced[key])}
              onChange={(v) => setAdvanced((a) => ({ ...a, [key]: v }))}
            />
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="Conflict strategy">
            <select {...register("conflictStrategy")} className={input}>
              <option value="PRIORITY">Priority</option>
              <option value="BEST_CUSTOMER_DISCOUNT">
                Best customer discount
              </option>
              <option value="BEST_STORE_MARGIN">Best store margin</option>
            </select>
          </Field>
          <Field label="Maximum applications">
            <input
              type="number"
              min="1"
              value={advanced.maxApplicationsPerTransaction}
              onChange={(e) =>
                setAdvanced((a) => ({
                  ...a,
                  maxApplicationsPerTransaction: e.target.value,
                }))
              }
              className={input}
            />
          </Field>
          <Field label="Maximum discounted quantity">
            <input
              type="number"
              min="1"
              value={advanced.maxDiscountedQuantityPerTransaction}
              onChange={(e) =>
                setAdvanced((a) => ({
                  ...a,
                  maxDiscountedQuantityPerTransaction: e.target.value,
                }))
              }
              className={input}
            />
          </Field>
        </div>
      </Card>
      <Card title="6. Schedule and status" panel={panel}>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Start date and time" error={errors.startAt?.message}>
            <input
              type="datetime-local"
              {...register("startAt")}
              className={input}
            />
          </Field>
          <Field label="End date and time" error={errors.endAt?.message}>
            <input
              type="datetime-local"
              {...register("endAt")}
              className={input}
            />
          </Field>
          <Field label="Priority">
            <input
              type="number"
              min="0"
                {...register("priority", { valueAsNumber: true })}
              className={input}
            />
          </Field>
        </div>
      </Card>
      <Card title="7. Review summary" panel={panel}>
        <p className="font-semibold leading-7">{summary}</p>
      </Card>
    </form>
  );
}
function Card({
  title,
  panel,
  children,
}: {
  title: string;
  panel: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-[8px] border p-5 ${panel}`}>
      <h2 className="mb-4 text-lg font-extrabold">{title}</h2>
      {children}
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
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      {children}
      {error && (
        <span className="mt-1 block text-xs text-red-500">{error}</span>
      )}
    </label>
  );
}
function Check({
  label,
  checked,
  onChange,
  register,
}: {
  label: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  register?: ReturnType<ReturnType<typeof useForm<Form>>["register"]>;
}) {
  return (
    <label className="flex items-center gap-2 rounded-[8px] border border-slate-400/20 p-3 text-sm font-bold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        {...register}
        className="size-4 accent-[#4f2df2]"
      />
      {label}
    </label>
  );
}
function ProductFinder({
  search,
  setSearch,
  products,
  loading,
  selected,
  selectedIds,
  input,
  onAdd,
  onRemove,
}: {
  search: string;
  setSearch: (v: string) => void;
  products: PromotionProduct[];
  loading: boolean;
  selected: PromotionProduct[];
  selectedIds: Set<string>;
  input: string;
  onAdd: (p: PromotionProduct) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-5 size-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search number, barcode, name, department, category, price group or NACS"
          className={`${input} pl-9`}
        />
        {loading && (
          <LoaderCircle className="absolute right-3 top-5 size-4 animate-spin" />
        )}
      </div>
      {search.length >= 2 && (
        <div className="mt-3 max-h-56 overflow-auto rounded-[8px] border border-slate-400/20">
          {products.map((p) => (
            <button
              type="button"
              disabled={selectedIds.has(p.id)}
              onClick={() => onAdd(p)}
              key={p.id}
              className="flex w-full items-center justify-between border-b border-slate-400/15 px-3 py-2 text-left text-sm hover:bg-[#7c5cff]/10 disabled:opacity-40"
            >
              <span>
                <b>
                  #{p.productNumber} {p.name}
                </b>
                <small className="block text-slate-500">
                  {p.barcode} · {p.department?.name ?? "No department"} · $
                  {p.unitRetail.toFixed(2)}
                </small>
              </span>
              <Plus className="size-4" />
            </button>
          ))}
        </div>
      )}
      <div className="mt-4">
        <h3 className="font-extrabold">
          Selected products ({selected.length})
        </h3>
        {!selected.length ? (
          <p className="mt-2 text-sm text-slate-500">No products selected.</p>
        ) : (
          <div className="mt-2 max-h-56 overflow-auto rounded-[8px] border border-slate-400/20">
            {selected.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between border-b border-slate-400/15 px-3 py-2 text-sm"
              >
                <span>
                  #{p.productNumber} <b>{p.name}</b>
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(p.id)}
                  aria-label={`Remove ${p.name}`}
                >
                  <X className="size-4 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
function local(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
