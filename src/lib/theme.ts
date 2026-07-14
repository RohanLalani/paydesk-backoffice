export type PayDeskTheme = "light" | "dark";

export const PAYDESK_THEME_KEY = "paydesk-theme";

export function isPayDeskTheme(value: string | null): value is PayDeskTheme {
  return value === "light" || value === "dark";
}

export function getStoredTheme(): PayDeskTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  const savedTheme = window.localStorage.getItem(PAYDESK_THEME_KEY);

  if (isPayDeskTheme(savedTheme)) {
    return savedTheme;
  }

  return "light";
}

export function applyDocumentTheme(theme: PayDeskTheme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
}

export function setStoredTheme(theme: PayDeskTheme) {
  window.localStorage.setItem(PAYDESK_THEME_KEY, theme);
  applyDocumentTheme(theme);
}
