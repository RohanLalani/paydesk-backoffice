import { apiClient } from "@/src/lib/apiClient";
import type {
  CreateStoreInput,
  CreateStoreResponse,
  Store,
  StoreApiItem,
  StoreApiResponse,
} from "@/src/features/stores/types";
import { isStoreBusinessType } from "@/src/features/stores/businessTypes";

export async function getMyStores() {
  return apiClient<StoreApiResponse>("/store/my-stores", {
    method: "GET",
  });
}

export const fetchMyStores = getMyStores;

export async function createStore(input: CreateStoreInput) {
  return apiClient<CreateStoreResponse>("/store/create", {
    method: "POST",
    body: input,
  });
}

function normalizeStore(store: StoreApiItem, index: number): Store {
  const id = store.id ?? store._id ?? `store-${index}`;
  const name = store.name ?? store.businessName ?? "Unnamed Store";
  const address = store.address ?? store.fullAddress ?? store.location;
  const businessType =
    typeof store.businessType === "string" &&
    isStoreBusinessType(store.businessType)
      ? store.businessType
      : "other";

  return {
    ...store,
    id,
    name,
    address,
    businessType,
  };
}

export function normalizeStoreResponse(response: StoreApiResponse): Store[] {
  const stores = Array.isArray(response)
    ? response
    : response.data ?? response.stores ?? response.items ?? [];

  return stores.map(normalizeStore);
}
