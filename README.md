# 🛡️ Service Guardian AI

Sistema Inteligente de Monitoreo y Análisis para Microservicios

Service Guardian AI no es solo un monitor: es una plataforma modular que combina recolección de datos, análisis de tendencias, persistencia y alertas automáticas, con visión futura de inteligencia predictiva mediante IA.

---
## Demuestra habilidades de arquitectura, automatización y análisis inteligente para entornos empresariales modernos.

## Qué hace

- **Monitoreo Automático:** Heartbeats HTTP para servicios críticos.
- **Análisis Basado en Estados:** Detecta Recuperaciones, Caídas y Offline usando un buffer histórico.
- **Prioridad Dinámica:** Asigna automáticamente incidentes de Low a Critical según tendencias.
- **Historial y Persistencia:** Guarda las últimas 5 observaciones por servicio; futura integración con DB relacional para análisis largo plazo.
- **Alertas Automáticas:** Posible integración con Email, Telegram y Discord.
- **Panel Visual:** Dashboard interactivo para visualizar tendencias y disponibilidad.
- **Inteligencia Predictiva:** Futuro soporte con LLMs para análisis de causas y predicción de fallos.

---

## Tech Stack

- **Backend:** Node.js & Express
- **HTTP Client:** Axios
- **Arquitectura:** Modular Service-Oriented Architecture
- **Persistencia:** SQLite/PostgreSQL (próximo)
- **Dashboard:** React/Vue (próximo)
- **IA:** OpenAI / Claude (futuro)

---

## Destaca tu capacidad de diseñar sistemas modulares y escalables.

---

## Estructura del Proyecto

```
monitor-ia/
├── src/
│   ├── app.js                 # Punto de entrada
│   ├── config.json            # URLs y intervalo de monitoreo
│   ├── controllers/           # Orquestador
│   ├── routes/                # Endpoints API
│   ├── services/              # Checker, Analyzer, History
│   └── utils/                 # Helpers, utils de tiempo
├── logs/                      # Rotación futura de logs
├── package.json
└── README.md
```

---

## Endpoints

### /status

Retorna todos los servicios con su estado, tendencia y prioridad.

### /status/:site

Retorna estado de un servicio específico (case-insensitive).

Ejemplo de respuesta:

```json
{
  "message": "OK - Sitio operativo | URL:https://dentalmanager.alwaysdata.net/",
  "details": "Respuesta exitosa. El servicio respondió correctamente. (Status): 200",
  "trend": "Stable",
  "priority": "Low"
}
```

---

## Lógica de Tendencias

| Estado Actual | Estado Anterior | Tendencia     | Prioridad |
|---------------|-----------------|---------------|-----------|
| 200 OK        | 0 (Error)       | Recovered     | Medium    |
| 0 (Error)     | 200 OK          | Drop detected | High      |
| 0 (Error)     | 0 (Error)       | Offline       | Critical  |
| 200 OK        | 200 OK          | Stable        | Low       |

---

## Roadmap / Futuras Actualizaciones

### v1.0 - Core Engine (COMPLETADO)

- Arquitectura modular y servicios core
- Lógica de historial y análisis de tendencias
- API REST funcional con buffer de historial
- Configuración local de zona horaria

### v1.1 - Persistencia

- Integración con DB para historial largo
- Rotación y gestión de logs

### v1.2 - Alertas

- Notificaciones automáticas (Email / Telegram / Discord)
- Umbrales configurables para alertas críticas

### v1.3 - Dashboard

- Interfaz web interactiva
- Gráficos y métricas de disponibilidad

### v2.0 - Inteligencia

- LLM para análisis de causa raíz
- Detección predictiva de fallos basados en patrones históricos