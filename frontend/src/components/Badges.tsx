import type { CriticalityLevel, IncidentStatus, ServiceStatus } from "../api/types";

const SERVICE_STYLES: Record<ServiceStatus, string> = {
  UP: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  DOWN: "bg-red-500/15 text-red-400 border-red-500/30",
  DEGRADED: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  PENDING: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const SERVICE_LABELS: Record<ServiceStatus, string> = {
  UP: "Operativo",
  DOWN: "Caído",
  DEGRADED: "Degradado",
  PENDING: "Pendiente",
};

const CRITICALITY_STYLES: Record<CriticalityLevel, string> = {
  LOW: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  MEDIUM: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  HIGH: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  CRITICAL: "bg-red-500/15 text-red-400 border-red-500/30",
};

const INCIDENT_STYLES: Record<IncidentStatus, string> = {
  OPEN: "bg-red-500/15 text-red-400 border-red-500/30",
  RESOLVED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  IGNORED: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

export function StatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${SERVICE_STYLES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {SERVICE_LABELS[status]}
    </span>
  );
}

export function CriticalityBadge({ level }: { level: CriticalityLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase ${CRITICALITY_STYLES[level]}`}
    >
      {level}
    </span>
  );
}

export function IncidentBadge({ status }: { status: IncidentStatus }) {
  const label =
    status === "OPEN" ? "Abierto" : status === "RESOLVED" ? "Resuelto" : "Ignorado";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${INCIDENT_STYLES[status]}`}
    >
      {label}
    </span>
  );
}