import { ServiceStatus, TrendStatus } from "@prisma/client";

export interface CurrentCheck {
  url: string;
  online: boolean;
  status: number;
  responseTime: number;
  error: string | null;
}

export interface LastRecord {
  state: ServiceStatus;
}

export interface StatusInfo {
  message: string;
  details: string;
}

export interface AnalysisResult {
  url: string;
  status: number;
  message: string;
  details: string;
  trend: TrendStatus;
  responseTime: number;
  state: ServiceStatus;
  error: string | null;
}

const STATUS_CODE: Record<number, StatusInfo> = {
  200: {
    message: "OK - Service Operational",
    details: "Successful response. The service responded correctly.",
  },
  404: {
    message: "Resource Not Found",
    details: "Error 404: The requested resource could not be found.",
  },
  500: {
    message: "Internal Server Error",
    details: "Error 500: The target server encountered an error or failed.",
  },
  0: {
    message: "No Response",
    details: "The service did not respond or there is a connection timeout.",
  },
};

//Tabla de transicion de estados
const TREND_MATRIX: Record<
  ServiceStatus,
  Record<ServiceStatus, TrendStatus>
> = {
  [ServiceStatus.PENDING]: {
    [ServiceStatus.PENDING]: TrendStatus.STABLE,
    [ServiceStatus.UP]: TrendStatus.STABLE,
    [ServiceStatus.DEGRADED]: TrendStatus.STABLE,
    [ServiceStatus.DOWN]: TrendStatus.OFFLINE,
  },
  [ServiceStatus.UP]: {
    [ServiceStatus.PENDING]: TrendStatus.STABLE,
    [ServiceStatus.UP]: TrendStatus.STABLE,
    [ServiceStatus.DEGRADED]: TrendStatus.DROP_DETECTED,
    [ServiceStatus.DOWN]: TrendStatus.DROP_DETECTED,
  },
  [ServiceStatus.DEGRADED]: {
    [ServiceStatus.PENDING]: TrendStatus.STABLE,
    [ServiceStatus.UP]: TrendStatus.RECOVERED,
    [ServiceStatus.DEGRADED]: TrendStatus.STABLE,
    [ServiceStatus.DOWN]: TrendStatus.DROP_DETECTED,
  },
  [ServiceStatus.DOWN]: {
    [ServiceStatus.PENDING]: TrendStatus.OFFLINE,
    [ServiceStatus.UP]: TrendStatus.RECOVERED,
    [ServiceStatus.DEGRADED]: TrendStatus.RECOVERED,
    [ServiceStatus.DOWN]: TrendStatus.OFFLINE,
  },
};

export const analyzeStatus = (
  currentCheck: CurrentCheck,
  lastRecord: LastRecord | null,
): AnalysisResult => {
  let currentState: ServiceStatus = ServiceStatus.PENDING;

  if (!currentCheck.online) {
    currentState = ServiceStatus.DOWN;
  } else if (currentCheck.responseTime > 1500) {
    currentState = ServiceStatus.DEGRADED;
  } else {
    currentState = ServiceStatus.UP;
  }

  const previousState: ServiceStatus = lastRecord
    ? lastRecord.state
    : ServiceStatus.PENDING;

  let currentTrend = TREND_MATRIX[previousState][currentState];


  const statusInfo = STATUS_CODE[currentCheck.status] || {
    message: "Unknown code",
    details: `The code was received ${currentCheck.status}.`,
  };

  return {
    url: currentCheck.url,
    status: currentCheck.status,
    message: statusInfo.message,
    details: statusInfo.details,
    trend: currentTrend,
    responseTime: currentCheck.responseTime,
    state: currentState,
    error: currentCheck.error,
  };
};
