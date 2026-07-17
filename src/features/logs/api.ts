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
