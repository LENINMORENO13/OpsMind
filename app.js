const helpers = require("./utils/helpers.js");
const checker = require("./services/checker.js");
const analyzer = require("./services/analyzer.js");
const config = require("./config.json");

console.log("---Sistema de Monitoreo---");
console.log("Iniciando el: ", helpers.obtenerFechaFormateada());

const iniciarMonitor = async function () {
  for (const url of config.urls) {
    const resultado = await checker.revisar(url);
    const analisis = analyzer.interpreter(resultado);
    console.log("Resultado de la revision: ", resultado);
    console.log("Analisis del resultado:", analisis);
    console.log('--------------------------')
  }
};

iniciarMonitor();
