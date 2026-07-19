import { apiClient } from "@/src/lib/apiClient";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "activate"
  | "deactivate"
  | "grant"
  | "revoke"
  | "login"
  | "logout"
  | "system";

export type AuditEntityType =
  | "store"
  | "store_feature"
  | "product"
  | "department"
  | "price_group"
  | "product_category"
  | "tax"
  | "inventory"
  | "staff_permission"
  | "register"
  | "register_device"
  | "register_activation_code"
  | "customer"
  | "transaction"
  | "cart"
  | "billing"
  | "auth";

export type AuditEventListItem = {
  id: string;
  storeId: string;
  actorId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  entityName: string | null;
  summary: string;
  createdAt: string;
  actor: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  } | null;
};

export type AuditEventDetail = AuditEventListItem & {
  before: unknown;
  after: unknown;
  changes: unknown;
  metadata: unknown;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};

export type AuditEventsResponse = {
  items: AuditEventListItem[];
  total: number;
  page: number;
  limit: number;
};

export type AuditEventsQuery = {
  page?: number;
  limit?: number;
  action?: AuditAction | "";
  entityType?: AuditEntityType | "";
  search?: string;
};

export type ProductLogChangeType =
  | "Created"
  | "Updated"
  | "Activated"
  | "Deactivated"
  | "Price Change"
  | "Cost Change"
  | "Price and Cost Change"
  | "Classification Change"
  | "Multipack Change"
  | "Multiple Changes"
  | "Other";

export type ProductLogSource =
  | "Product Editor"
  | "Purchase"
  | "Price Book"
  | "Multipack Review"
  | "Import"
  | "API"
  | "System";

export type ProductLogSortField =
  | "timestamp"
  | "productNumber"
  | "productDescription"
  | "changeType"
  | "changedBy";

export type ProductLogTimeRange = "today" | "yesterday" | "7d" | "30d" | "custom" | "all";

export type ProductLogRow = {
  id: string;
  auditEventId: string;
  storeId: string;
  productId: string | null;
  timestamp: string;
  productNumber: number | null;
  barcode: string | null;
  productDescription: string | null;
  departmentId: string | null;
  categoryId: string | null;
  priceGroupId: string | null;
  changeType: ProductLogChangeType | string;
  changesSummary: string;
  changedFields: Array<{
    field: string;
    fieldLabel: string;
    previousValue: unknown;
    newValue: unknown;
  }>;
  changedBy: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  } | null;
  source: ProductLogSource | string;
  reference: string | null;
  referenceType: string | null;
  referenceId: string | null;
  details: {
    summary: string;
    action: AuditAction;
    entityType: AuditEntityType;
    metadata: unknown;
  };
};

export type ProductLogsResponse = {
  items: ProductLogRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ProductLogsQuery = {
  page?: number;
  limit?: 25 | 50 | 100 | 250;
  search?: string;
  timeRange?: ProductLogTimeRange;
  from?: string;
  to?: string;
  changeType?: string;
  field?: string;
  actorId?: string;
  changedBy?: string;
  source?: string;
  departmentId?: string;
  categoryId?: string;
  priceGroupId?: string;
  sort?: ProductLogSortField;
  order?: "asc" | "desc";
};

export const auditActions: AuditAction[] = [
  "create",
  "update",
  "delete",
  "activate",
  "deactivate",
  "grant",
  "revoke",
  "login",
  "logout",
  "system",
];

export const auditEntityTypes: AuditEntityType[] = [
  "store",
  "store_feature",
  "product",
  "department",
  "price_group",
  "product_category",
  "tax",
  "inventory",
  "staff_permission",
  "register",
  "register_device",
  "register_activation_code",
  "customer",
  "transaction",
  "cart",
  "billing",
  "auth",
];

export function formatAuditLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function listAuditEvents(storeId: string, query: AuditEventsQuery = {}) {
  const params = new URLSearchParams();

  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.action) params.set("action", query.action);
  if (query.entityType) params.set("entityType", query.entityType);
  if (query.search?.trim()) params.set("search", query.search.trim());

  const suffix = params.toString() ? `?${params.toString()}` : "";

  return apiClient<AuditEventsResponse>(`/stores/${storeId}/audit-events${suffix}`);
}

export function getAuditEvent(storeId: string, eventId: string) {
  return apiClient<AuditEventDetail>(`/stores/${storeId}/audit-events/${eventId}`);
}

export const productLogChangeTypes: ProductLogChangeType[] = [
  "Created",
  "Updated",
  "Activated",
  "Deactivated",
  "Price Change",
  "Cost Change",
  "Price and Cost Change",
  "Classification Change",
  "Multipack Change",
  "Multiple Changes",
  "Other",
];

export const productLogSources: ProductLogSource[] = [
  "Product Editor",
  "Purchase",
  "Price Book",
  "Multipack Review",
  "Import",
  "API",
  "System",
];

export function listProductLogs(storeId: string, query: ProductLogsQuery = {}) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 25),
    sort: query.sort ?? "timestamp",
    order: query.order ?? "desc",
  });

  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.timeRange && query.timeRange !== "custom") params.set("timeRange", query.timeRange);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.changeType) params.set("changeType", query.changeType);
  if (query.field) params.set("field", query.field);
  if (query.actorId) params.set("actorId", query.actorId);
  if (query.changedBy?.trim()) params.set("changedBy", query.changedBy.trim());
  if (query.source) params.set("source", query.source);
  if (query.departmentId) params.set("departmentId", query.departmentId);
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.priceGroupId) params.set("priceGroupId", query.priceGroupId);

  return apiClient<ProductLogsResponse>(`/stores/${storeId}/audit-events/product-logs?${params.toString()}`);
}
