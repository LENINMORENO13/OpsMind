import emitter from "../events/emitter.js";
import { processIncidentInsight } from "./ai.service.js";
import { getRecentIncidentsContext } from "./incident.service.js";
import { formatHistoricalIncidents } from "../utils/prompt-formatters.util.js";

emitter.on("incident-opened", async (payload) => {
  try {
    const recentIncidents = await getRecentIncidentsContext(payload.monitorId);
    const historicalContext = formatHistoricalIncidents(recentIncidents);

    await processIncidentInsight({
      ...payload,
      historicalContext,
    });
  } catch (error) {
    console.error("Critical error in the AI background process:", error);
  }
});
