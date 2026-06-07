"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Store } from "@/src/features/stores/types";

const SELECTED_STORE_KEY = "paydesk-selected-store";

type StoreContextValue = {
  selectedStore: Store | null;
  setSelectedStore: (store: Store) => void;
  clearSelectedStore: () => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function getSelectedStore() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(SELECTED_STORE_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Store;
  } catch {
    window.localStorage.removeItem(SELECTED_STORE_KEY);
    return null;
  }
}

export function saveSelectedStore(store: Store) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SELECTED_STORE_KEY, JSON.stringify(store));
}

export function clearSelectedStoreStorage() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SELECTED_STORE_KEY);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [selectedStore, setSelectedStoreState] = useState<Store | null>(() =>
    getSelectedStore(),
  );

  const setSelectedStore = useCallback((store: Store) => {
    saveSelectedStore(store);
    setSelectedStoreState(store);
  }, []);

  const clearSelectedStore = useCallback(() => {
    clearSelectedStoreStorage();
    setSelectedStoreState(null);
  }, []);

  const value = useMemo(
    () => ({
      selectedStore,
      setSelectedStore,
      clearSelectedStore,
    }),
    [clearSelectedStore, selectedStore, setSelectedStore],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);

  if (!value) {
    throw new Error("useStore must be used inside StoreProvider.");
  }

  return value;
}
