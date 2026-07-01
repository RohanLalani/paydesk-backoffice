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

export async function fetchMyStores(options: { includeInactive?: boolean } = {}) {
  const query = options.includeInactive ? "?includeInactive=true" : "";

  return apiClient<StoreApiResponse>(`/store/my-stores${query}`, {
    method: "GET",
  });
}

export async function createStore(input: CreateStoreInput) {
  return apiClient<CreateStoreResponse>("/store/create", {
    method: "POST",
    body: input,
  });
}

export async function activateStore(storeId: string) {
  return apiClient<CreateStoreResponse>(`/store/${storeId}/activate`, {
    method: "PATCH",
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

export function normalizeCreateStoreResponse(response: CreateStoreResponse): Store {
  const store = "id" in response || "_id" in response
    ? response
    : response.data ?? response.store ?? {};

  return normalizeStore(store, 0);
}
