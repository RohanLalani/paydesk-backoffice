import { permanentRedirect } from "next/navigation";

export default function ProductInventoryPage() {
  permanentRedirect("/inventory/overview");
}
