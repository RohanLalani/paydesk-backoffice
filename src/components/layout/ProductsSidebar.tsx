"use client";

import { ContextualSidebar } from "@/src/components/layout/ContextualSidebar";
import { productNavigation } from "@/src/features/products/navigation";
import type { PayDeskTheme } from "@/src/lib/theme";

export function ProductsSidebar({ theme }: { theme: PayDeskTheme }) {
  return <ContextualSidebar label="Product Management" items={productNavigation} theme={theme} />;
}
