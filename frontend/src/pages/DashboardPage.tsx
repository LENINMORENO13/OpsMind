import { Activity, AlertTriangle, Cpu, Gauge, ShieldCheck, Server } from "lucide-react";
import { apiFetch } from "../api/client";
import type { DashboardSummary } from "../api/types";
import { usePolling } from "../hooks/usePolling";
import { Card, Stat } from "../components/Card";
import { StatusBadge } from "../components/Badges";
import { UpdateIndicator } from "../components/UpdateIndicator";
import { EmptyState, ErrorMessage, Spinner } from "../components/Feedback";
import { formatMs, formatPercent, formatRelative, formatTime } from "../utils/format";

export function DashboardPage() {
  const { data, error, loading, lastUpdated } = usePolling<DashboardSummary>(() =>
    apiFetch<DashboardSummary>("/api/v1/dashboard/summary"),
  );

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorMessage message={error} />;
  if (!data) return <EmptyState message="Sin datos disponibles aún." />;

  const { monitors, incidents, logs24h, insights } = data;
  const mttr = incidents.mttrMinutes;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Resumen operativo</h1>
          <p className="text-sm text-slate-500">
            Última verificación del backend: {formatRelative(logs24h.lastCheckedAt ?? new Date().toISOString())}
          </p>
        </div>
        <UpdateIndicator lastUpdated={lastUpdated} />
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <Stat
          label="Disponibilidad 24h"
          value={formatPercent(logs24h.availability24h)}
          hint={`${logs24h.checks.toLocaleString("es-ES")} verificaciones`}
          tone={logs24h.availability24h >= 99 ? "good" : logs24h.availability24h >= 95 ? "warn" : "bad"}
        />
        <Stat
          label="Tiempo de respuesta"
          value={formatMs(logs24h.avgResponseTime)}
          hint="promedio últimas 24h"
        />
        <Stat
          label="Incidentes abiertos"
          value={incidents.open}
          hint={`${incidents.resolved24h} resueltos en 24h`}
          tone={incidents.open > 0 ? "bad" : "good"}
        />
        <Stat
          label="MTTR"
          value={mttr ? `${Math.round(mttr)} min` : "—"}
          hint="tiempo medio resolución (30d)"
        />
      </div>

      <Card
        title="Estado de monitores"
        subtitle={`${monitors.total} monitores configurados`}
        icon={<Server className="h-4 w-4" />}
      >
        <div className="flex flex-wrap gap-3">
          {(["UP", "DOWN", "DEGRADED", "PENDING"] as const).map((status) => (
            <div
              key={status}
              className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3"
            >
              <StatusBadge status={status} />
              <span className="text-2xl font-bold tabular-nums text-slate-100">
                {monitors.byStatus[status]}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Incidentes resueltos" icon={<Activity className="h-4 w-4" />}>
          <ul className="space-y-2 text-sm">
            <Row label="Últimas 24h" value={incidents.resolved24h} />
            <Row label="Últimos 7 días" value={incidents.resolved7d} />
            <Row label="Últimos 30 días" value={incidents.resolved30d} />
          </ul>
        </Card>
        <Card title="Últimas verificaciones 24h" icon={<Gauge className="h-4 w-4" />}>
          <ul className="space-y-2 text-sm">
            {(["UP", "DOWN", "DEGRADED", "PENDING"] as const).map((state) => (
              <Row
                key={state}
                label={state === "PENDING" ? "Pendientes" : state.toLowerCase()}
                value={logs24h.byState[state]}
              />
            ))}
          </ul>
        </Card>
        <Card title="Insights IA" icon={<Cpu className="h-4 w-4" />}>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tabular-nums text-slate-100">
              {insights.total}
            </span>
            <span className="text-sm text-slate-500">análisis generados</span>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Análisis automático por monitor activo
          </p>
        </Card>
      </div>

      {incidents.open > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4" />
          Hay {incidents.open} incidencia(s) activa(s). Revisa la sección Incidentes.
        </div>
      )}

      <p className="text-right text-xs text-slate-600">
        Generado a las {formatTime(data.generatedAt)}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold tabular-nums text-slate-100">{value}</span>
    </li>
  );
}