import { BrainCircuit } from "lucide-react";
import { apiFetch } from "../api/client";
import type { Insight } from "../api/types";
import { usePolling } from "../hooks/usePolling";
import { Card } from "../components/Card";
import { CriticalityBadge, IncidentBadge } from "../components/Badges";
import { UpdateIndicator } from "../components/UpdateIndicator";
import { EmptyState, ErrorMessage, Spinner } from "../components/Feedback";
import { formatDateTime, formatDuration, formatRelative } from "../utils/format";

export function InsightsPage() {
  const { data, error, loading, lastUpdated } = usePolling<Insight[]>(() =>
    apiFetch<Insight[]>("/api/v1/dashboard/insights?limit=20"),
  );

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorMessage message={error} />;

  const insights = data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Insights IA</h1>
          <p className="text-sm text-slate-500">
            Análisis generados por Gemini sobre incidentes y contexto histórico
          </p>
        </div>
        <UpdateIndicator lastUpdated={lastUpdated} />
      </header>

      {insights.length === 0 ? (
        <EmptyState message="Aún no hay insights generados. Aparecerán automáticamente al detectarse incidentes." />
      ) : (
        <div className="space-y-3">
          {insights.map((ins) => (
            <Card
              key={ins.id}
              title={ins.incident?.monitor.name ?? "Monitor"}
              subtitle={`Generado ${formatRelative(ins.createdAt)} · ${formatDateTime(ins.createdAt)}`}
              icon={<BrainCircuit className="h-4 w-4" />}
              actions={<CriticalityBadge level={ins.criticality} />}
            >
              <p className="text-sm leading-relaxed text-slate-300">
                {ins.analysis}
              </p>

              {ins.historicalAnalysis && (
                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Contexto histórico
                  </p>
                  <p className="mt-1 text-sm text-slate-400">{ins.historicalAnalysis}</p>
                </div>
              )}

              {ins.suggestion && (
                <p className="mt-3 text-sm text-slate-400">
                  <span className="font-medium text-slate-300">Sugerencia:</span>{" "}
                  {ins.suggestion}
                </p>
              )}

              {ins.incident && (
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-800 pt-3 text-xs text-slate-500">
                  <IncidentBadge status={ins.incident.status} />
                  <span>
                    Inicio: {formatDateTime(ins.incident.startedAt)}
                  </span>
                  {ins.incident.resolvedAt && (
                    <span>Resuelto: {formatDateTime(ins.incident.resolvedAt)}</span>
                  )}
                  {ins.incident.downtime !== null && (
                    <span>Downtime: {formatDuration(ins.incident.downtime)}</span>
                  )}
                  {ins.incident.errorDetails && (
                    <span className="font-mono">· {ins.incident.errorDetails}</span>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}