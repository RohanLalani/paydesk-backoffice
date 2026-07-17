"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type FormEvent, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { AlertCircle, Camera, CheckCircle2, LoaderCircle, PackageCheck, RotateCcw, Save, Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { BackOfficeShell } from "@/src/components/layout/BackOfficeShell";
import { ProductsSidebar } from "@/src/components/layout/ProductsSidebar";
import { FormSelect } from "@/src/components/ui/FormSelect";
import { PayDeskSwitch } from "@/src/components/ui/Switch";
import {
  createProduct,
  getDepartments,
  getNextProductNumber,
  getPriceGroups,
  getStoreProductById,
  getProductCategories,
  getTaxes,
  lookupProductByBarcode,
  updateProduct,
  type ProductPayload,
  type ProductRecord,
  type ProductReference,
  type ProductSaleType,
  type TaxStyle,
} from "@/src/features/products/api";
import { validateBarcodeInput } from "@/src/features/products/barcodeValidation";

type FormMode = "idle" | "create" | "edit";
type FieldErrors = Partial<Record<keyof ItemFormState | "form", string>>;

type ItemFormState = {
  barcode: string;
  name: string;
  saleType: ProductSaleType;
  departmentId: string;
  productCategoryId: string;
  priceGroupId: string;
  isActive: boolean;
  unitRetail: string;
  onlineRetailPrice: string;
  unitsPerCase: string;
  caseCost: string;
  caseDiscount: string;
  caseRebate: string;
  defaultMargin: string;
  currentQuantity: string;
  trackInventory: boolean;
  allowNegativeInventory: boolean;
  minInventory: string;
  maxInventory: string;
  unitOfMeasure: string;
  size: string;
  minimumAge: string;
  nacsCode: string;
  nacsCategory: string;
  nacsSubCategory: string;
  taxId: string;
  taxStyle: TaxStyle;
  allowEbt: boolean;
  blueLaw: boolean;
  kitchenPrint: boolean;
};

type RepeatTemplate = Omit<ItemFormState, "barcode" | "currentQuantity">;

const defaultForm: ItemFormState = {
  barcode: "",
  name: "",
  saleType: "piece",
  departmentId: "",
  productCategoryId: "",
  priceGroupId: "",
  isActive: true,
  unitRetail: "",
  onlineRetailPrice: "",
  unitsPerCase: "1",
  caseCost: "",
  caseDiscount: "0",
  caseRebate: "0",
  defaultMargin: "",
  currentQuantity: "0",
  trackInventory: true,
  allowNegativeInventory: false,
  minInventory: "",
  maxInventory: "",
  unitOfMeasure: "",
  size: "",
  minimumAge: "",
  nacsCode: "",
  nacsCategory: "",
  nacsSubCategory: "",
  taxId: "",
  taxStyle: "post_discount",
  allowEbt: false,
  blueLaw: false,
  kitchenPrint: false,
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

export function ItemsWorkspace() {
  return (
    <BackOfficeShell
      activeItem="products"
      requiredPermission="manage_products"
      sectionSidebar={({ theme }) => <ProductsSidebar theme={theme} />}
    >
      {({ theme, selectedStore, account }) => (
        <ItemsWorkspaceContent
          theme={theme}
          storeId={selectedStore.id}
          canEdit={account?.role === "owner" || account?.role === "partner" || account?.permissions?.includes("manage_products") === true}
        />
      )}
    </BackOfficeShell>
  );
}

function ItemsWorkspaceContent({ theme, storeId, canEdit }: { theme: "light" | "dark"; storeId: string; canEdit: boolean }) {
  const searchParams = useSearchParams();
  const isDark = theme === "dark";
  const barcodeRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanLoopRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastLookupRef = useRef("");
  const [form, setForm] = useState<ItemFormState>(defaultForm);
  const [mode, setMode] = useState<FormMode>("idle");
  const [productId, setProductId] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [departments, setDepartments] = useState<ProductReference[]>([]);
  const [categories, setCategories] = useState<ProductReference[]>([]);
  const [priceGroups, setPriceGroups] = useState<ProductReference[]>([]);
  const [taxes, setTaxes] = useState<ProductReference[]>([]);
  const [productNumber, setProductNumber] = useState<number | null>(null);
  const [nextProductNumber, setNextProductNumber] = useState<number | null>(null);
  const [productNumberLoading, setProductNumberLoading] = useState(true);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [priceGroupDefaultMessage, setPriceGroupDefaultMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [repeatPreviousValues, setRepeatPreviousValues] = useState(false);
  const [repeatTemplate, setRepeatTemplate] = useState<RepeatTemplate | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [preloadedProductId, setPreloadedProductId] = useState<string | null>(null);
  const requestedProductId = searchParams.get("productId");

  useEffect(() => {
    let isMounted = true;

    queueMicrotask(() => {
      if (!isMounted) return;
      setReferenceLoading(true);
      setProductNumberLoading(true);
      setRepeatTemplate(null);
      setForm(defaultForm);
      setMode("idle");
      setProductId(null);
      setUpdatedAt(null);
      setProductNumber(null);
      setNextProductNumber(null);
      setMessage("");
      setError("");
      setPriceGroupDefaultMessage("");
      setFieldErrors({});
      setHasSubmitted(false);
      setPreloadedProductId(null);
      lastLookupRef.current = "";
    });

    Promise.all([getDepartments(storeId), getProductCategories(storeId), getPriceGroups(storeId), getTaxes(storeId), getNextProductNumber(storeId)])
      .then(([departmentItems, categoryItems, priceGroupItems, taxItems, nextNumber]) => {
        if (!isMounted) return;
        setDepartments(sortRefs(departmentItems));
        setCategories(sortRefs(categoryItems));
        setPriceGroups(sortRefs(priceGroupItems));
        setTaxes(sortRefs(taxItems));
        setNextProductNumber(nextNumber.nextProductNumber);
        setProductNumber(null);
      })
      .catch((apiError: unknown) => {
        if (!isMounted) return;
        if (process.env.NODE_ENV !== "production") {
          console.warn("Product reference data request failed", apiError);
        }
        setError("Reference data could not be loaded. Please refresh and try again.");
      })
      .finally(() => {
        if (isMounted) {
          setReferenceLoading(false);
          setProductNumberLoading(false);
        }
      });

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [storeId]);

  useEffect(() => {
    if (!requestedProductId || referenceLoading || !departments.length) {
      return;
    }
    if (requestedProductId === preloadedProductId) {
      return;
    }

    let isMounted = true;
    queueMicrotask(() => {
      if (!isMounted) return;
      setIsLookingUp(true);
      setMessage("Loading item...");
      setError("");
    });

    getStoreProductById(storeId, requestedProductId)
      .then((product) => {
        if (!isMounted) return;
        loadProduct(product);
        setMessage("Existing item loaded.");
        setPreloadedProductId(requestedProductId);
      })
      .catch(() => {
        if (!isMounted) return;
        setError("The requested item could not be loaded.");
        setMessage("");
      })
      .finally(() => {
        if (isMounted) {
          setIsLookingUp(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [departments.length, loadProduct, preloadedProductId, referenceLoading, requestedProductId, storeId]);

  const calculations = useMemo(() => {
    const units = parseNumber(form.unitsPerCase) ?? 0;
    const caseCost = parseNumber(form.caseCost);
    const caseDiscount = parseNumber(form.caseDiscount) ?? 0;
    const caseRebate = parseNumber(form.caseRebate) ?? 0;
    const unitRetail = parseNumber(form.unitRetail) ?? 0;

    if (!units || units <= 0 || caseCost === null) {
      return { discountPerUnit: null, rebatePerUnit: null, unitCost: null, adjustedUnitCost: null, margin: null };
    }

    const discountPerUnit = roundMoney(caseDiscount / units);
    const rebatePerUnit = roundMoney(caseRebate / units);
    const unitCost = roundMoney(caseCost / units);
    const adjustedUnitCost = roundMoney((caseCost - caseDiscount - caseRebate) / units);
    const margin = unitRetail > 0 ? roundMoney(((unitRetail - adjustedUnitCost) / unitRetail) * 100) : null;

    return { discountPerUnit, rebatePerUnit, unitCost, adjustedUnitCost, margin };
  }, [form]);

  function updateField<K extends keyof ItemFormState>(field: K, value: ItemFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
    if (field === "unitRetail") setPriceGroupDefaultMessage("");
  }

  async function refreshNextProductNumber() {
    setProductNumberLoading(true);
    setProductNumber(null);
    try {
      const response = await getNextProductNumber(storeId);
      setNextProductNumber(response.nextProductNumber);
    } catch {
      setNextProductNumber(null);
    } finally {
      setProductNumberLoading(false);
    }
  }

  function focusBarcodeField() {
    queueMicrotask(() => barcodeRef.current?.focus({ preventScroll: true }));
  }

  function handlePriceGroupChange(priceGroupId: string) {
    const priceGroup = priceGroups.find((item) => item.id === priceGroupId);

    setForm((current) => ({
      ...current,
      priceGroupId,
      ...(priceGroup?.defaultUnitRetail ? { unitRetail: priceGroup.defaultUnitRetail } : {}),
    }));
    setFieldErrors((current) => ({ ...current, priceGroupId: undefined, unitRetail: undefined, form: undefined }));
    setPriceGroupDefaultMessage(priceGroup ? `Defaulted from price group: ${priceGroup.name}.` : "");
    if (mode === "edit" && priceGroup) {
      setMessage("Unit Retail was updated from the selected price group.");
    }
  }

  function handleDepartmentChange(departmentId: string) {
    const department = departments.find((item) => item.id === departmentId);

    setForm((current) => ({
      ...current,
      departmentId,
      productCategoryId:
        current.productCategoryId &&
        categories.some((category) => category.id === current.productCategoryId && category.departmentId === departmentId)
          ? current.productCategoryId
          : "",
      ...(mode === "create" && department
        ? {
            taxId: department.defaultTaxId ?? "",
            allowEbt: department.allowEbt ?? department.defaultAllowEbt ?? current.allowEbt,
            trackInventory: department.trackInventory ?? current.trackInventory,
            allowNegativeInventory: department.allowNegativeInventorySales ?? current.allowNegativeInventory,
            defaultMargin:
              department.defaultRetailMargin === null || department.defaultRetailMargin === undefined
                ? current.defaultMargin
                : String(department.defaultRetailMargin),
            minimumAge: departmentMinimumAgeToItemValue(department.minimumAge) ?? current.minimumAge,
          }
        : department
          ? { taxId: department.defaultTaxId ?? current.taxId }
          : {}),
    }));
    setFieldErrors((current) => ({ ...current, departmentId: undefined, productCategoryId: undefined, taxId: undefined, form: undefined }));
  }

  function handleRepeatPreviousChange(checked: boolean) {
    setRepeatPreviousValues(checked);

    if (!checked) {
      setRepeatTemplate(null);
    }
  }

  async function handleLookup(rawBarcode = form.barcode) {
    if (isLookingUp) return;
    const validation = validateBarcodeInput(rawBarcode);

    if (!validation.ok) {
      setFieldErrors((current) => ({ ...current, barcode: validation.message }));
      setError(validation.message);
      return;
    }

    if (lastLookupRef.current === validation.barcode && isLookingUp) return;
    lastLookupRef.current = validation.barcode;
    setIsLookingUp(true);
    setError("");
    setMessage("Looking up item...");
    setFieldErrors({});

    try {
      const result = await lookupProductByBarcode(storeId, validation.barcode);

      if (result.found) {
        loadProduct(result.product);
        setProductNumber(result.product.productNumber);
        setPriceGroupDefaultMessage("");
        setMessage("Existing item loaded.");
      } else {
        const repeatedValues = repeatPreviousValues && repeatTemplate
          ? sanitizeRepeatTemplate(repeatTemplate, {
              departments,
              categories,
              priceGroups,
              taxes,
            })
          : null;
        setForm({
          ...defaultForm,
          ...(repeatedValues ?? {}),
          barcode: result.barcode,
          currentQuantity: "0",
        });
        setMode("create");
        setProductId(null);
        setUpdatedAt(null);
        setProductNumber(null);
        setMessage(repeatedValues ? "Previous item values applied." : "No item found. Enter details to create it.");
      }
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : "Item lookup failed.";
      setError(messageText);
      setMessage("");
    } finally {
      setIsLookingUp(false);
    }
  }

  function handleBarcodeKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void handleLookup();
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!canEdit || isSaving) return;
    setHasSubmitted(true);
    const validation = validateForm(form, departments.length > 0);
    setFieldErrors(validation.errors);

    if (!validation.ok) {
      setError("Fix the highlighted fields before saving.");
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("Saving...");

    try {
      const payload = buildPayload(storeId, form);
      const wasEditing = mode === "edit" && Boolean(productId);
      const saved =
        wasEditing && productId
          ? await updateProduct(storeId, productId, payload)
          : await createProduct(storeId, payload);
      await resetAfterSuccessfulSave({
        savedProduct: saved,
        repeatPreviousValuesEnabled: repeatPreviousValues,
        successMessage: wasEditing ? "Item updated." : "Item created.",
      });
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Item could not be saved.");
      setMessage("");
    } finally {
      setIsSaving(false);
    }
  }

  const loadProduct = useCallback((product: ProductRecord) => {
    if (product.department && !departments.some((item) => item.id === product.departmentId)) {
      setDepartments((current) => sortRefs([...current, { ...product.department!, isActive: false }]));
    }
    if (product.priceGroup && product.priceGroupId && !priceGroups.some((item) => item.id === product.priceGroupId)) {
      setPriceGroups((current) => sortRefs([...current, { ...product.priceGroup!, name: `${product.priceGroup!.name} (Inactive)`, isActive: false }]));
    }
    if (product.productCategory && product.productCategoryId && !categories.some((item) => item.id === product.productCategoryId)) {
      setCategories((current) => sortRefs([...current, { ...product.productCategory!, name: `${product.productCategory!.name} (Inactive)`, isActive: false }]));
    }

    setForm(productToForm(product));
    setProductNumber(product.productNumber);
    setPriceGroupDefaultMessage("");
    setMode("edit");
    setProductId(product.id);
    setUpdatedAt(product.updatedAt ?? null);
  }, [categories, departments, priceGroups]);

  function resetForm() {
    if (isSaving) return;
    stopCamera();
    setForm(defaultForm);
    setMode("idle");
    setProductId(null);
    setUpdatedAt(null);
    setProductNumber(null);
    void refreshNextProductNumber();
    setMessage("");
    setError("");
    setPriceGroupDefaultMessage("");
    setFieldErrors({});
    setHasSubmitted(false);
    lastLookupRef.current = "";
    focusBarcodeField();
  }

  async function resetAfterSuccessfulSave({
    savedProduct,
    repeatPreviousValuesEnabled,
    successMessage,
  }: {
    savedProduct: ProductRecord;
    repeatPreviousValuesEnabled: boolean;
    successMessage: string;
  }) {
    const repeatedValues = repeatPreviousValuesEnabled
      ? sanitizeRepeatTemplate(productToRepeatTemplate(savedProduct), {
          departments,
          categories,
          priceGroups,
          taxes,
        })
      : null;

    if (repeatPreviousValuesEnabled) {
      setRepeatTemplate(repeatedValues);
    }

    stopCamera();
    setForm({
      ...defaultForm,
      ...(repeatedValues ?? {}),
      barcode: "",
      currentQuantity: "0",
    });
    setMode("idle");
    setProductId(null);
    setUpdatedAt(null);
    setProductNumber(null);
    setError("");
    setPriceGroupDefaultMessage("");
    setFieldErrors({});
    setHasSubmitted(false);
    lastLookupRef.current = "";
    await refreshNextProductNumber();
    setMessage(successMessage);
    focusBarcodeField();
  }

  async function openCamera() {
    setCameraError("");
    setCameraOpen(true);

    if (!window.BarcodeDetector) {
      setCameraError("Camera barcode scanning is not supported by this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      setIsScanning(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new window.BarcodeDetector({
        formats: ["upc_a", "upc_e", "ean_8", "ean_13", "code_128"],
      });

      const scan = async () => {
        if (!videoRef.current || !streamRef.current) return;
        const results = await detector.detect(videoRef.current).catch(() => []);
        const rawValue = results[0]?.rawValue;

        if (rawValue) {
          const validation = validateBarcodeInput(rawValue);

          if (validation.ok) {
            setForm((current) => ({ ...current, barcode: validation.barcode }));
            closeCamera();
            await handleLookup(validation.barcode);
            return;
          }
        }

        scanLoopRef.current = window.requestAnimationFrame(scan);
      };

      scanLoopRef.current = window.requestAnimationFrame(scan);
    } catch (cameraFailure) {
      setCameraError(
        cameraFailure instanceof DOMException && cameraFailure.name === "NotAllowedError"
          ? "Camera permission was denied."
          : "Camera is unavailable on this device.",
      );
      stopCamera();
    }
  }

  function stopCamera() {
    if (scanLoopRef.current) {
      window.cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsScanning(false);
  }

  function closeCamera() {
    stopCamera();
    setCameraOpen(false);
    setCameraError("");
  }

  const cardClass = isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white";
  const inputClass = isDark
    ? "border-slate-400/15 bg-white/[0.04] text-[#f4f1ff] placeholder:text-slate-500 disabled:bg-white/[0.02] disabled:text-slate-500"
    : "border-[#ded8f3] bg-white text-slate-950 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const selectedDepartment = departments.find((item) => item.id === form.departmentId);
  const visibleCategories = categories.filter(
    (item) =>
      !form.departmentId ||
      item.departmentId === form.departmentId ||
      item.id === form.productCategoryId,
  );
  const inheritedTax = selectedDepartment?.defaultTax ?? taxes.find((item) => item.id === selectedDepartment?.defaultTaxId);
  const canSave = canEdit && !referenceLoading && departments.length > 0 && Boolean(selectedDepartment?.defaultTaxId || form.taxId);
  const validationCount = Object.values(fieldErrors).filter(Boolean).length;
  const modeTone = mode === "edit" ? "bg-emerald-500/15 text-emerald-500" : mode === "create" ? "bg-sky-500/15 text-sky-500" : "bg-[#f0edff] text-[#4f2df2]";

  return (
    <form onSubmit={handleSave} className="mx-auto w-full max-w-[1320px] space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-normal">Items</h1>
          <p className={`mt-2 max-w-[760px] text-sm font-semibold leading-6 ${mutedClass}`}>
            Create, look up, and maintain sellable products.
          </p>
        </div>
        <span className={`inline-flex h-7 w-fit items-center rounded-[6px] px-2.5 text-[11px] font-extrabold uppercase tracking-[0.04em] ${modeTone}`}>
          {mode === "edit" ? "Edit mode" : mode === "create" ? "Create mode" : "Lookup mode"}
        </span>
      </header>

      <FormSectionCard title="Barcode Lookup" subtitle="Scan, type, or paste a barcode to load an item or begin a new one." cardClass={cardClass}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto_auto] lg:items-start">
          <div>
            <TextField
              label="Barcode"
              value={form.barcode}
              onChange={(value) => updateField("barcode", value)}
              onKeyDown={handleBarcodeKeyDown}
              error={fieldErrors.barcode}
              inputClass={inputClass}
              required
              inputRef={barcodeRef}
              readOnly={mode === "edit"}
              placeholder="Scan, type, or paste barcode"
            />
            <CheckboxRow
              label="Repeat previous values"
              helper="Reuse the previous item's details when starting the next new item."
              checked={repeatPreviousValues}
              onChange={handleRepeatPreviousChange}
            />
          </div>
          <TextField
            label="Product Number"
            value={productNumberLoading ? "Loading..." : String(productNumber ?? nextProductNumber ?? "")}
            onChange={() => undefined}
            inputClass={inputClass}
            disabled
            helperText={productNumber ? "Store product number." : "Assigned automatically for this store."}
          />
          <div className="lg:pt-[29px]">
            <PrimaryButton type="button" onClick={() => void handleLookup()} disabled={isLookingUp}>
              {isLookingUp ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Search className="size-4" aria-hidden="true" />}
              {isLookingUp ? "Looking up..." : "Lookup"}
            </PrimaryButton>
          </div>
          <div className="lg:pt-[29px]">
            <SecondaryButton type="button" onClick={() => void openCamera()} inputClass={inputClass}>
              <Camera className="size-4" aria-hidden="true" />
              Scan with camera
            </SecondaryButton>
          </div>
        </div>

        <div className="mt-4 space-y-3" aria-live="polite">
          {referenceLoading ? <InlineAlert tone="info" title="Loading reference data" body="Departments, categories, price groups, and taxes are loading." /> : null}
          {message ? <InlineAlert tone={message.includes("Saving") || message.includes("Looking") ? "info" : "success"} title={message} /> : null}
          {error ? <InlineAlert tone="error" title={error} /> : null}
          {hasSubmitted && validationCount > 0 ? (
            <InlineAlert tone="error" title="Review required fields" body={`${validationCount} field${validationCount === 1 ? "" : "s"} need attention before saving.`} />
          ) : null}
          {!referenceLoading && departments.length === 0 ? (
            <InlineAlert
              tone="warning"
              title="No active departments exist"
              body="Create a department before saving items."
              actionHref="/product-setup/departments"
              actionLabel="Open Departments"
            />
          ) : null}
        </div>
      </FormSectionCard>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <FormSectionCard title="General Information" subtitle="Core item identity and classification." cardClass={cardClass} className="xl:col-span-12">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField className="md:col-span-2" label="Description / Item name" value={form.name} onChange={(value) => updateField("name", value)} error={fieldErrors.name} inputClass={inputClass} required />
            <SelectField label="Sale type" value={form.saleType} onChange={(value) => updateField("saleType", value as ProductSaleType)} inputClass={inputClass} required options={[
              ["piece", "Piece"],
              ["weight", "Weight"],
              ["meat_barcode", "Meat barcode"],
              ["service", "Service"],
              ["lottery", "Lottery"],
              ["other", "Other"],
            ]} />
            <SelectField label="Department" value={form.departmentId} onChange={handleDepartmentChange} error={fieldErrors.departmentId} inputClass={inputClass} required options={departments.map((item) => [item.id, `${item.name}${item.isActive === false ? " (Inactive)" : ""}`])} placeholder="Select department" />
            <SelectField label="Product category" value={form.productCategoryId} onChange={(value) => updateField("productCategoryId", value)} inputClass={inputClass} options={visibleCategories.map((item) => [item.id, `${item.name}${item.isActive === false ? " (Inactive)" : ""}`])} placeholder={form.departmentId ? "None" : "Select department first"} />
            <SelectField label="Price group" value={form.priceGroupId} onChange={handlePriceGroupChange} inputClass={inputClass} options={priceGroups.map((item) => [item.id, item.name])} placeholder="None" />
            <ToggleRow className="md:col-span-2" label="Active item" helper="Available for sale, lookup, and product workflows." checked={form.isActive} onChange={(value) => updateField("isActive", value)} />
          </div>
        </FormSectionCard>

        <FormSectionCard title="Pricing and Cost" subtitle="Retail, case cost, discounts, and margin defaults." cardClass={cardClass} className="xl:col-span-12">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <TextField label="Unit retail" value={form.unitRetail} onChange={(value) => updateField("unitRetail", value)} error={fieldErrors.unitRetail} inputClass={inputClass} helperText={priceGroupDefaultMessage || undefined} required />
            <TextField label="Online retail price" value={form.onlineRetailPrice} onChange={(value) => updateField("onlineRetailPrice", value)} error={fieldErrors.onlineRetailPrice} inputClass={inputClass} />
            <TextField label="Units per case" value={form.unitsPerCase} onChange={(value) => updateField("unitsPerCase", value)} error={fieldErrors.unitsPerCase} inputClass={inputClass} required />
            <TextField label="Case cost" value={form.caseCost} onChange={(value) => updateField("caseCost", value)} error={fieldErrors.caseCost} inputClass={inputClass} />
            <TextField label="Case discount" value={form.caseDiscount} onChange={(value) => updateField("caseDiscount", value)} error={fieldErrors.caseDiscount} inputClass={inputClass} />
            <TextField label="Case rebate" value={form.caseRebate} onChange={(value) => updateField("caseRebate", value)} error={fieldErrors.caseRebate} inputClass={inputClass} />
            <TextField label="Default margin" value={form.defaultMargin} onChange={(value) => updateField("defaultMargin", value)} error={fieldErrors.defaultMargin} inputClass={inputClass} />
          </div>
          <div className={`mt-5 rounded-[8px] border p-4 ${isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]"}`}>
            <p className="text-sm font-extrabold tracking-normal">Calculated values</p>
            <MetricGrid values={calculations} className="mt-3" />
          </div>
        </FormSectionCard>

        <FormSectionCard title="Inventory" subtitle="Stock counts and inventory behavior." cardClass={cardClass} className="xl:col-span-6">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Current quantity"
              value={form.currentQuantity}
              onChange={() => undefined}
              inputClass={inputClass}
              disabled
              helperText="Current quantity is maintained through inventory transactions and cannot be edited here."
            />
            <TextField label="Minimum inventory" value={form.minInventory} onChange={(value) => updateField("minInventory", value)} error={fieldErrors.minInventory} inputClass={inputClass} />
            <TextField label="Maximum inventory" value={form.maxInventory} onChange={(value) => updateField("maxInventory", value)} error={fieldErrors.maxInventory} inputClass={inputClass} />
          </div>
          <div className="mt-5 space-y-3">
            <p className={`text-xs font-extrabold uppercase tracking-[0.08em] ${mutedClass}`}>Inventory behavior</p>
            <ToggleRow label="Track inventory" helper="Include this item in stock counts and low-stock workflows." checked={form.trackInventory} onChange={(value) => updateField("trackInventory", value)} />
            <ToggleRow label="Allow negative inventory" helper="Permit sales even when stock falls below zero." checked={form.allowNegativeInventory} onChange={(value) => updateField("allowNegativeInventory", value)} />
          </div>
        </FormSectionCard>

        <FormSectionCard title="Item Details" subtitle="Size, age restrictions, and NACS metadata." cardClass={cardClass} className="xl:col-span-6">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Unit of measure" value={form.unitOfMeasure} onChange={(value) => updateField("unitOfMeasure", value)} inputClass={inputClass} />
            <TextField label="Size" value={form.size} onChange={(value) => updateField("size", value)} inputClass={inputClass} />
            <TextField label="Minimum age" value={form.minimumAge} onChange={(value) => updateField("minimumAge", value)} error={fieldErrors.minimumAge} inputClass={inputClass} />
            <TextField label="NACS code" value={form.nacsCode} onChange={(value) => updateField("nacsCode", value)} inputClass={inputClass} />
            <TextField label="NACS category" value={form.nacsCategory} onChange={(value) => updateField("nacsCategory", value)} inputClass={inputClass} />
            <TextField label="NACS subcategory" value={form.nacsSubCategory} onChange={(value) => updateField("nacsSubCategory", value)} inputClass={inputClass} />
          </div>
        </FormSectionCard>

        <FormSectionCard title="Tax and Sales Controls" subtitle="Tax setup and register behavior for this item." cardClass={cardClass} className="xl:col-span-12">
          <div className="grid gap-6">
            <div>
              <p className={`mb-3 text-xs font-extrabold uppercase tracking-[0.08em] ${mutedClass}`}>Tax configuration</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <p className={`text-sm font-bold ${isDark ? "text-slate-300" : "text-slate-600"}`}>Tax inherited from department</p>
                  <div className={`mt-2 flex min-h-12 items-center rounded-[8px] border px-4 text-sm font-bold ${inputClass}`}>
                    {inheritedTax ? formatTaxReference(inheritedTax) : "Select a department with a default tax"}
                  </div>
                  {fieldErrors.taxId ? <p className="mt-2 text-xs font-bold text-red-500">{fieldErrors.taxId}</p> : null}
                </div>
                <SelectField label="Tax style" value={form.taxStyle} onChange={(value) => updateField("taxStyle", value as TaxStyle)} inputClass={inputClass} required options={[
                  ["post_discount", "Post discount"],
                  ["pre_discount", "Pre discount"],
                ]} />
              </div>
            </div>
            <div>
              <p className={`mb-3 text-xs font-extrabold uppercase tracking-[0.08em] ${mutedClass}`}>Sales controls</p>
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                <ToggleRow label="Allow EBT" helper="Eligible for EBT tender." checked={form.allowEbt} onChange={(value) => updateField("allowEbt", value)} compact />
                <ToggleRow label="Blue law" helper="Apply local sales restrictions." checked={form.blueLaw} onChange={(value) => updateField("blueLaw", value)} compact />
                <ToggleRow label="Kitchen print" helper="Send to kitchen printers." checked={form.kitchenPrint} onChange={(value) => updateField("kitchenPrint", value)} compact />
              </div>
            </div>
          </div>
        </FormSectionCard>
      </div>

      <ActionBar
        isDark={isDark}
        mutedClass={mutedClass}
        updatedAt={updatedAt}
        mode={mode}
        isSaving={isSaving}
        canSave={canSave}
        inputClass={inputClass}
        onReset={resetForm}
      />

      {cameraOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-labelledby="camera-title" onKeyDown={(event) => event.key === "Escape" && closeCamera()}>
          <div className={`w-full max-w-xl rounded-[8px] border p-6 shadow-2xl ${cardClass}`}>
            <div className="flex items-center justify-between gap-4">
              <h2 id="camera-title" className="text-lg font-extrabold">Scan barcode</h2>
              <button type="button" onClick={closeCamera} className={`grid size-9 place-items-center rounded-[8px] border ${inputClass}`} aria-label="Close camera">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <video ref={videoRef} className="mt-4 aspect-video w-full rounded-[8px] bg-black object-cover" muted playsInline />
            <p className={`mt-3 text-sm font-semibold ${cameraError ? "text-rose-500" : mutedClass}`}>
              {cameraError || (isScanning ? "Point the camera at a barcode." : "Preparing camera...")}
            </p>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function FormField({ label, error, required, helperText, children, className = "" }: { label: string; error?: string; required?: boolean; helperText?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="text-[13px] font-bold text-slate-500">{label}{required ? " (required)" : ""}</span>
      <span className="mt-2 block">{children}</span>
      {error ? (
        <span className="mt-2 block min-h-4 text-xs font-bold text-rose-500">{error}</span>
      ) : (
        <span className="mt-2 block min-h-4 text-xs font-semibold leading-5 text-slate-500">{helperText}</span>
      )}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  onKeyDown,
  error,
  inputClass,
  required,
  className,
  inputRef,
  readOnly,
  placeholder,
  disabled,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  error?: string;
  inputClass: string;
  required?: boolean;
  className?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  readOnly?: boolean;
  placeholder?: string;
  disabled?: boolean;
  helperText?: string;
}) {
  return (
    <FormField label={label} error={error} required={required} helperText={helperText} className={className}>
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        readOnly={readOnly}
        disabled={disabled}
        placeholder={placeholder}
        className={`h-11 w-full rounded-[8px] border px-3 text-sm font-semibold outline-none transition focus:ring-4 focus:ring-[#7c5cff]/25 ${inputClass}`}
      />
    </FormField>
  );
}

function SelectField({ label, value, onChange, options, placeholder, error, inputClass, required }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]>; placeholder?: string; error?: string; inputClass: string; required?: boolean }) {
  return (
    <FormField label={label} error={error} required={required}>
      <FormSelect value={value} onChange={(event) => onChange(event.target.value)} selectClassName={`font-semibold focus:ring-[#7c5cff]/25 ${inputClass}`}>
        <option value="">{placeholder ?? "Select"}</option>
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>{labelText}</option>
        ))}
      </FormSelect>
    </FormField>
  );
}

function ToggleRow({ label, helper, checked, onChange, compact = false, className = "" }: { label: string; helper: string; checked: boolean; onChange: (checked: boolean) => void; compact?: boolean; className?: string }) {
  return (
    <PayDeskSwitch
      label={label}
      helper={helper}
      checked={checked}
      onChange={onChange}
      compact={compact}
      className={`min-h-[72px] flex-row-reverse items-center justify-between rounded-[8px] border border-[#ded8f3] px-4 py-3 ${className}`}
    />
  );
}

function CheckboxRow({ label, helper, checked, onChange }: { label: string; helper: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="mt-3 flex w-fit items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-4 rounded border-[#ded8f3] accent-[#4f2df2]"
      />
      <span>
        <span className="block text-sm font-extrabold tracking-normal">{label}</span>
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{helper}</span>
      </span>
    </label>
  );
}

function FormSectionCard({ title, subtitle, cardClass, className = "", children }: { title: string; subtitle?: string; cardClass: string; className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-[8px] border p-6 ${cardClass} ${className}`}>
      <div>
        <h2 className="text-xl font-bold tracking-normal">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function MetricGrid({ values, className = "" }: { values: { discountPerUnit: number | null; rebatePerUnit: number | null; unitCost: number | null; adjustedUnitCost: number | null; margin: number | null }; className?: string }) {
  const metrics = [
    ["Discount / unit", formatCurrency(values.discountPerUnit)],
    ["Rebate / unit", formatCurrency(values.rebatePerUnit)],
    ["Unit cost", formatCurrency(values.unitCost)],
    ["Adjusted cost", formatCurrency(values.adjustedUnitCost)],
    ["Margin", formatPercent(values.margin)],
  ];

  return (
    <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 ${className}`}>
      {metrics.map(([label, value]) => (
        <div key={label} className="min-w-0 rounded-[8px] border border-[#ded8f3] p-4">
          <p className="text-xs font-bold text-slate-500">{label}</p>
          <p className="mt-2 truncate text-lg font-extrabold tracking-normal">{value}</p>
        </div>
      ))}
    </div>
  );
}

function InlineAlert({ tone, title, body, actionHref, actionLabel }: { tone: "info" | "success" | "warning" | "error"; title: string; body?: string; actionHref?: string; actionLabel?: string }) {
  const toneClass = {
    info: "border-[#ded8f3] bg-[#f0edff] text-[#4f2df2]",
    success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
    warning: "border-amber-500/25 bg-amber-500/10 text-amber-700",
    error: "border-rose-500/25 bg-rose-500/10 text-rose-600",
  }[tone];
  const Icon = tone === "success" ? CheckCircle2 : tone === "info" ? LoaderCircle : AlertCircle;

  return (
    <div className={`flex flex-col gap-3 rounded-[8px] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${toneClass}`}>
      <div className="flex min-w-0 gap-3">
        <Icon className={`mt-0.5 size-4 shrink-0 ${tone === "info" ? "animate-spin" : ""}`} aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-extrabold">{title}</p>
          {body ? <p className="mt-1 text-xs font-semibold leading-5 opacity-80">{body}</p> : null}
        </div>
      </div>
      {actionHref && actionLabel ? (
        <a href={actionHref} className="inline-flex h-9 shrink-0 items-center justify-center rounded-[7px] bg-white/80 px-3 text-xs font-extrabold text-slate-800 transition hover:bg-white">
          {actionLabel}
        </a>
      ) : null}
    </div>
  );
}

function PrimaryButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...props}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, inputClass, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; inputClass: string }) {
  return (
    <button
      {...props}
      className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/25 lg:w-auto ${inputClass}`}
    >
      {children}
    </button>
  );
}

function ActionBar({ isDark, mutedClass, updatedAt, mode, isSaving, canSave, inputClass, onReset }: { isDark: boolean; mutedClass: string; updatedAt: string | null; mode: FormMode; isSaving: boolean; canSave: boolean; inputClass: string; onReset: () => void }) {
  return (
    <div className={`sticky bottom-0 z-10 rounded-[8px] border p-4 backdrop-blur sm:flex sm:items-center sm:justify-between ${isDark ? "border-slate-400/15 bg-[#020617]/90" : "border-[#ded8f3] bg-[#f8fafc]/90"}`}>
      <p className={`text-xs font-semibold ${mutedClass}`}>
        {updatedAt ? `Last updated ${new Date(updatedAt).toLocaleString()}` : "Scan or enter a barcode before saving."}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:mt-0 sm:flex-row">
        <button type="button" onClick={onReset} disabled={isSaving} className={`inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Reset
        </button>
        <button type="submit" disabled={!canSave || isSaving} className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd] disabled:cursor-not-allowed disabled:opacity-60">
          {isSaving ? <PackageCheck className="size-4" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          {isSaving ? "Saving..." : mode === "edit" ? "Update Item" : "Save Item"}
        </button>
      </div>
    </div>
  );
}

function productToForm(product: ProductRecord): ItemFormState {
  return {
    barcode: product.barcode,
    name: product.name,
    saleType: product.saleType,
    departmentId: product.departmentId,
    productCategoryId: product.productCategoryId ?? "",
    priceGroupId: product.priceGroupId ?? "",
    isActive: product.isActive,
    unitRetail: stringValue(product.unitRetail),
    onlineRetailPrice: stringValue(product.onlineRetailPrice),
    unitsPerCase: stringValue(product.unitsPerCase),
    caseCost: stringValue(product.caseCost),
    caseDiscount: stringValue(product.caseDiscount),
    caseRebate: stringValue(product.caseRebate),
    defaultMargin: stringValue(product.defaultMargin),
    currentQuantity: stringValue(product.currentQuantity),
    trackInventory: product.trackInventory,
    allowNegativeInventory: product.allowNegativeInventory,
    minInventory: stringValue(product.minInventory),
    maxInventory: stringValue(product.maxInventory),
    unitOfMeasure: product.unitOfMeasure ?? "",
    size: product.size ?? "",
    minimumAge: stringValue(product.minimumAge),
    nacsCode: product.nacsCode ?? "",
    nacsCategory: product.nacsCategory ?? "",
    nacsSubCategory: product.nacsSubCategory ?? "",
    taxId: product.taxId,
    taxStyle: product.taxStyle,
    allowEbt: product.allowEbt,
    blueLaw: product.blueLaw,
    kitchenPrint: product.kitchenPrint,
  };
}

function productToRepeatTemplate(product: ProductRecord): RepeatTemplate {
  const form = productToForm(product);

  return {
    name: form.name,
    saleType: form.saleType,
    departmentId: form.departmentId,
    productCategoryId: form.productCategoryId,
    priceGroupId: form.priceGroupId,
    isActive: form.isActive,
    unitRetail: form.unitRetail,
    onlineRetailPrice: form.onlineRetailPrice,
    unitsPerCase: form.unitsPerCase,
    caseCost: form.caseCost,
    caseDiscount: form.caseDiscount,
    caseRebate: form.caseRebate,
    defaultMargin: form.defaultMargin,
    trackInventory: form.trackInventory,
    allowNegativeInventory: form.allowNegativeInventory,
    minInventory: form.minInventory,
    maxInventory: form.maxInventory,
    unitOfMeasure: form.unitOfMeasure,
    size: form.size,
    minimumAge: form.minimumAge,
    nacsCode: form.nacsCode,
    nacsCategory: form.nacsCategory,
    nacsSubCategory: form.nacsSubCategory,
    taxId: form.taxId,
    taxStyle: form.taxStyle,
    allowEbt: form.allowEbt,
    blueLaw: form.blueLaw,
    kitchenPrint: form.kitchenPrint,
  };
}

function sanitizeRepeatTemplate(
  template: RepeatTemplate,
  references: {
    departments: ProductReference[];
    categories: ProductReference[];
    priceGroups: ProductReference[];
    taxes: ProductReference[];
  },
): RepeatTemplate {
  return {
    ...template,
    departmentId: references.departments.some((item) => item.id === template.departmentId) ? template.departmentId : "",
    productCategoryId:
      template.productCategoryId && references.categories.some((item) => item.id === template.productCategoryId)
        ? template.productCategoryId
        : "",
    priceGroupId:
      template.priceGroupId && references.priceGroups.some((item) => item.id === template.priceGroupId)
        ? template.priceGroupId
        : "",
    taxId: references.taxes.some((item) => item.id === template.taxId) ? template.taxId : "",
  };
}

function departmentMinimumAgeToItemValue(value: ProductReference["minimumAge"]) {
  switch (value) {
    case "age_18":
    case "age_18_time_sensitive":
      return "18";
    case "age_21":
    case "age_21_time_sensitive":
      return "21";
    default:
      return null;
  }
}

function buildPayload(storeId: string, form: ItemFormState): ProductPayload {
  const validatedBarcode = validateBarcodeInput(form.barcode);

  return {
    storeId,
    barcode: validatedBarcode.ok ? validatedBarcode.barcode : form.barcode,
    name: form.name.trim(),
    saleType: form.saleType,
    unitsPerCase: parseIntStrict(form.unitsPerCase),
    caseCost: parseNumber(form.caseCost),
    caseDiscount: parseNumber(form.caseDiscount) ?? 0,
    caseRebate: parseNumber(form.caseRebate) ?? 0,
    unitRetail: parseNumber(form.unitRetail) ?? 0,
    onlineRetailPrice: parseNumber(form.onlineRetailPrice),
    unitOfMeasure: emptyToNull(form.unitOfMeasure),
    size: emptyToNull(form.size),
    defaultMargin: parseNumber(form.defaultMargin),
    maxInventory: parseIntStrict(form.maxInventory),
    minInventory: parseIntStrict(form.minInventory),
    minimumAge: parseIntStrict(form.minimumAge),
    nacsCode: emptyToNull(form.nacsCode),
    nacsCategory: emptyToNull(form.nacsCategory),
    nacsSubCategory: emptyToNull(form.nacsSubCategory),
    blueLaw: form.blueLaw,
    kitchenPrint: form.kitchenPrint,
    allowEbt: form.allowEbt,
    trackInventory: form.trackInventory,
    allowNegativeInventory: form.allowNegativeInventory,
    taxStyle: form.taxStyle,
    isActive: form.isActive,
    departmentId: form.departmentId,
    priceGroupId: emptyToNull(form.priceGroupId),
    productCategoryId: emptyToNull(form.productCategoryId),
  };
}

function validateForm(form: ItemFormState, hasDepartments: boolean) {
  const errors: FieldErrors = {};
  const barcode = validateBarcodeInput(form.barcode);
  if (!barcode.ok) errors.barcode = barcode.message;
  if (!form.name.trim()) errors.name = "Description is required.";
  if (!hasDepartments || !form.departmentId) errors.departmentId = "Select a department.";
  requireMoney(form.unitRetail, "unitRetail", "Unit retail", errors);
  requirePositiveInt(form.unitsPerCase, "unitsPerCase", "Units per case", errors);
  optionalMoney(form.onlineRetailPrice, "onlineRetailPrice", "Online retail", errors);
  optionalMoney(form.caseCost, "caseCost", "Case cost", errors);
  optionalMoney(form.caseDiscount, "caseDiscount", "Case discount", errors);
  optionalMoney(form.caseRebate, "caseRebate", "Case rebate", errors);
  optionalInt(form.minInventory, "minInventory", "Minimum inventory", errors);
  optionalInt(form.maxInventory, "maxInventory", "Maximum inventory", errors);
  optionalInt(form.minimumAge, "minimumAge", "Minimum age", errors);

  const min = parseIntStrict(form.minInventory);
  const max = parseIntStrict(form.maxInventory);
  if (min !== null && max !== null && max < min) errors.maxInventory = "Maximum inventory cannot be less than minimum.";

  return { ok: Object.keys(errors).length === 0, errors };
}

function formatTaxReference(tax: ProductReference) {
  const rate = tax.rate === undefined ? "" : `${formatTaxPercent(Number(tax.rate) * 100)}`;
  const surcharge = Number(tax.surchargeAmount ?? 0);
  const formula = surcharge > 0 ? `${rate} + $${surcharge.toFixed(2)}` : rate;

  return formula ? `${tax.name} - ${formula}` : tax.name;
}

function formatTaxPercent(value: number) {
  return `${value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}%`;
}

function requireMoney(value: string, field: keyof ItemFormState, label: string, errors: FieldErrors) {
  if (parseNumber(value) === null) errors[field] = `${label} is required.`;
}

function optionalMoney(value: string, field: keyof ItemFormState, label: string, errors: FieldErrors) {
  if (value.trim() && parseNumber(value) === null) errors[field] = `${label} must be a non-negative number.`;
}

function requirePositiveInt(value: string, field: keyof ItemFormState, label: string, errors: FieldErrors) {
  const parsed = parseIntStrict(value);
  if (parsed === null || parsed <= 0) errors[field] = `${label} must be greater than zero.`;
}

function optionalInt(value: string, field: keyof ItemFormState, label: string, errors: FieldErrors) {
  if (value.trim() && parseIntStrict(value) === null) errors[field] = `${label} must be an integer.`;
}

function parseNumber(value: string) {
  const text = value.trim();
  if (!text) return null;
  if (!/^\d+(\.\d{1,4})?$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIntStrict(value: string) {
  const text = value.trim();
  if (!text) return null;
  if (!/^\d+$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function emptyToNull(value: string) {
  return value.trim() || null;
}

function stringValue(value: number | string | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function sortRefs(items: ProductReference[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function formatCurrency(value: number | null) {
  return value === null ? "—" : `$${value.toFixed(2)}`;
}

function formatPercent(value: number | null) {
  return value === null ? "—" : `${value.toFixed(2)}%`;
}
