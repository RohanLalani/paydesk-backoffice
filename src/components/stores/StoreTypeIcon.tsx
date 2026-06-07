"use client";

import { getStoreTypeConfig, inferStoreType } from "@/src/lib/storeTypeConfig";

export const inferBusinessType = inferStoreType;

export function StoreTypeIcon({
  businessType,
  type,
  name,
  address,
  className = "",
}: {
  businessType?: string;
  type?: string;
  name?: string;
  address?: string;
  className?: string;
}) {
  const Icon = getStoreTypeConfig({ businessType, type, name, address }).icon;

  return <Icon className={className} aria-hidden="true" strokeWidth={2.2} />;
}
