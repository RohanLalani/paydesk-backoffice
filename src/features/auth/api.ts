import { apiClient } from "@/src/lib/apiClient";
import type {
  AuthAccount,
  AuthRole,
  LoginRequest,
  LoginResponse,
} from "@/src/features/auth/types";

const ROLE_ENDPOINTS: Record<AuthRole, string> = {
  owner: "/auth/login/owner",
  partner: "/auth/login/partner",
  manager: "/auth/login/manager",
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

export async function login(role: AuthRole, credentials: LoginRequest) {
  return apiClient<LoginResponse>(ROLE_ENDPOINTS[role], {
    method: "POST",
    body: credentials,
  });
}
