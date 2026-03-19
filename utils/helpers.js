const obtenerFechaFormateada = () => {
  return new Date().toLocaleString("ec-EC", { timeZone: "America/Guayaquil" });
};

module.exports = { obtenerFechaFormateada };

