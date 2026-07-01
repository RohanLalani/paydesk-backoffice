import { apiClient } from "@/src/lib/apiClient";
import type {
  AuthAccount,
  AuthRole,
  AuthVerificationType,
  LoginRequest,
  LoginResponse,
  OwnerSignupRequest,
  OwnerSignupResponse,
  VerifyEmailResponse,
} from "@/src/features/auth/types";

const ROLE_ENDPOINTS: Record<AuthRole, string> = {
  owner: "/auth/login/owner",
  partner: "/auth/login/partner",
  manager: "/auth/login/manager",
};

export const OWNER_SIGNUP_ENDPOINT = "/auth/register/owner";

export function isAuthVerificationType(value: string | null): value is AuthVerificationType {
  return value === "owner" || value === "partner" || value === "manager" || value === "employee";
}

export function getLoginToken(response: LoginResponse) {
  return response.token ?? response.accessToken ?? response.jwt ?? null;
}

export function getLoginAccount(response: LoginResponse, role: AuthRole): AuthAccount {
  const account = response.account ?? response.user ?? response.owner ?? {};

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

export async function signupOwner(input: OwnerSignupRequest) {
  return apiClient<OwnerSignupResponse>(OWNER_SIGNUP_ENDPOINT, {
    method: "POST",
    body: input,
  });
}

export async function verifyEmail(type: AuthVerificationType, token: string) {
  return apiClient<VerifyEmailResponse>(`/auth/verify-email/${type}`, {
    method: "POST",
    body: { token },
  });
}
