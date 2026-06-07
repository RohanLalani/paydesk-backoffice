export type AuthRole = "owner" | "partner" | "manager";

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

export type LoginResponse = {
  token?: string;
  accessToken?: string;
  jwt?: string;
  account?: Partial<AuthAccount>;
  user?: Partial<AuthAccount>;
  permissions?: string[];
};
