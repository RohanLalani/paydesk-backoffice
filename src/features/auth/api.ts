import { apiClient } from "@/src/lib/apiClient";
import type {
  AuthAccount,
  AuthRole,
  LoginRequest,
  LoginResponse,
  PermissionResponse,
  StoreSummary,
} from "@/src/features/auth/types";

const ROLE_ENDPOINTS: Record<AuthRole, string> = {
  owner: "/auth/login/owner",
  partner: "/auth/login/partner",
  manager: "/auth/login/manager",
};

export const PERMISSION_ROUTE_MAP: Record<string, string> = {
  view_reports: "/reports",
  manage_products: "/products",
  manage_inventory: "/inventory",
  manage_customers: "/customers",
  manage_employees: "/employees",
  view_store: "/dashboard",
};

export function getLoginToken(response: LoginResponse) {
  return response.token ?? response.accessToken ?? response.jwt ?? null;
}

export function getLoginAccount(response: LoginResponse, role: AuthRole): AuthAccount {
  const account = response.account ?? response.user ?? {};

  return {
    ...account,
    role,
    permissions: response.permissions ?? account.permissions ?? [],
  };
}

export function getFirstAllowedRoute(role: AuthRole, permissions: string[] = []) {
  if (role !== "manager") {
    return "/dashboard";
  }

  for (const permission of Object.keys(PERMISSION_ROUTE_MAP)) {
    if (permissions.includes(permission)) {
      return PERMISSION_ROUTE_MAP[permission];
    }
  }

  return "/dashboard";
}

export async function login(role: AuthRole, credentials: LoginRequest) {
  return apiClient<LoginResponse>(ROLE_ENDPOINTS[role], {
    method: "POST",
    body: credentials,
  });
}

export async function fetchAccessibleStores() {
  return apiClient<StoreSummary[] | { data?: StoreSummary[] }>("/stores", {
    method: "GET",
  });
}

export async function fetchPermissions(storeId?: string) {
  const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";

  return apiClient<PermissionResponse | string[]>(`/permissions${query}`, {
    method: "GET",
  });
}

export function normalizeStores(response: StoreSummary[] | { data?: StoreSummary[] }) {
  return Array.isArray(response) ? response : response.data ?? [];
}

export function normalizePermissions(response: PermissionResponse | string[]) {
  if (Array.isArray(response)) {
    return response;
  }

  return response.permissions ?? response.data?.permissions ?? [];
}
