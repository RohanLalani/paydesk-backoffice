"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { BackOfficeShell, type BackOfficeShellContext } from "@/src/components/layout/BackOfficeShell";
import { ApiClientError } from "@/src/lib/apiClient";
import {
  approveMultiPackProposal,
  formatMultiPackType,
  listMultiPackProposals,
  rejectMultiPackProposal,
  type MultiPackProposal,
  type MultiPackProposalAction,
  type MultiPackProposalStatus,
  type MultiPackType,
} from "@/src/features/multi-pack/api";

function money(value: string | null) {
  if (!value) return "-";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount)
    : "-";
}

function getFriendlyError(error: unknown, fallback: string) {
  console.error("Failed to process multi-pack review queue", error);
  if (error instanceof ApiClientError) {
    if (error.status === 0) return "We couldn't connect to PayDesk. Please check your internet connection and try again.";
    if (error.status === 401) return "Your session has expired. Please sign in again.";
    if (error.status === 403) return "You don't have permission to review multi-pack pricing.";
    if (error.status === 409) return "This proposal changed before it could be reviewed. Refresh the queue and try again.";
    if (error.status >= 500) return "Something went wrong while reviewing multi-pack pricing. Please try again.";
  }
  return fallback;
}

export function MultiPackReviewWorkspace() {
  return (
    <BackOfficeShell activeItem="sendToPos" requiredPermission="review_multi_pack_pricing">
      {(context) => <MultiPackReviewContent {...context} />}
    </BackOfficeShell>
  );
}

function MultiPackReviewContent({ theme, selectedStore }: BackOfficeShellContext) {
  const [items, setItems] = useState<MultiPackProposal[]>([]);
  const [selected, setSelected] = useState<MultiPackProposal | null>(null);
  const [status, setStatus] = useState<MultiPackProposalStatus | "">("PENDING");
  const [action, setAction] = useState<MultiPackProposalAction | "">("");
  const [type, setType] = useState<MultiPackType | "">("");
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (storeId: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await listMultiPackProposals(storeId, { status, action, type, search });
      setItems(response.items);
      setSelected((current) => current && response.items.some((item) => item.id === current.id) ? current : response.items[0] ?? null);
    } catch (loadError) {
      setError(getFriendlyError(loadError, "We couldn't load multi-pack proposals right now. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [action, search, status, type]);

  const isDark = theme === "dark";
  const panel = isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white";
  const nested = isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const input = isDark ? "border-slate-400/15 bg-white/[0.04] text-white" : "border-[#ded8f3] bg-white text-slate-950";

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(selectedStore.id), 0);
    return () => window.clearTimeout(timeout);
  }, [load, selectedStore.id]);

  async function approve() {
          if (!selected) return;
          setError("");
          setMessage("");
          try {
            await approveMultiPackProposal(selectedStore.id, selected.id);
            setMessage("Multi-pack proposal approved.");
            await load(selectedStore.id);
          } catch (approveError) {
            setError(getFriendlyError(approveError, "The proposal could not be approved. Please try again."));
          }
  }

  async function reject() {
          if (!selected) return;
          setError("");
          setMessage("");
          if (!reason.trim()) {
            setError("A rejection reason is required.");
            return;
          }
          try {
            await rejectMultiPackProposal(selectedStore.id, selected.id, reason);
            setReason("");
            setMessage("Multi-pack proposal rejected.");
            await load(selectedStore.id);
          } catch (rejectError) {
            setError(getFriendlyError(rejectError, "The proposal could not be rejected. Please try again."));
          }
  }

  return (
          <section className="space-y-5">
            <div className={`rounded-[8px] border p-6 ${panel}`}>
              <h1 className="text-2xl font-bold tracking-normal">Multi Pack Review</h1>
              <p className={`mt-2 max-w-[760px] text-sm font-semibold leading-6 ${muted}`}>
                Review pending multi-pack pricing changes before publishing them to store registers.
              </p>
            </div>
            {message ? <div className="rounded-[8px] border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">{message}</div> : null}
            {error ? <div className="rounded-[8px] border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-300">{error}</div> : null}
            <div className={`rounded-[8px] border p-4 ${panel}`}>
              <div className="grid gap-3 lg:grid-cols-4">
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search item, barcode, case barcode" className={`h-11 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`} />
                <select value={status} onChange={(event) => setStatus(event.target.value as MultiPackProposalStatus | "")} className={`h-11 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`}>
                  <option value="PENDING">Pending</option>
                  <option value="">All statuses</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <select value={action} onChange={(event) => setAction(event.target.value as MultiPackProposalAction | "")} className={`h-11 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`}>
                  <option value="">All actions</option>
                  <option value="CREATE">Create</option>
                  <option value="UPDATE">Update</option>
                  <option value="DEACTIVATE">Deactivate</option>
                  <option value="REACTIVATE">Reactivate</option>
                </select>
                <select value={type} onChange={(event) => setType(event.target.value as MultiPackType | "")} className={`h-11 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`}>
                  <option value="">All types</option>
                  <option value="MULTIPACK_DEAL">Multi Pack Deal</option>
                  <option value="CASE_SALE">Case Sale</option>
                </select>
              </div>
            </div>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className={`overflow-hidden rounded-[8px] border ${panel}`}>
                <div className={`grid grid-cols-[120px_1fr_120px_100px_120px] gap-3 border-b px-4 py-3 text-xs font-extrabold uppercase ${muted}`}>
                  <span>Submitted</span><span>Product</span><span>Type</span><span>Units</span><span>Retail</span>
                </div>
                {loading ? <p className={`p-5 text-sm font-bold ${muted}`}>Loading proposals...</p> : null}
                {items.map((proposal) => (
                  <button key={proposal.id} type="button" onClick={() => setSelected(proposal)} className={`grid w-full grid-cols-[120px_1fr_120px_100px_120px] gap-3 px-4 py-3 text-left text-sm ${selected?.id === proposal.id ? "bg-[#4f2df2]/15" : ""}`}>
                    <span>{new Date(proposal.submittedAt).toLocaleDateString()}</span>
                    <span className="min-w-0"><b>{proposal.product.name}</b><br /><span className={muted}>{proposal.product.productNumber} / {proposal.product.barcode}</span></span>
                    <span>{formatMultiPackType(proposal.proposedType)}</span>
                    <span>{proposal.proposedUnitsPerPack}</span>
                    <span>{money(proposal.proposedMultiPackRetail)}</span>
                  </button>
                ))}
                {!loading && !items.length ? <p className={`p-5 text-sm font-bold ${muted}`}>No proposals found.</p> : null}
              </div>
              <aside className={`rounded-[8px] border p-5 ${panel}`}>
                {selected ? (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-extrabold">{selected.product.name}</h2>
                      <p className={`mt-1 text-sm font-semibold ${muted}`}>{selected.action} / {selected.status}</p>
                    </div>
                    <div className={`grid gap-2 rounded-[8px] border p-3 text-sm font-semibold ${nested}`}>
                      <span>Product Number: {selected.product.productNumber}</span>
                      <span>Base Barcode: {selected.product.barcode}</span>
                      <span>Type: {formatMultiPackType(selected.proposedType)}</span>
                      <span>Units: {selected.proposedUnitsPerPack}</span>
                      <span>Case Barcode: {selected.proposedCaseBarcode ?? "-"}</span>
                      <span>Proposed Retail: {money(selected.proposedMultiPackRetail)}</span>
                      <span>Aggregate Cost: {money(selected.aggregateCostSnapshot)}</span>
                      <span>Margin: {selected.marginSnapshot ? `${Number(selected.marginSnapshot).toFixed(2)}%` : "-"}</span>
                    </div>
                    {selected.status === "PENDING" ? (
                      <div className="space-y-3">
                        <button type="button" onClick={() => void approve()} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-emerald-600 px-4 text-sm font-extrabold text-white">
                          <Check className="size-4" /> Approve
                        </button>
                        <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Rejection reason" className={`min-h-24 w-full rounded-[8px] border p-3 text-sm font-bold outline-none ${input}`} />
                        <button type="button" onClick={() => void reject()} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-red-600 px-4 text-sm font-extrabold text-white">
                          <X className="size-4" /> Reject
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : <p className={`text-sm font-bold ${muted}`}>Select a proposal to review details.</p>}
              </aside>
            </div>
          </section>
  );
}
