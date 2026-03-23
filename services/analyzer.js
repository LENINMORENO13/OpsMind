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
      message: `OK - ${url} operativo`,
      details: `Respuesta exitosa (200). El servicio respondió correctamente.`,
    },
    404: {
      message: `Recurso no encontrado - ${url}`,
      details: `Error 404: No se pudo encontrar el recurso solicitado. Verifica la URL o el endpoint.`,
    },
    500: {
      message: `Error interno del servidor - ${url}`,
      details: `Error 500: El servidor encontró una condición inesperada. Revisar logs del backend.`,
    },
  };
  return (
    codes[Number(detalle)] || {
      message: `Código no manejado - ${url}`,
      details: `Se recibió un código de estado no contemplado: ${detalle}.`,
    }
  );
}

module.exports = { interpreter };
