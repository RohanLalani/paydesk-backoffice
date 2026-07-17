"use client";

import { useCallback, useEffect, useState } from "react";
import { BackOfficeShell, type BackOfficeShellContext } from "@/src/components/layout/BackOfficeShell";
import { listMultiPackLogs, type MultiPackLogCollection } from "@/src/features/multi-pack/api";

export function MultiPackLogsWorkspace() {
  return (
    <BackOfficeShell activeItem="logs" requiredPermission="view_audit_logs">
      {(context) => <MultiPackLogsContent {...context} />}
    </BackOfficeShell>
  );
}

function MultiPackLogsContent({ theme, selectedStore }: BackOfficeShellContext) {
  const [logs, setLogs] = useState<MultiPackLogCollection["items"]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (storeId: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await listMultiPackLogs(storeId);
      setLogs(response.items);
    } catch (loadError) {
      console.error("Failed to load multi-pack logs", loadError);
      setError("Multi-pack logs could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  const isDark = theme === "dark";
  const panel = isDark ? "border-slate-400/15 bg-[#0f172a]" : "border-[#ded8f3] bg-white";
  const muted = isDark ? "text-slate-400" : "text-slate-500";

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(selectedStore.id), 0);
    return () => window.clearTimeout(timeout);
  }, [load, selectedStore.id]);

  return (
          <section className="space-y-5">
            <div className={`rounded-[8px] border p-6 ${panel}`}>
              <h1 className="text-2xl font-bold tracking-normal">Multi Pack Logs</h1>
              <p className={`mt-2 text-sm font-semibold ${muted}`}>Review multi-pack proposal and approval audit history.</p>
            </div>
            {error ? <div className="rounded-[8px] border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-300">{error}</div> : null}
            <div className={`overflow-hidden rounded-[8px] border ${panel}`}>
              <div className={`grid grid-cols-[180px_180px_1fr_180px] gap-3 border-b px-4 py-3 text-xs font-extrabold uppercase ${muted}`}>
                <span>Time</span><span>Action</span><span>Summary</span><span>User</span>
              </div>
              {loading ? <p className={`p-5 text-sm font-bold ${muted}`}>Loading logs...</p> : null}
              {logs.map((log) => (
                <div key={log.id} className="grid grid-cols-[180px_180px_1fr_180px] gap-3 px-4 py-3 text-sm">
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                  <span>{log.action.replaceAll("_", " ")}</span>
                  <span>{log.summary}</span>
                  <span>{log.actor?.name || log.actor?.email || "System"}</span>
                </div>
              ))}
              {!loading && !logs.length ? <p className={`p-5 text-sm font-bold ${muted}`}>No multi-pack logs found.</p> : null}
            </div>
          </section>
  );
}
