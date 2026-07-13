export type SubscriptionPlan = "plus" | "advanced";
export type CheckoutPlan = "PLUS" | "ADVANCED";
export type BillingCycle = "monthly" | "annual";
export type SubscriptionStatus = "trial" | "active" | "inactive" | "cancelled";

export type SubscriptionAddon = {
  id: string;
  subscriptionId: string;
  code: string;
  name: string;
  monthlyAmount: number;
  quantity: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type BillingSubscription = {
  id: string;
  ownerId?: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  activeStoreCount: number;
  pricePerStore: number;
  totalMonthlyAmount: number;
  totalAnnualAmount: number;
  addons: SubscriptionAddon[];
  trialEndsAt?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateStoreCheckoutSessionInput = {
  storeId: string;
  plan: CheckoutPlan;
};

export type StoreCheckoutSession = {
  checkoutUrl: string;
  checkoutSessionId: string;
};
