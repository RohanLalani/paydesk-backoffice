import { permanentRedirect } from "next/navigation";

export default function ProductPurchasesPage() {
  permanentRedirect("/inventory/purchases");
}
