"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BackOfficeShell, type BackOfficeShellContext } from "@/src/components/layout/BackOfficeShell";
import { VendorOrdersWorkspace } from "@/src/components/inventory/VendorOrdersWorkspace";

function OrdersUnavailableMessage({
  theme,
  title,
  message,
}: {
  theme: BackOfficeShellContext["theme"];
  title: string;
  message: string;
}) {
  const isDark = theme === "dark";

  return (
    <section className={`rounded-[8px] border p-6 ${isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white"}`}>
      <h1 className="text-2xl font-bold tracking-normal">{title}</h1>
      <p className={`mt-2 max-w-[720px] text-sm font-semibold leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        {message}
      </p>
    </section>
  );
}

function ProductOrdersContent(context: BackOfficeShellContext) {
  const { capabilities, capabilitiesLoading, theme } = context;
  const router = useRouter();

  useEffect(() => {
    if (capabilitiesLoading || capabilities.orders.available) {
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      router.replace("/inventory/overview");
    }, 1200);

    return () => window.clearTimeout(redirectTimer);
  }, [capabilities.orders.available, capabilitiesLoading, router]);

  if (capabilitiesLoading) {
    return (
      <OrdersUnavailableMessage
        theme={theme}
        title="Checking subscription"
        message="Checking whether Orders is available for this store."
      />
    );
  }

  if (!capabilities.orders.available) {
    return (
      <OrdersUnavailableMessage
        theme={theme}
        title="Orders unavailable"
        message="Orders is available with the Advanced plan. Redirecting to Inventory Overview."
      />
    );
  }

  return <VendorOrdersWorkspace {...context} />;
}

export default function ProductOrdersPage() {
  return (
    <BackOfficeShell activeItem="inventory" requiredPermission="manage_products">
      {(context) => <ProductOrdersContent {...context} />}
    </BackOfficeShell>
  );
}
