import { useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { apiFetch } from "../api/client";
import type { Bucket, DashboardMetrics, Window } from "../api/types";
import { usePolling } from "../hooks/usePolling";
import { Card, Stat } from "../components/Card";
import { UpdateIndicator } from "../components/UpdateIndicator";
import { EmptyState, ErrorMessage, Spinner } from "../components/Feedback";
import { formatMs, formatPercent } from "../utils/format";

const WINDOWS: { value: Window; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
];

const BUCKETS: { value: Bucket; label: string }[] = [
  { value: "5m", label: "5 min" },
  { value: "1h", label: "1 hora" },
  { value: "6h", label: "6 horas" },
  { value: "1d", label: "1 día" },
];

export function MetricsPage() {
  const [window, setWindow] = useState<Window>("24h");
  const [bucket, setBucket] = useState<Bucket>("1h");
  const { data, error, loading, lastUpdated } = usePolling<DashboardMetrics>(
    () =>
      apiFetch<DashboardMetrics>(
        `/api/v1/dashboard/metrics?window=${window}&bucket=${bucket}`,
      ),
    30_000,
    [window, bucket],
  );

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorMessage message={error} />;
  if (!data) return <EmptyState message="Sin datos de métricas." />;

  const { overall, buckets } = data;
  const chartData = buckets.map((b) => ({
    label: new Date(b.bucket).toLocaleString("es-ES", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    disponibilidad: b.availability,
    "respuesta media": b.avgResponseTime ?? 0,
    "p95": b.p95ResponseTime ?? 0,
  }));

  const availValues = chartData.map((d) => d.disponibilidad);
  const availMin = availValues.length ? Math.min(...availValues) : 100;
  const yMin = Math.min(95, availMin);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Métricas</h1>
          <p className="text-sm text-slate-500">Evolución de disponibilidad y latencia</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <UpdateIndicator lastUpdated={lastUpdated} />
          <div className="flex gap-2">
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
          <div className="flex overflow-hidden rounded-lg border border-slate-700 text-sm">
            {BUCKETS.map((b) => (
              <button
                key={b.value}
                type="button"
                onClick={() => setBucket(b.value)}
                className={`px-3 py-1.5 transition-colors ${
                  bucket === b.value
                    ? "bg-indigo-500 text-white"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label="Disponibilidad"
          value={formatPercent(overall.availability)}
          hint={`${overall.checks.toLocaleString("es-ES")} checks`}
          tone={overall.availability >= 99 ? "good" : overall.availability >= 95 ? "warn" : "bad"}
        />
        <Stat
          label="Respuesta media"
          value={formatMs(overall.avgResponseTime)}
          hint="última ventana"
        />
        <Stat
          label="P95 respuesta"
          value={formatMs(overall.p95ResponseTime)}
          hint="percentil 95"
        />
        <Stat
          label="Estado UP"
          value={overall.byState.UP}
          hint={`DOWN ${overall.byState.DOWN} · DEGRADED ${overall.byState.DEGRADED}`}
        />
      </div>

      {chartData.length > 0 ? (
        <>
          <Card title="Disponibilidad" icon={<BarChart3 className="h-4 w-4" />}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillAvail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} tickMargin={6} />
                <YAxis domain={[yMin, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
                  labelStyle={{ color: "#e2e8f0" }}
                  formatter={(value) => [`${value}%`, "Disponibilidad"]}
                />
                <Area type="monotone" dataKey="disponibilidad" stroke="#22d3ee" fill="url(#fillAvail)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Latencia" subtitle="Media y P95 (ms)" icon={<BarChart3 className="h-4 w-4" />}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} tickMargin={6} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
                  labelStyle={{ color: "#e2e8f0" }}
                  formatter={(value) => formatMs(Number(value))}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: "#cbd5e1" }} iconType="plainline" />
                <Line
                  name="Respuesta media"
                  type="monotone"
                  dataKey="respuesta media"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  name="P95"
                  type="monotone"
                  dataKey="p95"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      ) : (
        <EmptyState message="No hay datos de métricas en esta ventana." />
      )}
    </div>
  );
}