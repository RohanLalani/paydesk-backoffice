import { z } from "zod";
import { apiClient } from "@/src/lib/apiClient";
import type { BillingSubscription, SubscriptionPlan } from "@/src/features/billing/types";

export const billingPlanSchema = z.enum(["plus", "advanced"]);

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
