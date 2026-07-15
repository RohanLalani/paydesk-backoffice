import { apiClient } from "@/src/lib/apiClient";
import type {
  CreateStoreInput,
  CreateStoreResponse,
  Store,
  StoreApiItem,
  StoreApiResponse,
  StoreFeaturesResponse,
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

export async function getStoreFeatures(storeId: string) {
  return apiClient<StoreFeaturesResponse>(`/store/${storeId}/features`, {
    method: "GET",
  });
}

export async function updateStoreFeatures(
  storeId: string,
  input: { lottery?: boolean; recipeSuite?: boolean },
) {
  return apiClient<StoreFeaturesResponse>(`/store/${storeId}/features`, {
    method: "PATCH",
    body: input,
  });
}

export async function updateStore(
  storeId: string,
  input: { name?: string; address?: string | null; businessType?: Store["businessType"] },
) {
  return apiClient<Store>(`/store/${storeId}`, {
    method: "PATCH",
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
