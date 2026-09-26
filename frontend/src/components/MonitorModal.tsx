import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { createMonitor, updateMonitor, ApiError } from "../api/client";
import type { Monitor, MonitorInput } from "../api/types";

export function MonitorModal({
  mode,
  monitor,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  monitor?: Monitor;
  onClose: () => void;
  onSaved: (m: Monitor) => void;
}) {
  const [name, setName] = useState(monitor?.name ?? "");
  const [url, setUrl] = useState(monitor?.url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const input: MonitorInput = { name, url };
      const result =
        mode === "create"
          ? await createMonitor(input)
          : await updateMonitor(monitor!.id, input);
      onSaved(result);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Error al guardar el monitor",
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
          <h2 className="text-sm font-semibold text-slate-100">
            {mode === "create" ? "Nuevo monitor" : "Editar monitor"}
          </h2>
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
          <div>
            <label htmlFor="monitor-name" className="mb-1 block text-xs font-medium text-slate-400">
              Nombre
            </label>
            <input
              id="monitor-name"
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              placeholder="API de producción"
            />
          </div>
          <div>
            <label htmlFor="monitor-url" className="mb-1 block text-xs font-medium text-slate-400">
              URL
            </label>
            <input
              id="monitor-url"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              placeholder="https://api.ejemplo.com"
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
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:opacity-60"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Guardando…
                </span>
              ) : mode === "create" ? (
                "Crear"
              ) : (
                "Guardar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}