import emitter from "../events/emitter.js";
import { processIncidentInsight } from "./ai.service.js";

emitter.on("incident-opened", async (payload) => {
  try {
    await processIncidentInsight(payload);
  } catch (error) {
    console.error("Critical error in the AI background process:", error);
  }
});
