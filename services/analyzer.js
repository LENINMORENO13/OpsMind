const interpreter = (report) => {
  const { status, online, url } = report;

  if (!online) {
    return {
      message: `No se puede acceder al sitio`,
      details: `No pudimos conectarnos a ${url}. Revisa tu conexión a internet e inténtalo nuevamente.`,
    };
  }
  return detalles(status, url);
};

function detalles(detalle, url) {
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

  const info = codes[Number(detalle)] || {
    message: `Código desconocido`,
    details: `Se recibió un código de estado no contemplado.`,
  };
  return {
    message: `${info.message} | URL:${url}`,
    details: `${info.details} (Status): ${detalle}`,
  };
}

module.exports = { interpreter };
