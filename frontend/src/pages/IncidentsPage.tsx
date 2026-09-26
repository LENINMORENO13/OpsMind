import { useState } from "react";
import { AlertTriangle, CheckCircle2, Pencil, Wrench } from "lucide-react";
import { apiFetch } from "../api/client";
import type { OperationalIncident, Window } from "../api/types";
import { usePolling } from "../hooks/usePolling";
import { Card } from "../components/Card";
import { CriticalityBadge, IncidentBadge } from "../components/Badges";
import { UpdateIndicator } from "../components/UpdateIndicator";
import { EmptyState, ErrorMessage, Spinner } from "../components/Feedback";
import { ResolveModal } from "../components/ResolveModal";
import { formatDateTime, formatDuration, formatRelative } from "../utils/format";

const WINDOWS: { value: Window; label: string }[] = [
  { value: "24h", label: "24 horas" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
];

export function IncidentsPage() {
  const [window, setWindow] = useState<Window>("24h");
  const [resolving, setResolving] = useState<OperationalIncident | null>(null);
  const { data, error, loading, lastUpdated, refresh } = usePolling<OperationalIncident[]>(() =>
    apiFetch<OperationalIncident[]>(
      `/api/v1/dashboard/incidents?window=${window}&limit=50`,
    ),
    30_000,
    [window],
  );

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorMessage message={error} />;

  const incidents = data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Incidentes</h1>
          <p className="text-sm text-slate-500">
            Abiertos más eventos del período seleccionado
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <UpdateIndicator lastUpdated={lastUpdated} />
          <div className="flex overflow-hidden rounded-lg border border-slate-700 text-sm">
            {WINDOWS.map((w) => (
              <button
                key={w.value}
                type="button"
                onClick={() => setWindow(w.value)}
                className={`px-3 py-1.5 transition-colors ${
                  window === w.value
                    ? "bg-indigo-500 text-white"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {incidents.length === 0 ? (
        <EmptyState message="No hay incidentes registrados en este período." />
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => (
            <Card key={inc.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <IncidentBadge status={inc.status} />
                    <span className="font-semibold text-slate-100">{inc.monitor.name}</span>
                    <span className="truncate text-xs text-slate-500">{inc.monitor.url}</span>
                    {inc.aiInsight && <CriticalityBadge level={inc.aiInsight.criticality} />}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Abierto {formatDateTime(inc.startedAt)} ·{" "}
                    {inc.resolvedAt
                      ? `resuelto ${formatRelative(inc.resolvedAt)}`
                      : `hace ${formatRelative(inc.startedAt)}`}
                    {inc.downtime !== null && (
                      <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300">
                        downtime {formatDuration(inc.downtime)}
                      </span>
                    )}
                  </p>
                  {inc.errorDetails && (
                    <p className="mt-2 rounded-lg bg-slate-950/60 px-3 py-2 text-xs font-mono text-slate-400">
                      {inc.errorDetails}
                    </p>
                  )}
                </div>
                {!inc.resolutionLog && inc.status !== "IGNORED" && (
                  <button
                    type="button"
                    onClick={() => setResolving(inc)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors ${
                      inc.status === "OPEN"
                        ? "bg-emerald-500 hover:bg-emerald-400"
                        : "border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    }`}
                  >
                    {inc.status === "OPEN" ? (
                      <>
                        <Wrench className="h-4 w-4" />
                        Resolver
                      </>
                    ) : (
                      <>
                        <Pencil className="h-4 w-4" />
                        Registrar solución
                      </>
                    )}
                  </button>
                )}
              </div>

              {inc.resolutionLog && (
                <div className="mt-4 border-t border-slate-800 pt-4">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Solución registrada
                  </p>
                  <p className="mt-1.5 text-sm text-slate-300">
                    <span className="font-medium text-slate-400">Causa raíz:</span>{" "}
                    {inc.resolutionLog.rootCause}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    <span className="font-medium text-slate-400">Acción:</span>{" "}
                    {inc.resolutionLog.actionTaken}
                  </p>
                </div>
              )}

              {inc.aiInsight && (
                <div className="mt-4 border-t border-slate-800 pt-4">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-indigo-300">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Análisis IA
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                    {inc.aiInsight.analysis}
                  </p>
                  {inc.aiInsight.suggestion && (
                    <p className="mt-2 text-sm text-slate-400">
                      <span className="font-medium text-slate-300">Sugerencia:</span>{" "}
                      {inc.aiInsight.suggestion}
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {resolving && (
        <ResolveModal
          incident={resolving}
          onClose={() => setResolving(null)}
          onResolved={() => {
            setResolving(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}