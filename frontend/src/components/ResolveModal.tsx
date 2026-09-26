import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { ApiError, resolveIncident } from "../api/client";
import type { OperationalIncident } from "../api/types";

export function ResolveModal({
  incident,
  onClose,
  onResolved,
}: {
  incident: OperationalIncident;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [rootCause, setRootCause] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await resolveIncident(incident.id, { rootCause, actionTaken });
      onResolved();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Error al registrar la resolución",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              {incident.resolvedAt ? "Registrar solución" : "Resolver incidente"}
            </h2>
            <p className="text-xs text-slate-500">
              {incident.monitor.name} · #{incident.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {incident.resolvedAt && (
            <div className="rounded-lg border border-slate-600/40 bg-slate-800/40 px-3 py-2.5 text-sm text-slate-300">
              El incidente ya cerró al recuperarse el servicio. La solución
              quedará registrada como contexto histórico para futuros
              incidentes.
            </div>
          )}

          {incident.aiInsight?.suggestion && (
            <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2.5 text-sm text-indigo-200">
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-300">
                Sugerencia IA
              </p>
              <p className="mt-1">{incident.aiInsight.suggestion}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="resolve-rootcause"
              className="mb-1 block text-xs font-medium text-slate-400"
            >
              Causa raíz
            </label>
            <textarea
              id="resolve-rootcause"
              required
              rows={2}
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              placeholder="¿Qué provocó la caída?"
            />
          </div>
          <div>
            <label
              htmlFor="resolve-action"
              className="mb-1 block text-xs font-medium text-slate-400"
            >
              Acción tomada
            </label>
            <textarea
              id="resolve-action"
              required
              rows={3}
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              placeholder="¿Qué se hizo para volver a dejar el servicio en línea?"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:opacity-60"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Resolviendo…
                </span>
              ) : (
                "Registrar resolución"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}