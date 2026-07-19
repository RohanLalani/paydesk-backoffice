import { Suspense } from "react";
import { PurchaseDetailRoute } from "@/src/app/inventory/purchases/detail/PurchaseDetailRoute";

export default function PurchaseDetailPage() {
  return (
    <Suspense fallback={null}>
      <PurchaseDetailRoute />
    </Suspense>
  );
}
