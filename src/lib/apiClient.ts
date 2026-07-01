import { clearAuth, getToken } from "@/src/lib/authStorage";

type ApiClientOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
};

export class ApiClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  clearAuth();

  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
}

function getErrorMessage(value: unknown) {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const error = value as { message?: unknown; error?: unknown };

  if (typeof error.message === "string") {
    return error.message;
  }

  if (Array.isArray(error.message)) {
    return error.message.filter((message) => typeof message === "string").join(" ");
  }

  if (typeof error.error === "string") {
    return error.error;
  }

  return null;
}

export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();
  const hasJsonBody =
    options.body &&
    typeof options.body === "object" &&
    !(options.body instanceof FormData) &&
    !(options.body instanceof Blob) &&
    !(options.body instanceof URLSearchParams);

  if (hasJsonBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    const body: BodyInit | null | undefined = hasJsonBody
      ? JSON.stringify(options.body)
      : (options.body as BodyInit | null | undefined);

    response = await fetch(`${getBaseUrl()}${path}`, {
      ...options,
      headers,
      body,
    });
  } catch {
    throw new ApiClientError(
      "We could not reach PayDesk right now. Check your connection and try again.",
      0,
    );
  }

  const contentType = response.headers.get("content-type");
  const hasJson = contentType?.includes("application/json");
  const payload = hasJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (response.status === 401) {
      redirectToLogin();
    }

    throw new ApiClientError(
      getErrorMessage(payload) ?? "Sign in failed. Please check your details and try again.",
      response.status,
    );
  }

  return payload as T;
}
