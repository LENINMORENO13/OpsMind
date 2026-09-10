const MAX_ERROR_DETAILS_LENGTH = 500;
const TRUNCATION_SUFFIX = "...";

interface HistoricalIncidentInput {
  errorDetails: string | null;
  downtime: number | null;
  aiInsight: {
    analysis: string;
    suggestion: string | null;
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
    error_description: truncateErrorDetails(incident.errorDetails),
    downtime_minutes: incident.downtime,
    ai_analysis: incident.aiInsight?.analysis ?? null,
    ai_suggestion: incident.aiInsight?.suggestion ?? null,
  }));
  return JSON.stringify(formatted);
};
