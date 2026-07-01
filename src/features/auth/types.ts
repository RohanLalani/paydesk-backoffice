export type AuthRole = "owner" | "partner" | "manager";
export type AuthVerificationType = AuthRole | "employee";

export type AuthAccount = {
  id?: string;
  email?: string;
  name?: string;
  role: AuthRole;
  permissions?: string[];
  [key: string]: unknown;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type OwnerSignupRequest = {
  name: string;
  email: string;
  password: string;
};

export type LoginResponse = {
  token?: string;
  accessToken?: string;
  jwt?: string;
  account?: Partial<AuthAccount>;
  user?: Partial<AuthAccount>;
  owner?: Partial<AuthAccount>;
  permissions?: string[];
};

export type OwnerSignupResponse = {
  message?: string;
  account?: Partial<AuthAccount>;
};

export type VerifyEmailRequest = {
  token: string;
  type: AuthVerificationType;
};

export type VerifyEmailResponse = {
  message?: string;
  account?: Partial<AuthAccount>;
};
