import { apiClient } from "@/src/lib/apiClient";
import type { ProductRecord } from "@/src/features/products/api";

export type MultiPackType = "MULTIPACK_DEAL" | "CASE_SALE";
export type MultiPackProposalAction = "CREATE" | "UPDATE" | "DEACTIVATE" | "REACTIVATE";
export type MultiPackProposalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "SUPERSEDED";

export type ProductMultiPack = {
  id: string;
  storeId: string;
  productId: string;
  type: MultiPackType;
  unitsPerPack: number;
  caseBarcode: string | null;
  multiPackRetail: string;
  aggregateCostSnapshot: string | null;
  marginSnapshot: string | null;
  status: string;
  isActive: boolean;
  version: number;
};

export type MultiPackProposal = {
  id: string;
  storeId: string;
  productId: string;
  targetMultiPackId: string | null;
  action: MultiPackProposalAction;
  status: MultiPackProposalStatus;
  proposedType: MultiPackType;
  proposedUnitsPerPack: number;
  proposedCaseBarcode: string | null;
  proposedMultiPackRetail: string;
  unitCostSnapshot: string | null;
  aggregateCostSnapshot: string | null;
  marginSnapshot: string | null;
  submittedByActorId: string | null;
  submittedAt: string;
  reviewedByActorId: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  rejectionReason: string | null;
  product: ProductRecord;
};

export type MultiPackProposalCollection = {
  items: MultiPackProposal[];
  total: number;
  page: number;
  limit: number;
};

export type MultiPackLogCollection = {
  items: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    entityName: string | null;
    summary: string;
    metadata: unknown;
    createdAt: string;
    actor: { id: string; name: string | null; email: string; role: string } | null;
  }>;
  total: number;
  page: number;
  limit: number;
};

export type BulkApprovalIssue = {
  proposalId: string;
  productName: string;
  reason: string;
};

export type BulkApprovalResponse = {
  approvedCount: number;
  failedCount: number;
  approvedProposalIds: string[];
  failures: BulkApprovalIssue[];
};

export type SubmitMultiPackProposalInput = {
  productId: string;
  targetMultiPackId?: string | null;
  action: MultiPackProposalAction;
  type: MultiPackType;
  unitsPerPack: string;
  caseBarcode?: string | null;
  multiPackRetail: string;
};

export function listProductMultiPacks(storeId: string, productId: string) {
  return apiClient<ProductMultiPack[]>(
    `/stores/${storeId}/products/${productId}/multi-packs?active=true`,
  );
}

export function submitMultiPackProposal(storeId: string, input: SubmitMultiPackProposalInput) {
  return apiClient<MultiPackProposal>(`/stores/${storeId}/multi-pack-proposals`, {
    method: "POST",
    body: input,
  });
}

export function updateMultiPackProposal(storeId: string, proposalId: string, input: SubmitMultiPackProposalInput) {
  return apiClient<MultiPackProposal>(`/stores/${storeId}/multi-pack-proposals/${proposalId}`, {
    method: "PATCH",
    body: input,
  });
}

export function getMultiPackProposal(storeId: string, proposalId: string) {
  return apiClient<MultiPackProposal>(`/stores/${storeId}/multi-pack-proposals/${proposalId}`);
}

export function listMultiPackProposals(
  storeId: string,
  query: {
    status?: MultiPackProposalStatus | "";
    action?: MultiPackProposalAction | "";
    type?: MultiPackType | "";
    search?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 25),
  });

  if (query.status) params.set("status", query.status);
  if (query.action) params.set("action", query.action);
  if (query.type) params.set("type", query.type);
  if (query.search?.trim()) params.set("search", query.search.trim());

  return apiClient<MultiPackProposalCollection>(
    `/stores/${storeId}/multi-pack-proposals?${params.toString()}`,
  );
}

export function approveMultiPackProposal(storeId: string, proposalId: string, reviewNote?: string) {
  return apiClient<MultiPackProposal>(
    `/stores/${storeId}/multi-pack-proposals/${proposalId}/approve`,
    {
      method: "POST",
      body: { reviewNote: reviewNote ?? null },
    },
  );
}

export function approveAllMultiPackProposals(storeId: string, proposalIds?: string[]) {
  return apiClient<BulkApprovalResponse>(`/stores/${storeId}/multi-pack-proposals/approve-all`, {
    method: "POST",
    body: proposalIds ? { proposalIds } : {},
  });
}

export function rejectMultiPackProposal(storeId: string, proposalId: string, reason: string) {
  return apiClient<MultiPackProposal>(
    `/stores/${storeId}/multi-pack-proposals/${proposalId}/reject`,
    {
      method: "POST",
      body: { reason },
    },
  );
}

export function listMultiPackLogs(storeId: string, page = 1) {
  return apiClient<MultiPackLogCollection>(
    `/stores/${storeId}/multi-pack-logs?page=${page}&limit=25`,
  );
}

export function formatMultiPackType(type: MultiPackType) {
  return type === "CASE_SALE" ? "Case Sale" : "Multi Pack Deal";
}
