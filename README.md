# 🛡️ OpsMind: Smart Microservice Monitoring

**OpsMind** es una plataforma de monitoreo de servicios enfocada en observabilidad, análisis de disponibilidad y seguimiento de incidentes en aplicaciones distribuidas.

---

# ✨ Características Principales

- Arquitectura API-First con respuestas JSON estandarizadas.
- Clasificación automática de estados: Stable, Recovered, Drop y Offline.
- Sistema dinámico de prioridad de incidentes desde Low hasta Critical.
- Arquitectura desacoplada basada en Clean Architecture y Prisma ORM.

---

# 🛠️ Stack Tecnológico

- Node.js 20 LTS
- Express 5.x
- Prisma ORM
- PostgreSQL / SQLite
- Docker
- GitHub Actions
- OpenAI / Ollama (Roadmap)
- Swagger / OpenAPI

---

# 🚀 Instalación Rápida

## 1. Clonar repositorio

```bash
git clone https://github.com/LENINMORENO13/OpsMind.git
cd OpsMind
```

## 2. Instalar dependencias

```bash
npm install
```

## 3. Configurar entorno y ejecutar

```bash
npx prisma migrate dev
npx prisma generate
npm run dev
```

---

# 📡 API Endpoints (v1)

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/v1/monitors` | Lista todos los servicios registrados |
| POST | `/api/v1/monitors` | Registra un nuevo servicio |
| PATCH | `/api/v1/monitors/:id` | Actualiza parcialmente un monitor |
| DELETE | `/api/v1/monitors/:id` | Elimina un servicio |
| GET | `/api/v1/monitors/status` | Ejecuta chequeo global de salud |

---

# 🎯 Roadmap

- [x] REST API y respuestas estandarizadas
- [ ] Swagger/OpenAPI documentation
- [ ] Background workers para monitoreo autónomo
- [ ] Dockerización completa del entorno
- [ ] LLM-assisted incident analysis usando logs históricos

---

# 👤 Autor

**Lenin Moreno**  
Backend Developer

Enfocado en sistemas resilientes, monitoreo distribuido y observabilidad backend.