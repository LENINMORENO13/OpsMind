import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "OpsMind API",
      version: "1.0.0",
      description: "🤖 Plataforma de Monitoreo & Observabilidad con IA\n\n" +
                   "🔑 Flujo Obligatorio de Autenticación (Paso a Paso):\n\n" +
                   "1. Registrar Usuario: Ve al módulo Auth y usa el endpoint 'POST /api/v1/auth/register' para crear tus credenciales.\n" +
                   "2. Iniciar Sesión: Usa esas mismas credenciales en el endpoint 'POST /api/v1/auth/login'.\n" +
                   "3. Obtener el Token: De la respuesta JSON exitosa, copia únicamente el texto largo que viene dentro de la propiedad 'data' (tu token JWT).\n" +
                   "4. Autorizar la UI: Sube al inicio de esta página, haz clic en el botón verde 'Authorize', pega el token copiado y confirma.\n\n" +
                   "¡Listo! Tendrás acceso libre para probar todos los endpoints de monitores.",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Servidor Local (Docker)",
      },
      {
        url: "https://opsmind-e07b.onrender.com",
        description: "Servidor de Producción (Render)",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.js"],
};

export const swaggerSpec = swaggerJsdoc(options);