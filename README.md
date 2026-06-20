# 🛡️ OpsMind: Smart Microservice Monitoring

**OpsMind** es una plataforma de monitoreo y observabilidad de microservicios enfocada en disponibilidad, seguimiento de estados y análisis operacional de servicios distribuidos.

El proyecto está diseñado bajo una arquitectura **API-First** y una estructura desacoplada orientada a backend engineering moderno, incorporando workers en segundo plano, monitoreo automatizado y documentación interactiva mediante OpenAPI.

---

# ✨ Características Principales

* **Arquitectura API-First:** respuestas JSON estandarizadas y consistentes en todos los endpoints.
* **Health Monitoring Engine:** seguimiento automatizado de estados operacionales y tendencias históricas de disponibilidad.
* **Background Workers:** ejecución periódica de verificaciones usando `node-cron` sin bloquear el servidor principal.
* **Swagger/OpenAPI Integration:** documentación interactiva en vivo utilizando Swagger UI y OpenAPI 3.0.
* **Arquitectura desacoplada:** separación de responsabilidades mediante capas de servicio y Prisma ORM.
* **Contenerización con Docker:** entorno completamente automatizado con Docker Compose para desarrollo y despliegue consistentes.

---

# 🛠️ Stack Tecnológico

| Tecnología                  | Uso                                        |
| --------------------------- | ------------------------------------------ |
| Node.js                     | Runtime principal                          |
| Express                     | Framework HTTP                             |
| Prisma ORM                  | Acceso y modelado de base de datos         |
| PostgreSQL                  | Persistencia de datos y logs operacionales |
| Node-Cron                   | Workers programados                        |
| Swagger UI                  | Documentación interactiva                  |
| OpenAPI 3.0                 | Especificación de API                      |
| Docker & Docker Compose     | Contenerización completa del entorno       |
| @google/genai               | Análisis inteligente de incidentes con Gemini LLMs |

---

# 🧠 Arquitectura General

```text
Client
   ↓
REST API (Express) ← Swagger UI (/api-docs)
   ↓
Service Layer (Checker, Analyzer, AI Analysis)
   ↓
Prisma ORM
   ↓
PostgreSQL

Background Workers (Node-Cron)
   ↓
Health Check Automation → AI Incident Analysis (Gemini)

Contenedores Docker:
   ├── api: Aplicación Node.js Express
   └── db: Base de datos PostgreSQL
```

---

# 📡 API Endpoints (v1)

Documentación interactiva disponible en:

```text
http://localhost:3000/api-docs
```

## 🔹 Gestión de Monitores

| Método | Endpoint               | Descripción                           |
| ------ | ---------------------- | ------------------------------------- |
| GET    | `/api/v1/monitors`     | Lista todos los monitores registrados |
| POST   | `/api/v1/monitors`     | Registra un nuevo monitor             |
| PATCH  | `/api/v1/monitors/:id` | Actualiza parcialmente un monitor     |
| DELETE | `/api/v1/monitors/:id` | Elimina un monitor                    |

## 🔹 Estado y Observabilidad

| Método | Endpoint                        | Descripción                           |
| ------ | ------------------------------- | ------------------------------------- |
| GET    | `/api/v1/monitors/status/all`   | Estado general de todos los servicios |
| GET    | `/api/v1/monitors/status/:site` | Estado detallado de un servicio       |
| GET    | `/api/v1/monitors/:id/history`  | Historial reciente de verificaciones  |

---

# 📊 Estados y Tendencias Operacionales

OpsMind diferencia entre el estado actual de un servicio y su comportamiento histórico para detectar degradaciones, recuperaciones y caídas persistentes.

## 🔹 ServiceStatus

Estado actual del servicio monitoreado.

| Estado     | Descripción                                                        |
| ---------- | ------------------------------------------------------------------ |
| `UP`       | El servicio responde correctamente                                 |
| `DEGRADED` | El servicio responde, pero con latencias altas o errores parciales |
| `DOWN`     | El servicio no responde o falló el health check                    |
| `PENDING`  | Historial insuficiente para determinar estabilidad                 |

---

## 🔹 TrendStatus

Clasificación histórica basada en transiciones operacionales detectadas automáticamente por el sistema.

| Tendencia       | Descripción                                                    |
| --------------- | -------------------------------------------------------------- |
| `STABLE`        | El servicio mantiene un comportamiento saludable y consistente |
| `RECOVERED`     | El servicio estuvo degradado o caído y volvió a la normalidad  |
| `DROP_DETECTED` | Se detectó una caída o degradación repentina                   |
| `OFFLINE`       | El servicio permanece caído continuamente                      |

---

## 🔹 CriticalityLevel

Sistema de clasificación de criticidad integrado con análisis asistido por LLMs.

| Nivel      | Descripción                                |
| ---------- | ------------------------------------------ |
| `LOW`      | Variaciones menores o impacto reducido     |
| `MEDIUM`   | Degradación parcial del servicio           |
| `HIGH`     | Impacto significativo en disponibilidad    |
| `CRITICAL` | Servicio completamente caído o inaccesible |

Actualmente `CriticalityLevel` existe en el modelo de dominio e interactúa con el módulo de análisis inteligente de incidentes para priorizar respuestas automáticas.

---

#  Ejemplo de Respuesta JSON

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "url": "https://facebook.com",
      "name": "Facebook",
      "isActive": true,
      "checkInterval": 300,
      "lastStatus": "PENDING",
      "createdAt": "2026-05-24T17:56:35.676Z",
      "updatedAt": "2026-05-24T17:56:35.676Z"
    }
  ]
}
```

---

# ⏱️ Intervalos de Verificación

Cada monitor ejecuta verificaciones automáticas mediante workers en segundo plano usando `node-cron`.

```json
{
  "checkInterval": 300
}
```

El valor representa los segundos entre cada verificación automática.

---

# 🚀 Instalación y Ejecución

## Con Docker *(Recomendado)*

### 1. Clonar el repositorio

```bash
git clone https://github.com/LENINMORENO13/OpsMind.git
cd OpsMind
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

### 3. Construir y levantar los contenedores

```bash
docker compose up --build
```

La aplicación estará disponible en:

* API: `http://localhost:3000`
* Swagger Docs: `http://localhost:3000/api-docs`
* PostgreSQL: `localhost:5432`

> Dentro de Docker, PostgreSQL será accesible como `db:5432`.

### 4. Detener y eliminar contenedores

```bash
docker compose down
```

### 5. Reconstruir después de cambios de dependencias

```bash
docker compose up --build
```

---

# 🎯 Roadmap

* [x] REST API estructurada
* [x] Swagger/OpenAPI Documentation
* [x] Background workers con `node-cron`
* [x] Dockerización completa
* [x] Análisis inteligente de incidentes con Gemini LLMs

---

# 🤖 Análisis Inteligente con IA

OpsMind integra Gemini LLMs para diagnóstico automático de incidentes, generando:

* **Causa probable:** Explicación técnica de 1-2 líneas sobre el origen del error.
* **Acción recomendada:** Comando, log o servicio específico a revisar primero.

## Configuración

Añade tu API Key de Gemini en `.env`:

```bash
GEMINI_API_KEY=tu_api_key_aqui
```

El servicio usa `gemini-2.5-flash-lite` con schema JSON estricto y retry automático para mayor resiliencia.

---

# 👤 Autor

**Lenin Moreno**
Backend Developer

Enfocado en sistemas distribuidos, observabilidad backend y arquitecturas resilientes.
