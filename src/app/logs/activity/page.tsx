"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCcw, Search, X } from "lucide-react";
import { BackOfficeShell, type BackOfficeShellContext } from "@/src/components/layout/BackOfficeShell";
import {
  auditActions,
  auditEntityTypes,
  formatAuditLabel,
  getAuditEvent,
  listAuditEvents,
  type AuditAction,
  type AuditEntityType,
  type AuditEventDetail,
  type AuditEventListItem,
} from "@/src/features/logs/api";

const PAGE_LIMIT = 25;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getFriendlyError(error: unknown) {
  console.error("Failed to load activity logs", error);
  return "We couldn't load activity logs right now. Please try again.";
}

function JsonBlock({ label, value, isDark }: { label: string; value: unknown; isDark: boolean }) {
  return (
    <div className="min-w-0">
      <h3 className="text-xs font-extrabold uppercase tracking-normal">{label}</h3>
      <pre className={`mt-2 max-h-64 overflow-auto rounded-[8px] border p-3 text-xs leading-5 ${isDark ? "border-slate-400/15 bg-black/20 text-slate-200" : "border-[#ded8f3] bg-[#fbfaff] text-slate-700"}`}>
        {JSON.stringify(value ?? null, null, 2)}
      </pre>
    </div>
  );
}

function ActivityLogsWorkspace({ theme, selectedStore }: BackOfficeShellContext) {
  const [events, setEvents] = useState<AuditEventListItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AuditEventDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<AuditAction | "">("");
  const [entityType, setEntityType] = useState<AuditEntityType | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const loadEvents = useCallback(async (storeId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await listAuditEvents(storeId, {
        page,
        limit: PAGE_LIMIT,
        action,
        entityType,
        search,
      });
      setEvents(response.items);
      setTotal(response.total);
      if (selectedId && !response.items.some((event) => event.id === selectedId)) {
        setSelectedId(null);
        setSelectedEvent(null);
      }
    } catch (loadError) {
      setError(getFriendlyError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [action, entityType, page, search, selectedId]);

  const filtersActive = useMemo(
    () => Boolean(action || entityType || search.trim()),
    [action, entityType, search],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadEvents(selectedStore.id);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadEvents, selectedStore.id]);

  const openDetail = async (event: AuditEventListItem) => {
    setSelectedId(event.id);
    setDetailLoading(true);

    try {
      setSelectedEvent(await getAuditEvent(selectedStore.id, event.id));
    } catch (detailError) {
      setError(getFriendlyError(detailError));
    } finally {
      setDetailLoading(false);
    }
  };

  const isDark = theme === "dark";
  const panel = isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const input = isDark ? "border-slate-400/15 bg-white/[0.04] text-white" : "border-[#ded8f3] bg-white text-slate-950";
  const control = isDark
    ? "border-slate-400/15 bg-white/[0.04] text-slate-200 hover:border-[#7c5cff]/60 disabled:text-slate-600"
    : "border-[#ded8f3] bg-white text-slate-700 hover:border-[#7c5cff]/60 disabled:text-slate-300";

  return (
    <section className="space-y-5">
      <div className={`rounded-[8px] border p-5 ${panel}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-normal">Activity Logs</h1>
            <p className={`mt-2 text-sm font-semibold ${muted}`}>
              Review store changes, staff actions, register events, and product setup updates.
            </p>
          </div>
          <button type="button" className={`inline-flex h-11 items-center gap-2 rounded-[8px] border px-4 text-sm font-extrabold transition ${control}`} onClick={() => void loadEvents(selectedStore.id)}>
            <RefreshCcw className="size-4" aria-hidden="true" />
            Retry
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_180px_220px_auto]">
          <label className="relative block">
            <span className="sr-only">Search logs</span>
            <Search className={`pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 ${muted}`} aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search activity"
              className={`h-11 w-full rounded-[8px] border py-2 pl-10 pr-3 text-sm font-semibold outline-none ${input}`}
            />
          </label>
          <select
            value={action}
            onChange={(event) => {
              setAction(event.target.value as AuditAction | "");
              setPage(1);
            }}
            className={`h-11 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`}
          >
            <option value="">All actions</option>
            {auditActions.map((value) => (
              <option key={value} value={value}>{formatAuditLabel(value)}</option>
            ))}
          </select>
          <select
            value={entityType}
            onChange={(event) => {
              setEntityType(event.target.value as AuditEntityType | "");
              setPage(1);
            }}
            className={`h-11 rounded-[8px] border px-3 text-sm font-bold outline-none ${input}`}
          >
            <option value="">All areas</option>
            {auditEntityTypes.map((value) => (
              <option key={value} value={value}>{formatAuditLabel(value)}</option>
            ))}
          </select>
          {filtersActive ? (
            <button
              type="button"
              className={`inline-flex h-11 items-center gap-2 rounded-[8px] border px-4 text-sm font-extrabold transition ${control}`}
              onClick={() => {
                setAction("");
                setEntityType("");
                setSearch("");
                setPage(1);
              }}
            >
              <X className="size-4" aria-hidden="true" />
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className={`rounded-[8px] border p-4 text-sm font-bold ${isDark ? "border-red-400/25 bg-red-500/10 text-red-100" : "border-red-200 bg-red-50 text-red-700"}`}>
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className={`overflow-hidden rounded-[8px] border ${panel}`}>
          <div className={`grid grid-cols-[150px_160px_1fr_180px] gap-3 border-b px-4 py-3 text-xs font-extrabold uppercase ${isDark ? "border-slate-400/15 text-slate-400" : "border-[#ded8f3] text-slate-500"}`}>
            <span>Action</span>
            <span>Area</span>
            <span>Summary</span>
            <span>When</span>
          </div>
          <div className="divide-y divide-slate-400/10">
            {events.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => void openDetail(event)}
                className={`grid w-full grid-cols-[150px_160px_1fr_180px] gap-3 px-4 py-3 text-left text-sm transition ${selectedId === event.id ? (isDark ? "bg-white/[0.06]" : "bg-[#f3f0ff]") : isDark ? "hover:bg-white/[0.04]" : "hover:bg-[#fbfaff]"}`}
              >
                <span className="font-extrabold">{formatAuditLabel(event.action)}</span>
                <span className={muted}>{formatAuditLabel(event.entityType)}</span>
                <span className="min-w-0">
                  <span className="block truncate font-bold">{event.summary}</span>
                  <span className={`block truncate text-xs font-semibold ${muted}`}>
                    {event.actor?.name || event.actor?.email || "System"}
                  </span>
                </span>
                <span className={`text-xs font-semibold ${muted}`}>{formatDate(event.createdAt)}</span>
              </button>
            ))}
            {!isLoading && events.length === 0 ? (
              <div className={`px-4 py-8 text-center text-sm font-bold ${muted}`}>
                No activity logs found.
              </div>
            ) : null}
            {isLoading ? (
              <div className={`px-4 py-8 text-center text-sm font-bold ${muted}`}>
                Loading activity logs...
              </div>
            ) : null}
          </div>
          <div className={`flex items-center justify-between border-t px-4 py-3 text-sm font-bold ${isDark ? "border-slate-400/15" : "border-[#ded8f3]"}`}>
            <span className={muted}>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button type="button" className={`h-10 rounded-[8px] border px-3 text-sm font-extrabold transition ${control}`} disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                Previous
              </button>
              <button type="button" className={`h-10 rounded-[8px] border px-3 text-sm font-extrabold transition ${control}`} disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                Next
              </button>
            </div>
          </div>
        </div>

        <aside className={`rounded-[8px] border p-5 ${panel}`}>
          {detailLoading ? (
            <p className={`text-sm font-bold ${muted}`}>Loading details...</p>
          ) : selectedEvent ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-extrabold tracking-normal">{selectedEvent.summary}</h2>
                <p className={`mt-1 text-sm font-semibold ${muted}`}>
                  {formatAuditLabel(selectedEvent.action)} / {formatAuditLabel(selectedEvent.entityType)}
                </p>
              </div>
              <div className={`grid gap-2 rounded-[8px] border p-3 text-sm font-semibold ${isDark ? "border-slate-400/15 bg-white/[0.03]" : "border-[#ded8f3] bg-[#fbfaff]"}`}>
                <span>Actor: {selectedEvent.actor?.name || selectedEvent.actor?.email || "System"}</span>
                <span>Entity: {selectedEvent.entityName || selectedEvent.entityId || "Unavailable"}</span>
                <span>When: {formatDate(selectedEvent.createdAt)}</span>
              </div>
              <JsonBlock label="Changes" value={selectedEvent.changes} isDark={isDark} />
              <JsonBlock label="Metadata" value={selectedEvent.metadata} isDark={isDark} />
            </div>
          ) : (
            <p className={`text-sm font-bold ${muted}`}>Select an activity log to review details.</p>
          )}
        </aside>
      </div>
    </section>
  );
}

export default function ActivityLogsPage() {
  return (
    <BackOfficeShell activeItem="logs" requiredPermission="view_audit_logs">
      {(context) => <ActivityLogsWorkspace {...context} />}
    </BackOfficeShell>
  );
}
