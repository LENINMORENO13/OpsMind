# 🛡️ OpsMind — Microservice Monitoring & Incident Analysis

![CI/CD](https://github.com/LENINMORENO13/OpsMind/actions/workflows/main.yml/badge.svg)

OpsMind es una plataforma backend para monitoreo de servicios y gestión de incidentes, enfocada en disponibilidad, seguimiento de estados y análisis asistido por IA, con un panel web operativo integrado.

El proyecto utiliza una API REST, workers en segundo plano, autenticación JWT, PostgreSQL para persistencia, un sistema de incidentes con análisis histórico y un panel web (React) servido por la propia API.

---

# 🎯 ¿Qué hace OpsMind?

OpsMind monitorea periódicamente servicios registrados y registra sus cambios de estado.

Cuando detecta una caída:

1. Se crea un incidente.
2. Se registra el inicio del incidente.
3. Se dispara un evento para iniciar el análisis.
4. Gemini genera un diagnóstico estructurado.
5. El análisis se guarda junto con el incidente.
6. Cuando el servicio se recupera, el incidente se marca como resuelto.
7. Se calcula el tiempo de indisponibilidad.
8. El incidente queda almacenado para utilizarlo como contexto histórico en futuros análisis.

La IA funciona como una herramienta de análisis complementaria. La detección, creación y resolución de incidentes son responsabilidad del sistema de monitoreo.

---

# 📚 Tabla de Contenidos

* [¿Qué hace OpsMind?](#-qué-hace-opsmind)
* [Características](#-características-principales)
* [Stack](#-stack-tecnológico)
* [Arquitectura](#-arquitectura-general)
* [API](#-api-endpoints)
* [Incidentes](#-gestión-de-incidentes)
* [Estados](#-estados-del-sistema)
* [Instalación](#-instalación-y-ejecución)
* [Testing](#-pruebas-automatizadas)
* [IA](#-análisis-inteligente-con-ia)
* [Evolución V1 → V2](#-evolución-v1--v2)
* [Entorno desplegado](#-entorno-desplegado)
* [Autor](#-autor)

---

# ✨ Características Principales

* API REST con respuestas JSON
* Autenticación mediante JWT
* Monitoreo periódico de disponibilidad
* Background workers con `node-cron`
* Gestión del estado e historial de servicios
* Persistencia con Prisma y PostgreSQL
* Swagger/OpenAPI para documentación de la API
* Contenerización con Docker
* Integración y despliegue continuos con GitHub Actions (CI/CD)
* Gestión del ciclo de vida de incidentes
* Cálculo automático de downtime
* Registro de soluciones humanas (root cause + acción) por incidente
* Análisis de incidentes mediante Gemini
* Contexto histórico basado en incidentes anteriores y soluciones humanas verificadas
* Procesamiento de IA desacoplado mediante eventos
* Validación SSRF (solo IPs públicas) al registrar monitores
* Panel web operativo (React + TypeScript) servido por Express en el mismo origen
* Dashboard con resumen, monitores, incidentes, métricas y insights IA
* CRUD de monitores desde la interfaz web
* Resolución de incidentes (HITL) desde la interfaz web

---

# 🛠️ Stack Tecnológico

| Tecnología       | Uso                    |
| ---------------- | ---------------------- |
| Node.js          | Runtime                |
| TypeScript       | Lenguaje               |
| Express          | API HTTP               |
| Express Rate Limit | Rate limiting (auth) |
| Helmet           | Cabeceras de seguridad |
| Prisma ORM       | Acceso a datos         |
| PostgreSQL       | Persistencia           |
| Node-Cron        | Background workers     |
| Jest + Supertest | Testing                |
| Swagger UI       | Documentación          |
| OpenAPI 3.0      | Especificación         |
| Zod              | Validación de datos    |
| Axios            | HTTP health checks     |
| Docker           | Contenedores           |
| GitHub Actions   | CI/CD (integración y despliegue continuos) |
| @google/genai    | Integración con Gemini |
| React            | Panel web operativo (SPA) |
| Vite             | Build del panel web |
| Tailwind CSS     | Estilos del panel web |
| React Router     | Rutas del panel web |
| Recharts         | Gráficos del panel web |
| Lucide           | Iconos del panel web |

---

# 🧠 Arquitectura General

```mermaid
graph TD
    Client --> API[Express API]
    API --> Auth[JWT Middleware]
    Auth --> Services[Service Layer]
    Services --> Prisma
    Prisma --> DB[(PostgreSQL)]

    Web[Panel web React SPA<br>servido por Express] -->|/api/v1/dashboard/*| API
    API -->|estático + fallback SPA| Web

    Workers[Node-Cron Workers] --> Scheduler[Scheduler Service]
    Scheduler -->|ventana de intervalo| Checker[Checker Service]
    Checker -->|HTTP 5s timeout| External[Servicio monitoreado]
    Checker --> Analyzer[Analyzer TREND_MATRIX]
    Analyzer -->|Log| Prisma
    Analyzer -->|DROP_DETECTED| IncidentService
    Analyzer -->|RECOVERED| IncidentService

    IncidentService -->|incident-opened| Emitter[Event Emitter]
    Emitter -->|async process| AI[Gemini Analysis]
    AI -->|AIInsight (análisis + sugerencia + criticidad)| Prisma
    Prisma -->|contexto histórico<br>últimos 5 resueltos + soluciones humanas| AI

    IncidentService -->|downtime calculation| Prisma
    Services -->|POST /incidents/:id/resolve| IncidentService
    IncidentService -->|ResolutionLog| Prisma
```

---

# 📡 API Endpoints

## 🔐 Auth

| Método | Endpoint                | Descripción |
| ------ | ----------------------- | ----------- |
| POST   | `/api/v1/auth/register` | Registro    |
| POST   | `/api/v1/auth/login`    | Login + JWT |

---

## 📊 Monitors

**Authorization requerido:**

```http
Authorization: Bearer <token>
```

| Método | Endpoint               | Descripción      |
| ------ | ---------------------- | ---------------- |
| GET    | `/api/v1/monitors`     | Listar monitores |
| POST   | `/api/v1/monitors`     | Crear monitor    |
| PATCH  | `/api/v1/monitors/:id` | Actualizar       |
| DELETE | `/api/v1/monitors/:id` | Eliminar         |

---

## 📈 Observabilidad

| Método | Endpoint                        | Descripción         |
| ------ | ------------------------------- | ------------------- |
| GET    | `/api/v1/monitors/status/all`   | Estado general      |
| GET    | `/api/v1/monitors/status/:site` | Estado por servicio |
| GET    | `/api/v1/monitors/:id/history`  | Historial           |

---

## 📊 Dashboard Operativo

Endpoints de solo lectura (sin side effects) que alimentan el panel web. **Authorization requerido:**

```http
Authorization: Bearer <token>
```

| Método | Endpoint                                       | Descripción                                                       |
| ------ | ---------------------------------------------- | ----------------------------------------------------------------- |
| GET    | `/api/v1/dashboard/summary`                    | Resumen global (monitores, incidentes, logs, insights)            |
| GET    | `/api/v1/dashboard/monitors`                   | Monitores con contexto operativo (`includeInactive`, `limit`)     |
| GET    | `/api/v1/dashboard/incidents`                  | Incidentes recientes/abiertos por ventana (`window`, `monitorId`) |
| GET    | `/api/v1/dashboard/metrics`                    | Series temporales por bucket (`window`, `bucket`, `monitorId`)    |
| GET    | `/api/v1/dashboard/insights`                   | Insights IA recientes (`limit`)                                   |

---

## 🚨 Incidentes

La V2 introduce memoria persistente de incidentes y seguimiento de su ciclo de vida.

| Método | Endpoint                                 | Descripción                                   |
| ------ | ---------------------------------------- | --------------------------------------------- |
| GET    | `/api/v1/incidents/active`               | Incidentes activos con diagnóstico IA         |
| GET    | `/api/v1/incidents/monitor/:monitorId/resolved` | Historial de incidentes resueltos por monitor |
| POST   | `/api/v1/incidents/:id/resolve`          | Registrar solución humana (`rootCause`, `actionTaken`) y cerrar el incidente según el estado del servicio |

La respuesta de `/api/v1/incidents/active` incluye, en cada `aiInsight`:

* `analysis` — diagnóstico de la IA
* `suggestion` — recomendación técnica
* `criticality` — nivel de criticidad
* `historicalAnalysis` — origen del diagnóstico (incidente actual, histórico(s) relevante(s) o IA no disponible)
* `createdAt` — timestamp del análisis

### Resolución manual de incidentes

`POST /api/v1/incidents/:id/resolve` (autenticado) registra la solución aplicada por un operador. El cierre del incidente depende del estado real del servicio:

* Incidente `OPEN` + monitor sano (`UP`/`DEGRADED`) → se cierra el incidente (`closedNow: true`).
* Incidente `OPEN` + monitor caído → se registra la solución pero **el incidente permanece abierto** hasta que el servicio se recupere (`RECOVERED`).
* Incidente `RESOLVED` (recuperado automáticamente) → solo se adjunta el log de la solución registrada.

Errores: `400` (validación), `401` (no autorizado), `404` (incidente inexistente), `409` (ya existe solución registrada para el incidente).

### Fase 1 — Incident Memory

* Persistencia de incidentes
* Seguimiento de incidentes activos y resueltos
* Cálculo automático de downtime
* Diagnóstico mediante IA
* Procesamiento de IA desacoplado mediante eventos

### Flujo de incidentes

```text
DROP_DETECTED
      ↓
Incident created
      ↓
incident-opened
      ↓
Gemini analysis
      ↓
AIInsight persisted
      ↓
RECOVERED
      ↓
Incident resolved
      ↓
Downtime calculated
```

---

# 📊 Estados del Sistema

## ServiceStatus

* `UP` → funcionando
* `DEGRADED` → lento o inestable
* `DOWN` → caído
* `PENDING` → sin datos

## TrendStatus

* `STABLE` → estable
* `RECOVERED` → recuperación
* `DROP_DETECTED` → caída detectada
* `OFFLINE` → caído persistentemente

## CriticalityLevel

* `LOW`
* `MEDIUM`
* `HIGH`
* `CRITICAL`

## IncidentStatus

* `OPEN` → incidente activo
* `RESOLVED` → incidente resuelto
* `IGNORED` → incidente descartado

---

# 🚀 Instalación y Ejecución

## 1. Clonar repositorio

```bash
git clone https://github.com/LENINMORENO13/OpsMind.git
cd OpsMind
```

## 2. Variables de entorno

```bash
cp .env.example .env
```

Configura valores reales para `JWT_SECRET` (obligatorio para la autenticación JWT), `GEMINI_API_KEY` y `POSTGRES_PASSWORD` (obligatoria para `docker compose up`) antes de iniciar la aplicación. `POSTGRES_USER` y `POSTGRES_DB` son opcionales (por defecto `lenin_dev` y `opsmind_db`). La conexión local a PostgreSQL es por el puerto `5433`.

## 3. Docker

```bash
docker compose up --build
```

El multi-stage build compila el panel web (`frontend/dist`) y luego la API:

* Panel web: http://localhost:3000
* Swagger: http://localhost:3000/api-docs
* PostgreSQL: `db:5432`

## 4. Detener

```bash
docker compose down
```

## 5. Desarrollo local (sin Docker)

El panel web en modo desarrollo usa Vite con proxy hacia la API (`/api` y `/api-docs`):

```bash
# Terminal 1 — API
npm run dev

# Terminal 2 — Panel web (Vite, puerto 5173)
cd frontend && npm run dev
```

---

# 🧪 Pruebas Automatizadas

```bash
npm test
```

Incluye pruebas para:

* Autenticación JWT
* CRUD de monitores
* Validaciones HTTP (`400`, `401`, `404`)
* Integración con Prisma y PostgreSQL
* Flujo de creación y resolución de incidentes (incluye `POST /api/v1/incidents/:id/resolve`)
* Resolución manual con `ResolutionLog` (`closedNow`, duplicado `409`, incidente inexistente `404`)
* Análisis mediante IA (`analyzeIncident`, reintentos y fallback)
* Actualización de estado por tendencias (`TREND_MATRIX`)
* Protección SSRF y validación de URLs públicas
* Cadencia programada y throttling por ventana del scheduler
* Formateo y sanitización del contexto histórico (prompt-formatters)
* Endpoints del dashboard operativo (summary, monitors, incidents, metrics, insights)

---

# 🤖 Análisis Inteligente con IA

OpsMind utiliza Gemini como herramienta de análisis para generar un diagnóstico estructurado a partir de la información del incidente.

El análisis puede incorporar contexto de incidentes históricos —incluyendo las soluciones humanas verificadas (`ResolutionLog`) registradas vía `POST /api/v1/incidents/:id/resolve`— pero el incidente actual permanece como fuente principal del diagnóstico.

El análisis incluye:

* Diagnóstico
* Causa probable
* Acción recomendada
* Nivel de criticidad
* Análisis histórico (origen del diagnóstico)

La IA se ejecuta de forma desacoplada mediante eventos:

```text
IncidentService
      ↓
incident-opened
      ↓
getRecentIncidentsContext (últimos 5 resueltos + resolutionLog)
      ↓
formatHistoricalIncidents (JSON sanitizado + human_verified_resolution)
      ↓
AIService
      ↓
Gemini (prompt con contexto histórico + reglas)
      ↓
AIInsight (analysis, suggestion, criticality, historicalAnalysis)
```

El resultado utiliza un esquema estructurado para mantener compatibilidad con el modelo de datos.

```bash
GEMINI_API_KEY=tu_key
```

## Reglas de diagnóstico

* El incidente actual es la fuente principal del diagnóstico.
* Los históricos se usan solo si aportan evidencia relevante.
* Compartir el mismo código o mensaje de error no implica por sí solo un patrón recurrente.
* No se inventan IDs ni información no verificada.
* `historicalAnalysis` explica explícitamente de dónde proviene el diagnóstico.
* Las soluciones humanas verificadas (`human_verified_resolution`) son evidencia de alta confianza acotada a ese incidente y entorno; no son una verdad universal ni deben generalizarse.
* Está prohibido copiar una solución humana a ciegas: si el incidente actual presenta variaciones significativas (distinto código, causa aparente o escenario), se descarta esa solución y se diagnostica solo con el incidente actual.
* Si una solución humana se usa o se descarta, `historicalAnalysis` debe justificar explícitamente por qué las condiciones coinciden o difieren.

## Manejo de errores de IA

El servicio de IA realiza reintentos ante errores de comunicación con Gemini: hasta 3 reintentos con el delay configurado por el servicio.

Si Gemini continúa fallando, el servicio cuenta con un mecanismo de fallback para completar el análisis.

De esta forma, un fallo persistente del proveedor de IA no interrumpe el flujo principal de gestión de incidentes.

---

# 🔄 Evolución V1 → V2

## V1 — Monitoring Foundation

La primera versión establece la base de monitoreo y observabilidad:

* [x] API REST modular
* [x] Health monitoring
* [x] Service status
* [x] Service history
* [x] JWT authentication
* [x] Background workers
* [x] Swagger/OpenAPI
* [x] Docker
* [x] Testing
* [x] Continuous Integration
* [x] AI analysis

---

## V2 — Incident Intelligence

La segunda versión amplía OpsMind desde el monitoreo de servicios hacia la gestión de incidentes y el análisis basado en contexto histórico.

### Fase 1 — Incident Memory ✅

* [x] Persistencia de incidentes
* [x] Ciclo de vida del incidente
* [x] Cálculo de downtime
* [x] AIInsight persistente
* [x] IA desacoplada por eventos
* [x] API de incidentes activos y resueltos

### Fase 2 — Pattern Detection ✅

* [x] Recuperación de incidentes históricos resueltos (últimos 5 por monitor)
* [x] Formateo y sanitización de contexto histórico (prompt-formatters)
* [x] Integración del contexto histórico en el prompt de Gemini
* [x] Campo `historicalAnalysis` en el esquema AIInsight
* [x] Reglas estrictas de diagnóstico (actual es la fuente principal; mismo error ≠ patrón)
* [x] `historicalAnalysis` expuesto en el endpoint de incidentes activos

### Fase 3 — Recommendation Engine & Human-in-the-Loop (HITL) ✅

* [x] Endpoint `POST /api/v1/incidents/:id/resolve` para registrar la solución humana (`rootCause`, `actionTaken`)
* [x] Modelo `ResolutionLog` (1:1 con el incidente, ligado al usuario que resuelve)
* [x] Cierre desacoplado del estado del incidente: OPEN + monitor sano → cierra; OPEN + monitor caído → espera `RECOVERED`; RESOLVED → solo adjunta el log
* [x] Validación de resolución: `404` incidente inexistente y `409` solución ya registrada
* [x] Soluciones humanas verificadas incorporadas al contexto histórico (`human_verified_resolution`)
* [x] Reglas defensivas en el prompt: prohibido copiar soluciones humanas a ciegas

### Fase 4 — Operational Dashboard ✅

* [x] Endpoints de dashboard de solo lectura (`summary`, `monitors`, `incidents`, `metrics`, `insights`) sin side effects
* [x] Panel web React (SPA) servido por Express en el mismo origen (sin CORS)
* [x] Vistas: resumen, monitores, incidentes, métricas con gráficos (Recharts) e insights IA
* [x] Datos operativos por ventanas (24h, 7d, 30d, 90d)
* [x] CRUD de monitores desde la interfaz web (crear, editar, eliminar)
* [x] Resolución de incidentes (HITL) desde la interfaz web
* [x] Autenticación y protección de rutas en el panel (JWT)

### Próximas fases

Las siguientes fases están orientadas a ampliar el uso de la información histórica y facilitar el análisis y seguimiento de incidentes.

* **Fase 5 — AI Engine Continuous Improvement**

---

# 🌐 Entorno desplegado

La API y el panel web están desplegados en Render (mismo origen):

* Panel web: https://opsmind-e07b.onrender.com
* API + Swagger: https://opsmind-e07b.onrender.com/api-docs

El servicio de Render es **Native Node** (no Docker). Su **Build Command** debe render backend y frontend; el **Start Command** aplica migraciones y arranca la API:

```
npm install && npx prisma generate && npm run build && cd frontend && npm install && npm run build
npx prisma migrate deploy && npm start
```

Si el frontend no está compilado, la app responde `503` con JSON en rutas no-API en vez de fallar.

## Acceso de prueba

El panel ofrece un acceso demo para quienes quieran explorar la plataforma sin registrarse:

* **Credenciales:** `demo@opsmind.com` / `demo1234`
* En el login aparece el botón **"Explorar con cuenta demo"** que inicia la sesión con un clic.
* La cuenta se auto-crea de forma idempotente al arrancar si no existe (`upsert`).
* Se habilita configurando (opcional) `DEMO_EMAIL` y `DEMO_PASSWORD` en el entorno. Sin estos valores, el acceso demo queda deshabilitado y el login es normal.

---

# 👤 Autor

**Lenin Moreno** — Backend Developer

Proyecto personal enfocado en backend, monitoreo de servicios, gestión de incidentes y exploración de arquitecturas orientadas a eventos.

🛸 **¡Conectemos!**

* 🌐 [LinkedIn](https://www.linkedin.com/in/lenin-moreno/)
* 💼 [Portafolio Web / Gitvlg](https://leninmoreno13.gitvlg.com/)
