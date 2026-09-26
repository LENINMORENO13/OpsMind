import { useState } from "react";
import { Pencil, Plus, Server, Trash2 } from "lucide-react";
import { apiFetch, deleteMonitor, ApiError } from "../api/client";
import type { Monitor, OperationalMonitor } from "../api/types";
import { usePolling } from "../hooks/usePolling";
import { Card } from "../components/Card";
import { StatusBadge } from "../components/Badges";
import { UpdateIndicator } from "../components/UpdateIndicator";
import { EmptyState, ErrorMessage, Spinner } from "../components/Feedback";
import { MonitorModal } from "../components/MonitorModal";
import { formatMs, formatPercent, formatRelative } from "../utils/format";

export function MonitorsPage() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; monitor: OperationalMonitor } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { data, error, loading, lastUpdated, refresh } = usePolling<OperationalMonitor[]>(
    () =>
      apiFetch<OperationalMonitor[]>(
        `/api/v1/dashboard/monitors?includeInactive=${includeInactive}&limit=100`,
      ),
    30_000,
    [includeInactive],
  );

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorMessage message={error} />;

  const monitors = data ?? [];

  const handleSaved = () => {
    setModal(null);
    refresh();
  };

  const handleDelete = async (m: OperationalMonitor) => {
    if (!window.confirm(`¿Eliminar el monitor "${m.name}"?`)) return;
    setDeleteError(null);
    try {
      await deleteMonitor(m.id);
      refresh();
    } catch (err) {
      setDeleteError(
        err instanceof ApiError ? err.message : "Error al eliminar el monitor",
      );
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Monitores</h1>
          <p className="text-sm text-slate-500">
            Estado operativo con métricas de las últimas 24h
          </p>
        </div>
        <div className="flex items-center gap-4">
          <UpdateIndicator lastUpdated={lastUpdated} />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
            />
            Incluir inactivos
          </label>
          <button
            type="button"
            onClick={() => setModal({ mode: "create" })}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
          >
            <Plus className="h-4 w-4" />
            Nuevo monitor
          </button>
        </div>
      </header>

      {deleteError && <ErrorMessage message={deleteError} />}

      {monitors.length === 0 ? (
        <EmptyState message="No hay monitores configurados. Crea el primero." />
      ) : (
        <Card
          title={`${monitors.length} monitores`}
          icon={<Server className="h-4 w-4" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-3 pr-4 font-medium">Monitor</th>
                  <th className="pb-3 pr-4 font-medium">Estado</th>
                  <th className="pb-3 pr-4 font-medium">Disponibilidad 24h</th>
                  <th className="pb-3 pr-4 font-medium">Respuesta media</th>
                  <th className="pb-3 pr-4 font-medium">Incidentes</th>
                  <th className="pb-3 pr-4 font-medium">Última verificación</th>
                  <th className="pb-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {monitors.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-slate-800/30">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-100">
                        {m.name}
                        {!m.isActive && (
                          <span className="ml-2 rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] uppercase text-slate-300">
                            inactivo
                          </span>
                        )}
                      </p>
                      <p className="max-w-[280px] truncate text-xs text-slate-500" title={m.url}>
                        {m.url}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={m.lastStatus} />
                    </td>
                    <td className="py-3 pr-4 tabular-nums">
                      <span
                        className={
                          m.availability24h >= 99
                            ? "text-emerald-400"
                            : m.availability24h >= 95
                              ? "text-amber-400"
                              : "text-red-400"
                        }
                      >
                        {formatPercent(m.availability24h)}
                      </span>
                      <span className="ml-2 text-xs text-slate-600">
                        ({m.checks24h})
                      </span>
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-slate-300">
                      {formatMs(m.avgResponseTime24h ?? m.lastChecked?.responseTime)}
                    </td>
                    <td className="py-3 pr-4">
                      {m.openIncidents > 0 ? (
                        <span className="font-semibold text-red-400">{m.openIncidents} abierto</span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-slate-400">
                      {m.lastChecked
                        ? `${formatMS(m.lastChecked.responseTime)} · ${formatRelative(m.lastChecked.timestamp)}`
                        : "Sin verificaciones"}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setModal({ mode: "edit", monitor: m })}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-indigo-500/10 hover:text-indigo-300"
                          aria-label={`Editar ${m.name}`}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(m)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                          aria-label={`Eliminar ${m.name}`}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {modal && (
        <MonitorModal
          mode={modal.mode}
          monitor={modal.mode === "edit" ? toMonitor(modal.monitor) : undefined}
          onClose={() => setModal(null)}
          onSaved={() => handleSaved()}
        />
      )}
    </div>
  );
}

function toMonitor(m: OperationalMonitor): Monitor {
  return {
    id: m.id,
    name: m.name,
    url: m.url,
    isActive: m.isActive,
    checkInterval: m.checkInterval,
    lastStatus: m.lastStatus,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

function formatMS(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}