import { useEffect, useMemo, useState } from "react";
import { getStoreFeatures } from "@/src/features/stores/api";
import type { Store, StoreCapabilities } from "@/src/features/stores/types";

export const emptyStoreCapabilities: StoreCapabilities = {
  lottery: { enabled: false, available: false, source: "setup" },
  recipeSuite: { enabled: false, available: false, source: "setup" },
  loyalty: {
    enabled: false,
    available: false,
    source: "subscription",
    billingStatus: "not_added",
  },
  orders: {
    enabled: false,
    available: false,
    source: "subscription",
    billingStatus: "not_added",
  },
};

export const STORE_CAPABILITIES_UPDATED_EVENT = "paydesk-store-capabilities-updated";

export function normalizeCapabilities(store?: Store | null): StoreCapabilities {
  return {
    lottery: store?.capabilities?.lottery ?? emptyStoreCapabilities.lottery,
    recipeSuite: store?.capabilities?.recipeSuite ?? emptyStoreCapabilities.recipeSuite,
    loyalty: store?.capabilities?.loyalty ?? emptyStoreCapabilities.loyalty,
    orders: store?.capabilities?.orders ?? emptyStoreCapabilities.orders,
  };
}

export function useStoreCapabilities(store?: Store | null) {
  const [capabilities, setCapabilities] = useState<StoreCapabilities>(() =>
    normalizeCapabilities(store),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      setCapabilities(normalizeCapabilities(store));
    });

    if (!store?.id) {
      return;
    }

    let isMounted = true;
    const load = () => {
      queueMicrotask(() => {
        setIsLoading(true);
        setError("");
      });

      getStoreFeatures(store.id)
      .then((response) => {
        if (isMounted) {
          setCapabilities({
            ...emptyStoreCapabilities,
            ...response.features,
          });
        }
      })
      .catch((fetchError) => {
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : "Could not load store capabilities.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    };

    load();
    window.addEventListener(STORE_CAPABILITIES_UPDATED_EVENT, load);

    return () => {
      isMounted = false;
      window.removeEventListener(STORE_CAPABILITIES_UPDATED_EVENT, load);
    };
  }, [store]);

  return useMemo(
    () => ({
      capabilities,
      isLoading,
      error,
      lotteryEnabled: capabilities.lottery.available,
      recipeSuiteEnabled: capabilities.recipeSuite.available,
      loyaltyEnabled: capabilities.loyalty.available,
      ordersEnabled: capabilities.orders.available,
    }),
    [capabilities, error, isLoading],
  );
}
