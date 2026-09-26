export type ServiceStatus = "UP" | "DOWN" | "DEGRADED" | "PENDING";
export type TrendStatus = "RECOVERED" | "DROP_DETECTED" | "STABLE" | "OFFLINE";
export type CriticalityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentStatus = "OPEN" | "RESOLVED" | "IGNORED";
export type Window = "24h" | "7d" | "30d" | "90d";
export type Bucket = "5m" | "1h" | "6h" | "1d";

export interface Monitor {
  id: number;
  name: string;
  url: string;
  isActive: boolean;
  checkInterval: number;
  lastStatus: ServiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MonitorInput {
  name: string;
  url: string;
}

export interface ResolveIncidentInput {
  rootCause: string;
  actionTaken: string;
}

export interface ResolveIncidentResult {
  incident: {
    id: number;
    status: IncidentStatus;
    resolvedAt: string | null;
    downtime: number | null;
  };
  resolutionLog: {
    id: number;
    rootCause: string;
    actionTaken: string;
    createdAt: string;
  };
  closedNow: boolean;
}

export interface DashboardSummary {
  generatedAt: string;
  monitors: {
    total: number;
    byStatus: Record<ServiceStatus, number>;
  };
  incidents: {
    open: number;
    resolved24h: number;
    resolved7d: number;
    resolved30d: number;
    mttrMinutes: number | null;
    mttr24h: number | null;
  };
  logs24h: {
    checks: number;
    byState: Record<ServiceStatus, number>;
    availability24h: number;
    avgResponseTime: number | null;
    lastCheckedAt: string | null;
  };
  insights: {
    total: number;
  };
}

export interface OperationalMonitor {
  id: number;
  name: string;
  url: string;
  isActive: boolean;
  checkInterval: number;
  lastStatus: ServiceStatus;
  createdAt: string;
  updatedAt: string;
  openIncidents: number;
  checks24h: number;
  availability24h: number;
  down24h: number;
  degraded24h: number;
  avgResponseTime24h: number | null;
  lastChecked: {
    state: ServiceStatus;
    trend: TrendStatus;
    responseTime: number;
    timestamp: string;
  } | null;
}

export interface OperationalIncident {
  id: number;
  status: IncidentStatus;
  startedAt: string;
  resolvedAt: string | null;
  downtime: number | null;
  errorDetails: string | null;
  monitor: {
    id: number;
    name: string;
    url: string;
    lastStatus: ServiceStatus;
  };
  aiInsight: {
    id: number;
    analysis: string;
    suggestion: string | null;
    criticality: CriticalityLevel;
    historicalAnalysis: string | null;
    createdAt: string;
  } | null;
  resolutionLog: {
    id: number;
    rootCause: string;
    actionTaken: string;
    createdAt: string;
  } | null;
}

export interface MetricsBucket {
  bucket: string;
  checks: number;
  byState: Record<ServiceStatus, number>;
  availability: number;
  avgResponseTime: number | null;
  p95ResponseTime: number | null;
}

export interface DashboardMetrics {
  window: Window;
  bucket: Bucket;
  monitorId: number | null;
  overall: {
    checks: number;
    byState: Record<ServiceStatus, number>;
    availability: number;
    avgResponseTime: number | null;
    p95ResponseTime: number | null;
    lastCheckedAt: string | null;
  };
  buckets: MetricsBucket[];
}

export interface Insight {
  id: number;
  analysis: string;
  suggestion: string | null;
  criticality: CriticalityLevel;
  historicalAnalysis: string | null;
  createdAt: string;
  incident: {
    id: number;
    status: IncidentStatus;
    startedAt: string;
    resolvedAt: string | null;
    downtime: number | null;
    errorDetails: string | null;
    monitor: { id: number; name: string; url: string };
  } | null;
}