"use client";

import { useSearchParams } from "next/navigation";
import { NewPurchaseWorkspace } from "@/src/components/inventory/new-purchase/NewPurchaseWorkspace";

export function PurchaseDetailRoute() {
  const searchParams = useSearchParams();
  const purchaseId = searchParams.get("purchaseId") ?? undefined;

  return <NewPurchaseWorkspace purchaseId={purchaseId} />;
}
