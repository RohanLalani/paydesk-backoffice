"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  PackagePlus,
  RefreshCw,
  Store,
} from "lucide-react";
import { BackOfficeShell } from "@/src/components/layout/BackOfficeShell";
import {
  getBillingSubscription,
  updateBillingPlan,
} from "@/src/features/billing/api";
import type {
  BillingSubscription,
  SubscriptionPlan,
} from "@/src/features/billing/types";
import type { PayDeskTheme } from "@/src/lib/theme";

const PLAN_DETAILS = {
  plus: {
    name: "Plus",
    price: 50,
    description: "Good for standard single-store POS and backoffice usage.",
  },
  advanced: {
    name: "Advanced",
    price: 80,
    description: "For stores needing advanced features and add-ons later.",
  },
} satisfies Record<
  SubscriptionPlan,
  { name: string; price: number; description: string }
>;

const billingStyles = {
  light: {
    page: "text-slate-950",
    panel: "border-[#d8d2ee] bg-white",
    muted: "text-slate-600",
    subtle: "border-[#e2e8f0] bg-[#f8fafc]",
    selected: "border-[#4f2df2] bg-[#f0edff]",
    unselected: "border-[#e2e8f0] bg-white",
    control:
      "border-[#d8d2ee] bg-white text-slate-700 hover:border-[#7c5cff]/60 hover:text-[#4f2df2]",
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  dark: {
    page: "text-[#f4f1ff]",
    panel: "border-indigo-200/10 bg-[#0b1026]/88",
    muted: "text-slate-300",
    subtle: "border-indigo-200/10 bg-[#071126]",
    selected: "border-[#7c5cff] bg-[#4f2df2]/20",
    unselected: "border-indigo-200/10 bg-[#0b1026]",
    control:
      "border-indigo-200/10 bg-[#0b1026] text-slate-300 hover:border-[#7c5cff]/60 hover:text-[#c8c1ff]",
    error: "border-red-400/20 bg-red-950/30 text-red-200",
    success: "border-emerald-400/20 bg-emerald-950/30 text-emerald-200",
  },
} satisfies Record<PayDeskTheme, Record<string, string>>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "We could not update billing right now. Please try again.";
}

function BillingMetric({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: PayDeskTheme;
}) {
  const styles = billingStyles[theme];

  return (
    <div className={`rounded-[8px] border p-4 ${styles.subtle}`}>
      <dt className={`text-xs font-bold uppercase tracking-[0.08em] ${styles.muted}`}>
        {label}
      </dt>
      <dd className="mt-2 text-2xl font-extrabold tracking-normal">{value}</dd>
    </div>
  );
}

function PlanCard({
  plan,
  subscription,
  theme,
  isUpdating,
  onSelect,
}: {
  plan: SubscriptionPlan;
  subscription: BillingSubscription;
  theme: PayDeskTheme;
  isUpdating: boolean;
  onSelect: (plan: SubscriptionPlan) => void;
}) {
  const styles = billingStyles[theme];
  const details = PLAN_DETAILS[plan];
  const isCurrent = subscription.plan === plan;

  return (
    <section
      className={`rounded-[8px] border p-5 transition ${
        isCurrent ? styles.selected : styles.unselected
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold tracking-normal">{details.name}</h3>
          <p className={`mt-2 text-sm font-semibold leading-6 ${styles.muted}`}>
            {details.description}
          </p>
        </div>
        {isCurrent ? (
          <span className="inline-flex items-center gap-1 rounded-[6px] bg-emerald-500/15 px-2.5 py-1 text-xs font-extrabold text-emerald-500">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Current
          </span>
        ) : null}
      </div>

      <p className="mt-6 text-3xl font-extrabold tracking-normal">
        {formatCurrency(details.price)}
        <span className={`text-sm font-bold ${styles.muted}`}> / store / month</span>
      </p>

      <button
        type="button"
        onClick={() => onSelect(plan)}
        disabled={isCurrent || isUpdating}
        className={`mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[7px] px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35 disabled:cursor-not-allowed disabled:opacity-60 ${
          isCurrent
            ? styles.control
            : "bg-[#4f2df2] text-white shadow-[0_12px_24px_rgba(79,45,242,0.24)] hover:bg-[#4322dd]"
        }`}
      >
        {isUpdating ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {isCurrent ? "Current Plan" : `Switch to ${details.name}`}
      </button>
    </section>
  );
}

function BillingContent({
  accountRole,
  theme,
}: {
  accountRole?: string;
  theme: PayDeskTheme;
}) {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState("");
  const styles = useMemo(() => billingStyles[theme], [theme]);
  const isOwner = accountRole === "owner";

  const subscriptionQuery = useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: getBillingSubscription,
    enabled: isOwner,
  });

  const planMutation = useMutation({
    mutationFn: updateBillingPlan,
    onSuccess: async (subscription) => {
      setSuccessMessage(`Plan updated to ${PLAN_DETAILS[subscription.plan].name}.`);
      await queryClient.invalidateQueries({ queryKey: ["billing", "subscription"] });
    },
  });

  function handlePlanChange(plan: SubscriptionPlan) {
    setSuccessMessage("");
    planMutation.mutate(plan);
  }

  if (!isOwner) {
    return (
      <section className={`rounded-[8px] border p-6 ${styles.panel}`}>
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-1 size-5 text-[#4f2df2]" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-normal">Billing</h1>
            <p className={`mt-2 text-sm font-semibold leading-6 ${styles.muted}`}>
              Only owners can manage billing.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (subscriptionQuery.isLoading) {
    return (
      <section className={`rounded-[8px] border p-6 ${styles.panel}`}>
        <div className="flex items-center gap-3 text-sm font-bold">
          <Loader2 className="size-5 animate-spin text-[#4f2df2]" aria-hidden="true" />
          Loading subscription...
        </div>
      </section>
    );
  }

  if (subscriptionQuery.isError || !subscriptionQuery.data) {
    return (
      <section className={`rounded-[8px] border p-6 ${styles.panel}`}>
        <div className={`rounded-[8px] border p-4 text-sm font-semibold ${styles.error}`}>
          {getErrorMessage(subscriptionQuery.error)}
        </div>
        <button
          type="button"
          onClick={() => subscriptionQuery.refetch()}
          className={`mt-4 inline-flex h-10 items-center gap-2 rounded-[7px] border px-4 text-sm font-bold transition ${styles.control}`}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Retry
        </button>
      </section>
    );
  }

  const subscription = subscriptionQuery.data;
  const hasAddons = subscription.addons.length > 0;

  return (
    <div className={`space-y-5 ${styles.page}`}>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-[8px] bg-[#4f2df2] text-white">
              <CreditCard className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className={`text-xs font-extrabold uppercase tracking-[0.08em] ${styles.muted}`}>
                Subscription
              </p>
              <h1 className="text-3xl font-extrabold leading-tight tracking-normal">
                Billing
              </h1>
            </div>
          </div>
          <p className={`mt-4 max-w-[680px] text-sm font-semibold leading-6 ${styles.muted}`}>
            Manage the subscription plan used to calculate monthly and annual
            store billing.
          </p>
        </div>

        <div className={`rounded-[8px] border px-4 py-3 text-sm font-bold ${styles.subtle}`}>
          Status: <span className="capitalize text-[#4f2df2]">{subscription.status}</span>
        </div>
      </header>

      {successMessage ? (
        <div className={`flex items-center gap-2 rounded-[8px] border p-4 text-sm font-bold ${styles.success}`}>
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {successMessage}
        </div>
      ) : null}

      {planMutation.isError ? (
        <div className={`flex items-start gap-2 rounded-[8px] border p-4 text-sm font-semibold ${styles.error}`}>
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {getErrorMessage(planMutation.error)}
        </div>
      ) : null}

      <section className={`rounded-[8px] border p-5 ${styles.panel}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-normal">
              Current plan: {PLAN_DETAILS[subscription.plan].name}
            </h2>
            <p className={`mt-2 text-sm font-semibold leading-6 ${styles.muted}`}>
              Billing cycle is currently {subscription.billingCycle}.
            </p>
          </div>
          <Store className="size-6 text-[#4f2df2]" aria-hidden="true" />
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <BillingMetric
            label="Active stores"
            value={String(subscription.activeStoreCount)}
            theme={theme}
          />
          <BillingMetric
            label="Price per store"
            value={formatCurrency(subscription.pricePerStore)}
            theme={theme}
          />
          <BillingMetric
            label="Monthly estimate"
            value={formatCurrency(subscription.totalMonthlyAmount)}
            theme={theme}
          />
          <BillingMetric
            label="Annual estimate"
            value={formatCurrency(subscription.totalAnnualAmount)}
            theme={theme}
          />
        </dl>

        <dl className="mt-5 grid gap-3 text-sm font-semibold sm:grid-cols-3">
          <div className={`rounded-[8px] border p-4 ${styles.subtle}`}>
            <dt className={`text-xs font-bold uppercase tracking-[0.08em] ${styles.muted}`}>
              Trial ends
            </dt>
            <dd className="mt-2">{formatDate(subscription.trialEndsAt)}</dd>
          </div>
          <div className={`rounded-[8px] border p-4 ${styles.subtle}`}>
            <dt className={`text-xs font-bold uppercase tracking-[0.08em] ${styles.muted}`}>
              Period start
            </dt>
            <dd className="mt-2">{formatDate(subscription.currentPeriodStart)}</dd>
          </div>
          <div className={`rounded-[8px] border p-4 ${styles.subtle}`}>
            <dt className={`text-xs font-bold uppercase tracking-[0.08em] ${styles.muted}`}>
              Period end
            </dt>
            <dd className="mt-2">{formatDate(subscription.currentPeriodEnd)}</dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {(["plus", "advanced"] as const).map((plan) => (
          <PlanCard
            key={plan}
            plan={plan}
            subscription={subscription}
            theme={theme}
            isUpdating={planMutation.isPending && planMutation.variables === plan}
            onSelect={handlePlanChange}
          />
        ))}
      </section>

      <section className={`rounded-[8px] border p-5 ${styles.panel}`}>
        <div className="flex items-start gap-3">
          <PackagePlus className="mt-1 size-5 text-[#4f2df2]" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-extrabold tracking-normal">
              Additional services
            </h2>
            <p className={`mt-2 text-sm font-semibold leading-6 ${styles.muted}`}>
              Add-ons are read-only for now and will be managed here later.
            </p>
          </div>
        </div>

        {hasAddons ? (
          <div className="mt-5 grid gap-3">
            {subscription.addons.map((addon) => (
              <div
                key={addon.id}
                className={`flex flex-col gap-2 rounded-[8px] border p-4 sm:flex-row sm:items-center sm:justify-between ${styles.subtle}`}
              >
                <div>
                  <p className="font-bold">{addon.name}</p>
                  <p className={`mt-1 text-xs font-semibold ${styles.muted}`}>
                    {addon.code} - Quantity {addon.quantity}
                  </p>
                </div>
                <p className="text-sm font-extrabold">
                  {formatCurrency(addon.monthlyAmount * addon.quantity)} / month
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className={`mt-5 rounded-[8px] border p-4 text-sm font-semibold ${styles.subtle}`}>
            No additional services are active.
          </p>
        )}
      </section>
    </div>
  );
}

export default function BillingPage() {
  return (
    <BackOfficeShell activeItem="billing">
      {({ account, theme }) => (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <BillingContent accountRole={account?.role} theme={theme} />
        </motion.div>
      )}
    </BackOfficeShell>
  );
}
