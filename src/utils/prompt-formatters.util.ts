const MAX_ERROR_DETAILS_LENGTH = 500;
const TRUNCATION_SUFFIX = "...";
const NO_AI_ANALYSIS_MESSAGE =
  "No se generó análisis de IA para este incidente.";
const NO_AI_SUGGESTION_MESSAGE = "Sin recomendación técnica disponible.";

interface HistoricalIncidentInput {
  id: number;
  errorDetails: string | null;
  downtime: number | null;
  aiInsight: {
    analysis: string;
    suggestion: string | null;
  } | null;
  resolutionLog: {
    rootCause: string;
    actionTaken: string;
  } | null;
}

const truncateErrorDetails = (errorDetails: string | null): string | null => {
  if (!errorDetails || errorDetails.length <= MAX_ERROR_DETAILS_LENGTH) {
    return errorDetails;
  }
  return `${errorDetails.slice(0, MAX_ERROR_DETAILS_LENGTH - TRUNCATION_SUFFIX.length)}${TRUNCATION_SUFFIX}`;
};

export const formatHistoricalIncidents = (
  incidents: HistoricalIncidentInput[],
): string | null => {
  if (incidents.length === 0) return null;

  const formatted = incidents.map((incident) => ({
    id: incident.id,
    error_description: truncateErrorDetails(incident.errorDetails),
    downtime_minutes: incident.downtime,
    ai_analysis: incident.aiInsight?.analysis ?? NO_AI_ANALYSIS_MESSAGE,
    ai_suggestion: incident.aiInsight?.suggestion ?? NO_AI_SUGGESTION_MESSAGE,
    human_verified_resolution: incident.resolutionLog
      ? {
          root_cause: incident.resolutionLog.rootCause,
          action_taken: incident.resolutionLog.actionTaken,
        }
      : null,
  }));
  return JSON.stringify(formatted);
};
