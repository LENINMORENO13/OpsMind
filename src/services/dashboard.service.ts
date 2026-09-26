import prisma from "../lib/prisma.js";
import { Prisma } from "@prisma/client";

export type Window = "24h" | "7d" | "30d" | "90d";
export type Bucket = "5m" | "1h" | "6h" | "1d";

interface BucketRow {
  bucket: Date;
  checks: bigint;
  up: bigint;
  down: bigint;
  degraded: bigint;
  pending: bigint;
  avg_response_time: number | null;
  p95_response_time: number | null;
}

const WINDOW_MS: Record<Window, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

const BUCKET_EXPR: Record<Bucket, string> = {
  "5m": `date_trunc('minute', "timestamp") - (extract(minute from "timestamp")::int % 5) * interval '1 minute'`,
  "1h": `date_trunc('hour', "timestamp")`,
  "6h": `date_trunc('hour', "timestamp") - (extract(hour from "timestamp")::int % 6) * interval '1 hour'`,
  "1d": `date_trunc('day', "timestamp")`,
};

const sinceOf = (window: Window): Date => {
  const from = new Date();
  return new Date(from.getTime() - WINDOW_MS[window]);
};

const pct = (part: bigint | number, total: bigint | number): number => {
  const p = Number(part);
  const t = Number(total);
  if (t <= 0) return 0;
  return Math.round((p / t) * 10000) / 100;
};

const toNumber = (v: bigint | number | null | undefined): number =>
  v === null || v === undefined ? 0 : Number(v);

export async function getDashboardSummary() {
  const since24h = sinceOf("24h");
  const now = new Date();

  const [monitorStatus, incidentsOpen, resolved24h, resolved7d, resolved30d, mttr, logsAgg24h, logsByState24h, insightsRecent] =
    await Promise.all([
      prisma.monitor.groupBy({
        by: ["lastStatus"],
        _count: { _all: true },
      }),
      prisma.incident.count({ where: { status: "OPEN" } }),
      prisma.incident.count({
        where: { status: "RESOLVED", resolvedAt: { gte: since24h } },
      }),
      prisma.incident.count({
        where: { status: "RESOLVED", resolvedAt: { gte: sinceOf("7d") } },
      }),
      prisma.incident.count({
        where: { status: "RESOLVED", resolvedAt: { gte: sinceOf("30d") } },
      }),
      prisma.incident.aggregate({
        _avg: { downtime: true },
        where: { status: "RESOLVED", downtime: { not: null } },
      }),
      prisma.log.aggregate({
        _count: { _all: true },
        _avg: { responseTime: true },
        _max: { timestamp: true },
        where: { timestamp: { gte: since24h } },
      }),
      prisma.log.groupBy({
        by: ["state"],
        _count: { _all: true },
        where: { timestamp: { gte: since24h } },
      }),
      prisma.aIInsight.count(),
    ]);

  const monitorCount = {
    UP: 0,
    DOWN: 0,
    DEGRADED: 0,
    PENDING: 0,
  };
  for (const row of monitorStatus) {
    monitorCount[row.lastStatus] = toNumber(row._count._all);
  }

  const stateCounts = {
    UP: 0,
    DOWN: 0,
    DEGRADED: 0,
    PENDING: 0,
  };
  for (const row of logsByState24h) {
    stateCounts[row.state] = toNumber(row._count._all);
  }

  const totalChecks24h =
    stateCounts.UP + stateCounts.DOWN + stateCounts.DEGRADED;
  const availability24h = pct(stateCounts.UP, totalChecks24h);

  return {
    generatedAt: now.toISOString(),
    monitors: {
      total: await prisma.monitor.count(),
      byStatus: monitorCount,
    },
    incidents: {
      open: incidentsOpen,
      resolved24h,
      resolved7d,
      resolved30d,
      mttrMinutes: mttr._avg.downtime ?? null,
      mttr24h:
        (
          await prisma.incident.aggregate({
            _avg: { downtime: true },
            where: {
              status: "RESOLVED",
              downtime: { not: null },
              resolvedAt: { gte: since24h },
            },
          })
        )._avg.downtime ?? null,
    },
    logs24h: {
      checks: logsAgg24h._count._all ?? 0,
      byState: stateCounts,
      availability24h,
      avgResponseTime: logsAgg24h._avg.responseTime ?? null,
      lastCheckedAt: logsAgg24h._max.timestamp
        ? logsAgg24h._max.timestamp.toISOString()
        : null,
    },
    insights: {
      total: insightsRecent,
    },
  };
}

export async function getOperationalMonitors(params?: {
  includeInactive?: boolean;
  limit?: number;
}) {
  const includeInactive = params?.includeInactive ?? false;
  const limit = params?.limit ?? 50;
  const since24h = sinceOf("24h");

  const monitors = await prisma.monitor.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  if (monitors.length === 0) return [];

  const monitorIds = monitors.map((m) => m.id);

  const [openIncidentsByMonitor, logsByStateByMonitor, latestLogs] =
    await Promise.all([
      prisma.incident.groupBy({
        by: ["monitorId"],
        _count: { _all: true },
        where: { status: "OPEN", monitorId: { in: monitorIds } },
      }),
      prisma.log.groupBy({
        by: ["monitorId", "state"],
        _count: { _all: true },
        where: { timestamp: { gte: since24h }, monitorId: { in: monitorIds } },
      }),
      prisma.log.findMany({
        where: { monitorId: { in: monitorIds } },
        orderBy: { timestamp: "desc" },
        distinct: ["monitorId"],
        select: {
          monitorId: true,
          state: true,
          trend: true,
          responseTime: true,
          timestamp: true,
        },
      }),
    ]);

  const openCountMap = new Map(
    openIncidentsByMonitor.map((r) => [r.monitorId, toNumber(r._count._all)]),
  );

  const logsMap = new Map<string, { UP: number; DOWN: number; DEGRADED: number; PENDING: number }>();
  for (const row of logsByStateByMonitor) {
    const entry = logsMap.get(String(row.monitorId)) ?? {
      UP: 0,
      DOWN: 0,
      DEGRADED: 0,
      PENDING: 0,
    };
    entry[row.state] = toNumber(row._count._all);
    logsMap.set(String(row.monitorId), entry);
  }

  const latestByMonitor = new Map(
    latestLogs.map((l) => [String(l.monitorId), l]),
  );

  const statusPriority: Record<string, number> = {
    DOWN: 0,
    DEGRADED: 1,
    PENDING: 2,
    UP: 3,
  };

  return monitors
    .map((m) => {
      const counts = logsMap.get(String(m.id)) ?? {
        UP: 0,
        DOWN: 0,
        DEGRADED: 0,
        PENDING: 0,
      };
      const total24h = counts.UP + counts.DOWN + counts.DEGRADED;
      const latest = latestByMonitor.get(String(m.id));

      return {
        id: m.id,
        name: m.name,
        url: m.url,
        isActive: m.isActive,
        checkInterval: m.checkInterval,
        lastStatus: m.lastStatus,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
        openIncidents: openCountMap.get(m.id) ?? 0,
        checks24h: total24h,
        availability24h: pct(counts.UP, total24h),
        down24h: counts.DOWN,
        degraded24h: counts.DEGRADED,
        avgResponseTime24h: null as number | null,
        lastChecked: latest
          ? {
              state: latest.state,
              trend: latest.trend,
              responseTime: latest.responseTime,
              timestamp: latest.timestamp.toISOString(),
            }
          : null,
      };
    })
    .sort(
      (a, b) =>
        (statusPriority[a.lastStatus] ?? 9) -
        (statusPriority[b.lastStatus] ?? 9),
    );
}

export async function getOperationalIncidents(params?: {
  window?: Window;
  monitorId?: number;
  limit?: number;
}) {
  const window = params?.window ?? "24h";
  const monitorId = params?.monitorId;
  const limit = params?.limit ?? 20;
  const since = sinceOf(window);

  const incidents = await prisma.incident.findMany({
    where: {
      OR: [
        { status: "OPEN" },
        { startedAt: { gte: since } },
      ],
      ...(monitorId ? { monitorId } : {}),
    },
    include: {
      monitor: { select: { id: true, name: true, url: true, lastStatus: true } },
      aiInsight: {
        select: {
          id: true,
          analysis: true,
          suggestion: true,
          criticality: true,
          historicalAnalysis: true,
          createdAt: true,
        },
      },
      resolutionLog: {
        select: {
          id: true,
          rootCause: true,
          actionTaken: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { startedAt: "desc" }],
    take: limit,
  });

  return incidents.map((i) => ({
    id: i.id,
    status: i.status,
    startedAt: i.startedAt.toISOString(),
    resolvedAt: i.resolvedAt ? i.resolvedAt.toISOString() : null,
    downtime: i.downtime,
    errorDetails: i.errorDetails,
    monitor: i.monitor,
    aiInsight: i.aiInsight
      ? {
          id: i.aiInsight.id,
          analysis: i.aiInsight.analysis,
          suggestion: i.aiInsight.suggestion,
          criticality: i.aiInsight.criticality,
          historicalAnalysis: i.aiInsight.historicalAnalysis,
          createdAt: i.aiInsight.createdAt.toISOString(),
        }
      : null,
    resolutionLog: i.resolutionLog
      ? {
          id: i.resolutionLog.id,
          rootCause: i.resolutionLog.rootCause,
          actionTaken: i.resolutionLog.actionTaken,
          createdAt: i.resolutionLog.createdAt.toISOString(),
        }
      : null,
  }));
}

export async function getDashboardMetrics(params: {
  window?: Window;
  bucket?: Bucket;
  monitorId?: number;
}) {
  const window = params.window ?? "24h";
  const bucket = params.bucket ?? "1h";
  const monitorId = params.monitorId;
  const since = sinceOf(window);

  const whereSql = monitorId
    ? Prisma.sql`AND "monitorId" = ${monitorId}`
    : Prisma.sql``;

  const overall = await prisma.log.aggregate({
    _count: { _all: true },
    _avg: { responseTime: true },
    _max: { timestamp: true },
    where: {
      timestamp: { gte: since },
      ...(monitorId ? { monitorId } : {}),
    },
  });

  const overallByState = await prisma.log.groupBy({
    by: ["state"],
    _count: { _all: true },
    where: {
      timestamp: { gte: since },
      ...(monitorId ? { monitorId } : {}),
    },
  });

  const overallStates = { UP: 0, DOWN: 0, DEGRADED: 0, PENDING: 0 };
  for (const row of overallByState) {
    overallStates[row.state] = toNumber(row._count._all);
  }
  const overallChecks =
    overallStates.UP + overallStates.DOWN + overallStates.DEGRADED;

  const rows = await prisma.$queryRaw<BucketRow[]>`
    SELECT
      ${Prisma.raw(BUCKET_EXPR[bucket])} AS bucket,
      COUNT(*)::bigint AS checks,
      COUNT(*) FILTER (WHERE "state" = 'UP')::bigint AS up,
      COUNT(*) FILTER (WHERE "state" = 'DOWN')::bigint AS down,
      COUNT(*) FILTER (WHERE "state" = 'DEGRADED')::bigint AS degraded,
      COUNT(*) FILTER (WHERE "state" = 'PENDING')::bigint AS pending,
      AVG("responseTime") AS avg_response_time,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY "responseTime") AS p95_response_time
    FROM "Log"
    WHERE "timestamp" >= ${since}
    ${whereSql}
    GROUP BY ${Prisma.raw(BUCKET_EXPR[bucket])}
    ORDER BY bucket ASC
  `;

  return {
    window,
    bucket,
    monitorId: monitorId ?? null,
    overall: {
      checks: overall._count._all ?? 0,
      byState: overallStates,
      availability: pct(overallStates.UP, overallChecks),
      avgResponseTime: overall._avg.responseTime ?? null,
      p95ResponseTime: rows.length
        ? toNumber(rows[rows.length - 1].p95_response_time)
        : null,
      lastCheckedAt: overall._max.timestamp
        ? overall._max.timestamp.toISOString()
        : null,
    },
    buckets: rows.map((r) => ({
      bucket: r.bucket instanceof Date ? r.bucket.toISOString() : String(r.bucket),
      checks: toNumber(r.checks),
      byState: {
        UP: toNumber(r.up),
        DOWN: toNumber(r.down),
        DEGRADED: toNumber(r.degraded),
        PENDING: toNumber(r.pending),
      },
      availability: pct(r.up, r.checks),
      avgResponseTime: r.avg_response_time,
      p95ResponseTime: r.p95_response_time,
    })),
  };
}

export async function getRecentInsights(limit = 20) {
  const take = Math.min(Math.max(limit, 1), 50);

  const insights = await prisma.aIInsight.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: {
      incident: {
        select: {
          id: true,
          status: true,
          startedAt: true,
          resolvedAt: true,
          downtime: true,
          errorDetails: true,
          monitor: { select: { id: true, name: true, url: true } },
        },
      },
    },
  });

  return insights.map((i) => ({
    id: i.id,
    analysis: i.analysis,
    suggestion: i.suggestion,
    criticality: i.criticality,
    historicalAnalysis: i.historicalAnalysis,
    createdAt: i.createdAt.toISOString(),
    incident: i.incident
      ? {
          id: i.incident.id,
          status: i.incident.status,
          startedAt: i.incident.startedAt.toISOString(),
          resolvedAt: i.incident.resolvedAt
            ? i.incident.resolvedAt.toISOString()
            : null,
          downtime: i.incident.downtime,
          errorDetails: i.incident.errorDetails,
          monitor: i.incident.monitor,
        }
      : null,
  }));
}