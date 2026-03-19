const helpers = require('./utils/helpers.js')
const checker = require('./services/checker.js')


console.log('---Sistema de Monitoreo---')
console.log('Iniciando el: ', helpers.obtenerFechaFormateada())
console.log('Revisando la url...', checker.revisar('https://www.google.com'))
