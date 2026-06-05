import type { AuthAccount } from "@/src/features/auth/types";

const TOKEN_KEY = "paydesk-auth-token";
const ACCOUNT_KEY = "paydesk-auth-account";
const REMEMBER_KEY = "paydesk-auth-remember";

function getStorage(remember?: boolean): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (typeof remember === "boolean") {
    return remember ? window.localStorage : window.sessionStorage;
  }

  return window.localStorage.getItem(REMEMBER_KEY) === "true"
    ? window.localStorage
    : window.sessionStorage;
}

function clearStorage(storage: Storage) {
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(ACCOUNT_KEY);
}

export function saveAuth(token: string, account: AuthAccount, remember: boolean) {
  const storage = getStorage(remember);

  if (!storage) {
    return;
  }

  clearAuth();
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  window.localStorage.setItem(REMEMBER_KEY, String(remember));
}

export function getToken() {
  const storage = getStorage();
  return storage?.getItem(TOKEN_KEY) ?? null;
}

export function getAccount(): AuthAccount | null {
  const storage = getStorage();
  const value = storage?.getItem(ACCOUNT_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthAccount;
  } catch {
    clearAuth();
    return null;
  }
}

export function clearAuth() {
  if (typeof window === "undefined") {
    return;
  }

  clearStorage(window.localStorage);
  clearStorage(window.sessionStorage);
  window.localStorage.removeItem(REMEMBER_KEY);
}
