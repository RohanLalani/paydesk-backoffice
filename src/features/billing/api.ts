import { z } from "zod";
import { apiClient } from "@/src/lib/apiClient";
import type {
  BillingSubscription,
  CheckoutPlan,
  CreateStoreCheckoutSessionInput,
  StoreCheckoutSession,
  SubscriptionPlan,
} from "@/src/features/billing/types";

export const billingPlanSchema = z.enum(["plus", "advanced"]);
export const checkoutPlanSchema = z.enum(["PLUS", "ADVANCED"]);

export async function getBillingSubscription() {
  return apiClient<BillingSubscription>("/billing/subscription", {
    method: "GET",
  });
}

export async function updateBillingPlan(plan: SubscriptionPlan) {
  const validatedPlan = billingPlanSchema.parse(plan);

  return apiClient<BillingSubscription>("/billing/subscription/plan", {
    method: "PATCH",
    body: { plan: validatedPlan },
  });
}

export async function createStoreCheckoutSession(
  input: CreateStoreCheckoutSessionInput,
) {
  const validatedPlan: CheckoutPlan = checkoutPlanSchema.parse(input.plan);

  return apiClient<StoreCheckoutSession>("/billing/checkout-session", {
    method: "POST",
    body: {
      storeId: input.storeId,
      plan: validatedPlan,
    },
  });
}
