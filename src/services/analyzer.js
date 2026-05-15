export const analyzeStatus = (currentCheck, lastRecord) => {
  const currentState = currentCheck.online ? "UP" : "DOWN";

  const previousState = lastRecord ? lastRecord.state : "UP";

  let currentTrend = "";

  if (previousState === "UP" && currentState === "UP") {
    currentTrend = "STABLE";
  } else if (previousState === "UP" && currentState === "DOWN") {
    currentTrend = "DROP_DETECTED";
  } else if (previousState === "DOWN" && currentState === "UP") {
    currentTrend = "RECOVERED";
  } else if (previousState === "DOWN" && currentState === "DOWN") {
    currentTrend = "OFFLINE";
  }
  
  const codes = {
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

  const statusInfo = codes[Number(currentCheck.status)] || {
    message: "Unknown code",
    details: `The code was received ${currentCheck.status}.`,
  };

  return {
    url: currentCheck.url,
    status: currentCheck.status,
    message: statusInfo.message,
    details: statusInfo.details,
    trend: currentTrend,
    responseTime: responseTime,
    state: currentState,
    error: currentCheck.error,
  };
};
