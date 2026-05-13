import { save, getHistory } from "../services/historyService.js";
import axios from "axios";

export const check = async (url) => {
  let responseTime;
  const start = Date.now();
  const history = await getHistory(url);
  const lastRecord = history && history.length > 0 ? history[0] : null;
  const lastTrend = lastRecord ? lastRecord.trend : "STABLE";
  let currentTrend;

  try {
    const response = await axios.get(url);
    responseTime = Date.now() - start;
    const state = "UP";

    currentTrend =
      lastTrend === "OFFLINE" || lastTrend === "DROP_DETECTED"
        ? "RECOVERED"
        : "STABLE";

    await save(url, response.status, state, currentTrend, responseTime, null);
    return {
      url: url,
      online: response.status >= 200 && response.status < 300,
      status: response.status,
      state,
      responseTime,
      trend: currentTrend,
    };
  } catch (error) {
    responseTime = Date.now() - start;

    const state = "DOWN";

    currentTrend =
      lastTrend === "STABLE" || lastTrend === "RECOVERED"
        ? "DROP_DETECTED"
        : "OFFLINE";

    await save(
      url,
      error.response ? error.response.status : 0,
      state,
      currentTrend,
      responseTime,
      error.message,
    );
    return {
      url: url,
      online: false,
      status: error.response ? error.response.status : 0,
      responseTime,
      trend: currentTrend,
    };
  }
};
