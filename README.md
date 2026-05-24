# 🛡️ OpsMind: Smart Microservice Monitoring

OpsMind es una plataforma de monitoreo y observabilidad de microservicios enfocada en disponibilidad, seguimiento de estados y análisis operacional de servicios distribuidos.

El proyecto está diseñado bajo una arquitectura API-First y una estructura desacoplada orientada a backend engineering moderno, incorporando workers en segundo plano, monitoreo automatizado y documentación interactiva mediante OpenAPI.

---

## ✨ Características Principales

- **Arquitectura API-First**  
  Respuestas JSON estandarizadas y consistentes en todos los endpoints.

- **Health Monitoring Engine**  
  Seguimiento automatizado de estados operacionales y tendencias históricas de disponibilidad.

- **Background Workers**  
  Ejecución periódica de verificaciones usando `node-cron` sin bloquear el servidor principal.

- **Swagger/OpenAPI Integration**  
  Documentación interactiva en vivo utilizando Swagger UI y OpenAPI 3.0.

- **Arquitectura Desacoplada**  
  Separación de responsabilidades mediante capas de servicio y Prisma ORM.

---

## 🛠️ Stack Tecnológico

| Tecnología | Uso |
|---|---|
| Node.js | Runtime principal |
| Express | Framework HTTP |
| Prisma ORM | Acceso y modelado de base de datos |
| PostgreSQL / SQLite | Persistencia de datos |
| Node-Cron | Workers programados |
| Swagger UI | Documentación interactiva |
| OpenAPI 3.0 | Especificación de API |
| Docker *(roadmap)* | Contenedorización |
| Ollama / Gemini *(roadmap)* | Análisis inteligente de incidentes |

---

## 🧠 Arquitectura General

```text
Client
   ↓
REST API (Express) ← Swagger UI (/api-docs)
   ↓
Service Layer (Checker, Analyzer, History)
   ↓
Prisma ORM
   ↓
PostgreSQL / SQLite

Background Workers (Node-Cron)
   ↓
Health Check Engine
```

---

# 📡 API Endpoints (v1)

Documentación interactiva disponible en:

```txt
http://localhost:3000/api-docs
```

---

## 🔹 Gestión de Monitores

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/v1/monitors` | Lista todos los monitores registrados |
| POST | `/api/v1/monitors` | Registra un nuevo monitor |
| PATCH | `/api/v1/monitors/:id` | Actualiza parcialmente un monitor |
| DELETE | `/api/v1/monitors/:id` | Elimina un monitor |

---

## 🔹 Estado y Observabilidad

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/v1/monitors/status/all` | Estado general de todos los servicios |
| GET | `/api/v1/monitors/status/:site` | Estado detallado de un servicio |
| GET | `/api/v1/monitors/:id/history` | Historial reciente de verificaciones |

---

## 📊 Estados y Tendencias Operacionales

OpsMind diferencia entre el estado actual de un servicio y su comportamiento histórico para detectar degradaciones, recuperaciones y caídas persistentes.

---

### 🔹 ServiceStatus

Estado actual del servicio monitoreado.

| Estado | Descripción |
|---|---|
| `UP` | El servicio responde correctamente |
| `DEGRADED` | El servicio responde, pero con latencias altas o errores parciales |
| `DOWN` | El servicio no responde o falló el health check |
| `PENDING` | Historial insuficiente para determinar estabilidad |

---

### 🔹 TrendStatus

Clasificación histórica basada en transiciones operacionales detectadas automáticamente por el sistema.

| Tendencia | Descripción |
|---|---|
| `STABLE` | El servicio mantiene un comportamiento saludable y consistente |
| `RECOVERED` | El servicio estuvo degradado o caído y volvió a la normalidad |
| `DROP_DETECTED` | Se detectó una caída o degradación repentina |
| `OFFLINE` | El servicio permanece caído continuamente |

---

### 🔹 CriticalityLevel *(Preparado para IA)*

Sistema de clasificación de criticidad diseñado para futuros análisis asistidos por LLMs.

| Nivel | Descripción |
|---|---|
| `LOW` | Variaciones menores o impacto reducido |
| `MEDIUM` | Degradación parcial del servicio |
| `HIGH` | Impacto significativo en disponibilidad |
| `CRITICAL` | Servicio completamente caído o inaccesible |

> Actualmente `CriticalityLevel` existe en el modelo de dominio y será utilizado por futuros módulos de análisis inteligente de incidentes.

---

## 📦 Ejemplo de Respuesta

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

## ⏱️ Intervalos de Verificación

Cada monitor ejecuta verificaciones automáticas mediante workers en segundo plano usando `node-cron`.

```json
{
  "checkInterval": 300
}
```

El valor representa segundos entre cada verificación automática.

---

## 🚀 Instalación Rápida

### 1. Clonar repositorio

```bash
git clone https://github.com/LENINMORENO13/OpsMind.git
cd OpsMind
```

---

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Ejemplo de `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/opsmind"
PORT=3000
```

---

### 3. Instalar dependencias

```bash
npm install
```

---

### 4. Configurar base de datos

```bash
npx prisma migrate dev
npx prisma generate
```

---

### 5. Ejecutar proyecto

```bash
npm run dev
```

---

# 🎯 Roadmap

- [x] REST API estructurada
- [x] Swagger/OpenAPI documentation
- [x] Background workers con node-cron
- [ ] Dockerización completa
- [ ] Análisis inteligente de incidentes con LLMs

---

# 👤 Autor

**Lenin Moreno**  
Backend Developer

Enfocado en sistemas distribuidos, observabilidad backend y arquitecturas resilientes.