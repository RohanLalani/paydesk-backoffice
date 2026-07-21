export type StoreStatus = "active" | "inactive" | "maintenance" | "disabled";
export type StoreBusinessType =
  | "convenience_store"
  | "grocery_store"
  | "supermarket"
  | "liquor_store"
  | "smoke_shop"
  | "vape_shop"
  | "gas_station"
  | "pharmacy"
  | "clothing_store"
  | "shoe_store"
  | "jewelry_store"
  | "gift_shop"
  | "electronics_store"
  | "phone_store"
  | "computer_store"
  | "hardware_store"
  | "home_improvement_store"
  | "furniture_store"
  | "auto_parts"
  | "beauty_store"
  | "pet_store"
  | "bookstore"
  | "toy_store"
  | "flower_shop"
  | "wholesale"
  | "other";

export type StoreStaffMember = {
  id?: string;
  name?: string;
  initials?: string;
  avatarUrl?: string;
  [key: string]: unknown;
};

export type StoreCapabilityStatus = {
  enabled: boolean;
  available: boolean;
  source?: "setup" | "manual" | "subscription" | "system";
  billingStatus?: string;
};

export type StoreCapabilities = {
  lottery: StoreCapabilityStatus;
  recipeSuite: StoreCapabilityStatus;
  loyalty: StoreCapabilityStatus;
  orders: StoreCapabilityStatus;
};

export type Store = {
  id: string;
  name: string;
  address?: string;
  isActive?: boolean;
  status?: string;
  basePlan?: string | null;
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
  type?: string;
  businessType: StoreBusinessType;
  createdAt?: string;
  staff?: StoreStaffMember[];
  users?: StoreStaffMember[];
  employees?: StoreStaffMember[];
  assignedUsers?: StoreStaffMember[];
  capabilities?: StoreCapabilities;
  [key: string]: unknown;
};

export type StoreApiItem = Partial<Store> & {
  _id?: string;
  businessName?: string;
  location?: string;
  fullAddress?: string;
};

export type CreateStoreInput = {
  name: string;
  address?: string | null;
  businessType: StoreBusinessType;
  lotteryEnabled?: boolean;
  recipeSuiteEnabled?: boolean;
};

export type StoreFeaturesResponse = {
  storeId: string;
  features: StoreCapabilities;
};

export type CreateStoreResponse =
  | StoreApiItem
  | {
      data?: StoreApiItem;
      store?: StoreApiItem;
    };

export type StoreApiResponse =
  | StoreApiItem[]
  | {
      data?: StoreApiItem[];
      stores?: StoreApiItem[];
      items?: StoreApiItem[];
    };
