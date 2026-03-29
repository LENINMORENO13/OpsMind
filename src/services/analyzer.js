const analyzeStatus = (report, history) => {
  const { status, online, url } = report;

  const previousStatus =
    history.length > 1 ? history[history.length - 2] : null;

  if (!online) {
    return {
      message: `No se puede acceder al sitio`,
      details: `No pudimos conectarnos a ${url}. Revisa tu conexión a internet e inténtalo nuevamente.`,
    };
  }

  let trend = "";
  let priority = "Pending";

  if (status === 200 && previousStatus === 0) {
    trend = "Recovered";
    priority = "Medium";
  } else if (status === 0 && previousStatus === 200) {
    trend = "Drop detected";
    priority = "High";
  } else if (status === 200 && previousStatus === 200) {
    trend = "Stable";
    priority = "Low";
  } else if (status === 0 && previousStatus === 0) {
    trend = "Offline";
    priority = "Critical";
  }

  return formatResponse(status, url, trend, priority);
};

function formatResponse(status, url, trend, priority) {
  const codes = {
    200: {
      message: `OK - Sitio operativo`,
      details: `Respuesta exitosa. El servicio respondió correctamente.`,
    },
    404: {
      message: `Recurso no encontrado`,
      details: `Error 404: No se pudo encontrar el recurso solicitado. Verifica la URL o el endpoint.`,
    },
    500: {
      message: `Error interno del servidor`,
      details: `Error 500: El servidor encontró una condición inesperada. Revisar logs del backend.`,
    },
  };

  const statusInfo = codes[Number(status)] || {
    message: `Código desconocido`,
    details: `Se recibió un código de estado no contemplado.`,
  };

  return {
    message: `${statusInfo.message} | URL:${url}`,
    details: `${statusInfo.details} (Status): ${status}`,
    trend: trend,
    priority: priority,
  };
}

module.exports = { analyzeStatus };
