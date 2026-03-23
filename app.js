const helpers = require('./utils/helpers.js')
const checker = require('./services/checker.js')
const analyzer = require('./services/analyzer.js')


console.log('---Sistema de Monitoreo---')
console.log('Iniciando el: ', helpers.obtenerFechaFormateada())

const iniciarMonitor = async function() {
    const resultado = await checker.revisar('https://www.google.com')
    const analisis = analyzer.interpreter(resultado)
    console.log('Resultado de la revision: ', resultado)
    console.log('Analisis del resultado:', analisis)
}

iniciarMonitor()


//   switch (status) {
  //     case 200:
  //       return {
  //         message: `OK - ${url} operativo`,
  //         details: `Respuesta exitosa (200). El servicio respondió correctamente.`,
  //       };
  //     case 404:
  //       return {
  //         message: `Recurso no encontrado - ${url}`,
  //         details: `Error 404: No se pudo encontrar el recurso solicitado. Verifica la URL o el endpoint.`,
  //       };
  //     case 500:
  //       return {
  //         message: `Error interno del servidor - ${url}`,
  //         details: `Error 500: El servidor encontró una condición inesperada. Revisar logs del backend.`,
  //       };
  //     default:
  //       return {
  //         message: `Código no manejado - ${url}`,
  //         details: `Se recibió un código de estado no contemplado: ${status}.`,
  //       };
  //   }