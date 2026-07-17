"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, Send, X } from "lucide-react";
import { BackOfficeShell, type BackOfficeShellContext } from "@/src/components/layout/BackOfficeShell";
import { ApiClientError } from "@/src/lib/apiClient";
import {
  approveAllMultiPackProposals,
  formatMultiPackType,
  listMultiPackProposals,
  type BulkApprovalIssue,
  type MultiPackProposal,
} from "@/src/features/multi-pack/api";

const EMPTY_VALUE = "\u2014";
const MAX_PENDING_BATCH = 500;

type ThemeClasses = {
  isDark: boolean;
  panel: string;
  nested: string;
  muted: string;
  subtleText: string;
  border: string;
  rowHover: string;
  selectedRow: string;
  selectedIndicator: string;
  control: string;
};

function getThemeClasses(theme: "light" | "dark"): ThemeClasses {
  const isDark = theme === "dark";
  return {
    isDark,
    panel: isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white",
    nested: isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]",
    muted: isDark ? "text-slate-400" : "text-slate-500",
    subtleText: isDark ? "text-slate-300" : "text-slate-700",
    border: isDark ? "border-slate-400/15" : "border-[#ded8f3]",
    rowHover: isDark ? "hover:bg-white/[0.04]" : "hover:bg-[#fbfaff]",
    selectedRow: isDark ? "bg-[#4f2df2]/15 text-white" : "bg-[#f3f0ff] text-slate-950",
    selectedIndicator: isDark ? "before:bg-[#9b87ff]" : "before:bg-[#4f2df2]",
    control: isDark
      ? "border-slate-400/15 bg-white/[0.04] text-white"
      : "border-[#ded8f3] bg-white text-slate-950",
  };
}

function money(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return EMPTY_VALUE;
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount)
    : EMPTY_VALUE;
}

function percent(value: string | null | undefined) {
  if (!value) return EMPTY_VALUE;
  const amount = Number(value);
  return Number.isFinite(amount) ? `${amount.toFixed(2)}%` : EMPTY_VALUE;
}

function formatAction(action: MultiPackProposal["action"]) {
  return action.charAt(0) + action.slice(1).toLowerCase();
}

function hasPermission(context: BackOfficeShellContext, permission: string) {
  return context.account?.role === "owner" || context.account?.role === "partner" || context.account?.permissions?.includes(permission) === true;
}

function getIssueList(error: unknown) {
  if (!(error instanceof ApiClientError)) return [];
  const payload = error.payload as { issues?: unknown } | null;
  return Array.isArray(payload?.issues) ? (payload.issues as BulkApprovalIssue[]) : [];
}

function getFriendlyError(error: unknown, fallback: string) {
  console.error("Failed to process multi-pack review queue", error);
  if (error instanceof ApiClientError) {
    if (error.status === 0) return "We couldn't connect to PayDesk. Please check your connection and try again.";
    if (error.status === 401) return "Your session has expired. Please sign in again.";
    if (error.status === 403) return "You don't have permission to review multi-pack pricing.";
    if (error.status === 400 && getIssueList(error).length) return "Some changes need to be edited before they can be sent to POS.";
    if (error.status === 409) return "Pending multi-pack changes changed while sending. Please refresh and try again.";
    if (error.status >= 500) return "Something went wrong while sending multi-pack changes to POS. Please try again.";
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

function MultiPackReviewContent(context: BackOfficeShellContext) {
  const { theme, selectedStore } = context;
  const router = useRouter();
  const classes = getThemeClasses(theme);
  const [items, setItems] = useState<MultiPackProposal[]>([]);
  const [selected, setSelected] = useState<MultiPackProposal | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<BulkApprovalIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canEdit = hasPermission(context, "manage_multi_pack_pricing");

  const load = useCallback(async (storeId: string) => {
    setLoading(true);
    setError("");
    setIssues([]);
    try {
      const response = await listMultiPackProposals(storeId, { status: "PENDING", limit: MAX_PENDING_BATCH });
      setItems(response.items);
      setSelected((current) => response.items.find((item) => item.id === current?.id) ?? null);
    } catch (loadError) {
      setError(getFriendlyError(loadError, "We couldn't load pending multi-pack changes right now. Please try again."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load(selectedStore.id));
  }, [load, selectedStore.id]);

  async function sendToPos() {
    if (!items.length || sending) return;
    setSending(true);
    setMessage("");
    setError("");
    setIssues([]);
    try {
      await approveAllMultiPackProposals(selectedStore.id);
      setConfirmOpen(false);
      setMessage("Multi-pack changes sent to POS.");
      setSelected(null);
      await load(selectedStore.id);
    } catch (sendError) {
      setIssues(getIssueList(sendError));
      setError(getFriendlyError(sendError, "Some changes need to be edited before they can be sent to POS."));
    } finally {
      setSending(false);
    }
  }

  function editSelected() {
    if (!selected) return;
    const params = new URLSearchParams({ productId: selected.productId, proposalId: selected.id });
    router.push(`/products/multi-pack-pricing?${params.toString()}`);
  }

  return (
    <section className="space-y-6">
      <div className={`rounded-[8px] border p-6 ${classes.panel}`}>
        <h1 className="text-2xl font-bold tracking-normal">Multi Pack Review</h1>
        <p className={`mt-2 max-w-[760px] text-sm font-semibold leading-6 ${classes.muted}`}>
          Review pending multi-pack pricing changes before publishing them to store registers.
        </p>
      </div>

      {message ? <Notice tone="success" message={message} /> : null}
      {error ? <Notice tone="error" message={error} issues={issues} /> : null}

      <BulkActionBar
        classes={classes}
        count={items.length}
        sending={sending}
        onSend={() => setConfirmOpen(true)}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,65fr)_minmax(340px,35fr)]">
        <PendingTable
          classes={classes}
          items={items}
          selectedId={selected?.id ?? null}
          loading={loading}
          onSelect={setSelected}
        />
        <DetailsPanel
          classes={classes}
          proposal={selected}
          canEdit={canEdit}
          onEdit={editSelected}
        />
      </div>

      {confirmOpen ? (
        <SendToPosDialog
          classes={classes}
          count={items.length}
          sending={sending}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void sendToPos()}
        />
      ) : null}
    </section>
  );
}

function Notice({ tone, message, issues = [] }: { tone: "success" | "error"; message: string; issues?: BulkApprovalIssue[] }) {
  const toneClass = tone === "success"
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
    : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <div className={`rounded-[8px] border p-4 text-sm font-bold ${toneClass}`} role={tone === "error" ? "alert" : "status"}>
      <p>{message}</p>
      {issues.length ? (
        <ul className="mt-3 space-y-1 text-xs font-semibold">
          {issues.map((issue) => (
            <li key={issue.proposalId}>{issue.productName}: {issue.reason}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function BulkActionBar({ classes, count, sending, onSend }: { classes: ThemeClasses; count: number; sending: boolean; onSend: () => void }) {
  return (
    <section className={`rounded-[8px] border p-5 ${classes.panel}`} aria-label="Bulk multi-pack review actions">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-extrabold tracking-normal">Pending changes: {count}</p>
          <p className={`mt-1 text-sm font-semibold ${classes.muted}`}>Approve and publish all pending multi-pack changes shown below.</p>
        </div>
        <button
          type="button"
          onClick={onSend}
          disabled={!count || sending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-5 text-sm font-extrabold text-white transition hover:bg-[#3f22d4] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/30"
        >
          {sending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
          {sending ? "Sending to POS..." : "Send to POS"}
        </button>
      </div>
    </section>
  );
}

function PendingTable({
  classes,
  items,
  selectedId,
  loading,
  onSelect,
}: {
  classes: ThemeClasses;
  items: MultiPackProposal[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (proposal: MultiPackProposal) => void;
}) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-[8px] border ${classes.panel}`}>
      <div className="p-5">
        <h2 className="text-xl font-semibold tracking-normal">Pending Multi-Pack Table</h2>
      </div>
      <div className={`overflow-x-auto border-t ${classes.border}`}>
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className={`text-[12px] font-extrabold uppercase ${classes.muted}`}>
            <tr>
              <th className="px-4 py-3">Product Name</th>
              <th className="px-4 py-3">Individual Cost</th>
              <th className="px-4 py-3">Individual Retail</th>
              <th className="px-4 py-3">Multi-Pack Cost</th>
              <th className="px-4 py-3">Multi-Pack Retail</th>
              <th className="px-4 py-3">Multi-Pack Margin</th>
            </tr>
          </thead>
          <tbody>
            {items.map((proposal) => (
              <ProposalRow
                key={proposal.id}
                proposal={proposal}
                classes={classes}
                selected={selectedId === proposal.id}
                onSelect={onSelect}
              />
            ))}
          </tbody>
        </table>
        {loading ? <p className={`border-t px-5 py-4 text-sm font-semibold ${classes.border} ${classes.muted}`}>Loading pending changes...</p> : null}
        {!loading && !items.length ? (
          <div className={`border-t px-5 py-8 ${classes.border}`}>
            <h3 className="text-lg font-extrabold tracking-normal">No pending multi-pack changes</h3>
            <p className={`mt-2 text-sm font-semibold ${classes.muted}`}>There are no multi-pack changes waiting to be sent to POS.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ProposalRow({
  proposal,
  classes,
  selected,
  onSelect,
}: {
  proposal: MultiPackProposal;
  classes: ThemeClasses;
  selected: boolean;
  onSelect: (proposal: MultiPackProposal) => void;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(proposal);
  }

  return (
    <tr
      tabIndex={0}
      aria-selected={selected}
      onClick={() => onSelect(proposal)}
      onKeyDown={onKeyDown}
      className={`cursor-pointer border-t transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#7c5cff]/25 ${classes.border} ${selected ? classes.selectedRow : classes.rowHover}`}
    >
      <td className={`border-l-4 px-4 py-4 font-semibold ${selected ? "border-[#4f2df2]" : "border-transparent"}`}>{proposal.product.name}</td>
      <td className="px-4 py-4 font-semibold">{money(proposal.unitCostSnapshot)}</td>
      <td className="px-4 py-4 font-semibold">{money(proposal.product.unitRetail)}</td>
      <td className="px-4 py-4 font-semibold">{money(proposal.aggregateCostSnapshot)}</td>
      <td className="px-4 py-4 font-semibold">{money(proposal.proposedMultiPackRetail)}</td>
      <td className="px-4 py-4"><MarginValue value={proposal.marginSnapshot} /></td>
    </tr>
  );
}

function MarginValue({ value }: { value: string | null }) {
  const amount = value ? Number(value) : null;
  if (amount === null || !Number.isFinite(amount)) return <span className="font-semibold">{EMPTY_VALUE}</span>;
  const isNegative = amount < 0;

  return (
    <span className={isNegative ? "font-extrabold text-rose-500" : "font-semibold"}>
      {amount.toFixed(2)}%{isNegative ? " - Warning: negative margin" : ""}
    </span>
  );
}

function DetailsPanel({
  classes,
  proposal,
  canEdit,
  onEdit,
}: {
  classes: ThemeClasses;
  proposal: MultiPackProposal | null;
  canEdit: boolean;
  onEdit: () => void;
}) {
  if (!proposal) {
    return (
      <aside className={`rounded-[8px] border p-6 ${classes.panel}`}>
        <h2 className="text-xl font-semibold tracking-normal">Select a request</h2>
        <p className={`mt-2 text-sm font-semibold leading-6 ${classes.muted}`}>Choose a multi-pack request from the list to view its details.</p>
      </aside>
    );
  }

  const currentConfig = proposal.targetMultiPackId ? `Target configuration ${proposal.targetMultiPackId}` : EMPTY_VALUE;
  const rows = [
    ["Product Name", proposal.product.name],
    ["Product Number", String(proposal.product.productNumber)],
    ["Base Barcode", proposal.product.barcode],
    ["Type", formatMultiPackType(proposal.proposedType)],
    ["Units in Pack", String(proposal.proposedUnitsPerPack)],
    ["Case Barcode", proposal.proposedCaseBarcode ?? EMPTY_VALUE],
    ["Individual Cost", money(proposal.unitCostSnapshot)],
    ["Individual Retail", money(proposal.product.unitRetail)],
    ["Proposed Multi-Pack Cost", money(proposal.aggregateCostSnapshot)],
    ["Proposed Multi-Pack Retail", money(proposal.proposedMultiPackRetail)],
    ["Proposed Multi-Pack Margin", percent(proposal.marginSnapshot)],
    ["Current active configuration", currentConfig],
    ["Proposed change details", `${formatAction(proposal.action)} ${formatMultiPackType(proposal.proposedType)} at ${money(proposal.proposedMultiPackRetail)}`],
  ];

  return (
    <aside className={`rounded-[8px] border p-6 ${classes.panel}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold tracking-normal" title={proposal.product.name}>{proposal.product.name}</h2>
          <p className={`mt-1 text-sm font-semibold ${classes.muted}`}>{formatAction(proposal.action)} request</p>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-extrabold text-white transition hover:bg-[#3f22d4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/30"
          >
            <Pencil className="size-4" aria-hidden="true" />
            Edit Multi-Pack
          </button>
        ) : null}
      </div>

      <dl className={`mt-5 divide-y rounded-[8px] border ${classes.nested} ${classes.border}`}>
        {rows.map(([label, value]) => (
          <div key={label} className={`grid gap-2 px-4 py-3 sm:grid-cols-[150px_minmax(0,1fr)] ${classes.border}`}>
            <dt className={`text-[13px] font-semibold ${classes.muted}`}>{label}</dt>
            <dd className="min-w-0 break-words text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

function SendToPosDialog({
  classes,
  count,
  sending,
  onCancel,
  onConfirm,
}: {
  classes: ThemeClasses;
  count: number;
  sending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-0 backdrop-blur-sm sm:items-center sm:py-6" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-pos-dialog-title"
        aria-describedby="send-pos-dialog-body"
        className={`w-full max-w-[520px] rounded-t-[18px] border p-5 shadow-[0_28px_90px_rgba(15,23,42,0.24)] sm:rounded-[14px] sm:p-6 ${classes.isDark ? "border-slate-400/15 bg-[#0b1224] text-[#f4f1ff]" : "border-[#ded8f3] bg-white text-slate-950"}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="send-pos-dialog-title" className="text-xl font-bold tracking-normal">Send all multi-pack changes to POS?</h2>
            <p id="send-pos-dialog-body" className={`mt-3 text-sm font-semibold leading-6 ${classes.subtleText}`}>
              This will approve and publish all pending multi-pack changes shown in the table.
            </p>
          </div>
          <button type="button" onClick={onCancel} disabled={sending} className={`grid size-9 shrink-0 place-items-center rounded-[8px] border transition disabled:cursor-not-allowed disabled:opacity-60 ${classes.control}`} aria-label="Close dialog">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className={`mt-5 rounded-[8px] border p-4 text-sm font-semibold ${classes.nested}`}>
          <p>Pending proposals: {count}</p>
          <p className="mt-2 text-amber-500">This updates active multi-pack pricing.</p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={sending} className={`inline-flex h-10 items-center justify-center rounded-[8px] border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${classes.control}`}>Cancel</button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={sending || !count}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#3f22d4] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/30"
          >
            {sending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
            {sending ? "Sending to POS..." : "Send to POS"}
          </button>
        </div>
      </div>
    </div>
  );
}
