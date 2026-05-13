export const analyzeStatus = (report) => {

  const { status, url, state, trend } = report;

  return formatResponse(status, url, trend, state);
};

function formatResponse(status, url, trend, state) {
  const codes = {
    200: {
      message: `OK - Sitio operativo`,
      details: `Respuesta exitosa. El servicio respondió correctamente.`,
    },
    404: {
      message: `Recurso no encontrado`,
      details: `Error 404: No se pudo encontrar el recurso solicitado.`,
    },
    500: {
      message: `Error interno del servidor`,
      details: `Error 500: El servidor de destino falló.`,
    },
    0: {
      message: `Sin respuesta`,
      details: `El sitio no respondió o hay un error de conexión.`,
    }
  };

  const statusInfo = codes[Number(status)] || {
    message: `Código desconocido`,
    details: `Se recibió el código ${status}.`,
  };

  return {
    status: Number(status),
    url,
    message: `${statusInfo.message} | URL: ${url}`,
    details: statusInfo.details,
    trend: trend, 
    state: state, 
  };
}