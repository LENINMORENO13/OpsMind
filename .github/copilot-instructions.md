# Copilot Instructions for OpsMind

OpsMind is a Node.js-based microservice monitoring and observability platform with AI-powered incident analysis. This document provides essential context for working effectively in this codebase.

## Quick Commands

### Build & Run
```bash
# Development (watch mode)
npm run dev

# Production
npm start

# Docker
docker compose up --build
docker compose down
```

### Testing
```bash
# Run all tests with coverage
npm test

# Run specific test file (e.g., monitor tests)
npm test -- tests/monitor.test.js

# Run with coverage
npm run test:coverage
```

### Database
```bash
# Prisma migrations (already run in Docker)
npx prisma migrate dev

# Open Prisma Studio (visual DB explorer)
npx prisma studio
```

## Architecture Overview

### Tech Stack
- **Runtime**: Node.js (ES modules)
- **Framework**: Express 5.x
- **Database**: PostgreSQL with Prisma ORM
- **Background Jobs**: node-cron (scheduled health checks)
- **Authentication**: JWT with bcryptjs
- **AI Analysis**: Google Gemini API
- **Testing**: Jest + Supertest
- **API Docs**: Swagger/OpenAPI 3.0

### Core Layers

```
API Routes (routes/)
    ↓
Controllers (controllers/) - handle HTTP requests/responses
    ↓
Services (services/) - business logic
    ↓
Prisma Models (schema.prisma) - database operations
```

### Key Service Architecture

1. **scheduler.js** - Starts cron jobs that periodically check monitor health
2. **checker.js** - Performs HTTP requests to monitored URLs, records status (UP/DOWN/DEGRADED/PENDING)
3. **historyService.js** - Analyzes trends from logs (STABLE/DROP_DETECTED/RECOVERED/OFFLINE)
4. **analyzer.js** - Determines if status changes warrant creating/resolving incidents
5. **aiServices.js** - Calls Gemini API for incident analysis and recommendations

### Response Format Convention

All API responses follow a standard format:
```javascript
{
  success: boolean,
  message?: string,
  error?: string,
  data?: any
}
```

HTTP status codes are used correctly:
- **201** for resource creation
- **400** for validation errors
- **401** for auth failures (missing/invalid token)
- **404** for not found
- **500** for server errors

## Key Conventions

### Route Structure
- All routes are namespaced under `/api/v1/{resource}`
- Auth routes: `/api/v1/auth/{register,login}`
- Monitor routes: `/api/v1/monitors/*`
- Routes use **verifyToken** middleware for protected endpoints

### Validation
- Use Zod schemas in `src/schemas/` for request validation
- Apply `validateSchema(schema)` middleware in routes before calling controller
- Example: `router.post("/register", validateSchema(registerSchema), register)`

### Database Models & Enums

**Core Enums** (defined in schema.prisma):
- `ServiceStatus`: UP | DOWN | DEGRADED | PENDING
- `TrendStatus`: STABLE | RECOVERED | DROP_DETECTED | OFFLINE
- `CriticalityLevel`: LOW | MEDIUM | HIGH | CRITICAL
- `IncidentStatus`: OPEN | RESOLVED | IGNORED

**Key Models**:
- **Monitor** - URL to monitor with checkInterval, lastStatus
- **Log** - Historical HTTP response data (status code, response time, trend)
- **Incident** - Triggered when status drops; has optional AIInsight and ResolutionLog
- **AIInsight** - AI analysis & recommendations for incidents (1:1 with Incident)
- **User** - Auth users who can create ResolutionLogs

### Testing Patterns

Tests use **Supertest** for HTTP requests against the Express app in test mode. Pattern:
```javascript
import request from "supertest";
import app from "../src/app.js";

describe("Feature", () => {
  it("should do X", async () => {
    const res = await request(app)
      .post("/api/v1/resource")
      .set("Authorization", `Bearer ${token}`)
      .send({ field: "value" });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});
```

After tests, always disconnect Prisma with `afterAll(async () => { await prisma.$disconnect(); })`.

### File Organization
- **routes/** - Route definitions with OpenAPI comments (JSDoc)
- **controllers/** - Request handlers; delegate to services
- **services/** - Business logic (health checks, trend analysis, AI calls)
- **schemas/** - Zod validation schemas
- **middlewares/** - Auth, validation, error handling
- **lib/** - Prisma client initialization
- **config/** - Swagger/OpenAPI setup
- **utils/** - Helper functions (date formatting, etc.)

### Prisma Patterns
- Import Prisma in services: `import prisma from "../lib/prisma.js"`
- Use cascading deletes (onDelete: Cascade) for related records
- Always `await prisma.$disconnect()` in test cleanups
- Migrations are tracked in `prisma/migrations/`

### Swagger Documentation
- All routes include JSDoc OpenAPI comments in the route file
- Format: `@openapi` block with tags, summary, requestBody, responses
- Swagger UI served at `/api-docs`

## Environment Variables

Required in `.env`:
- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for signing JWTs
- `GEMINI_API_KEY` - Google Gemini API key for AI analysis

## Common Tasks

### Adding a New Endpoint
1. Create Zod schema in `src/schemas/`
2. Add route handler in controller
3. Add route with JSDoc OpenAPI comment in `src/routes/`
4. If it touches monitors/incidents, add test in `tests/`

### Modifying Database Schema
1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name description`
3. Update affected services and controllers
4. Update related tests

### Adding a New Cron Job
1. Add function to `src/services/scheduler.js`
2. Schedule with `schedule.scheduleJob()` in `startCronJobs()`
3. Ensure it respects active monitor list via Prisma queries

### Testing AI Integration
1. Ensure `GEMINI_API_KEY` is set in `.env`
2. Call `analyzeIncident()` from `src/services/aiServices.js`
3. Mock in tests via Jest mocking if needed

## Important Notes

- **JWT Authentication**: Bearer token required for `/monitors/*` endpoints (except schema/status endpoints if public)
- **Cascade Deletes**: Deleting a monitor cascades to logs and incidents automatically
- **Health Check Interval**: Monitors check by default every 300 seconds; configurable per monitor
- **Trend Detection**: Based on historical logs (not just current status) - see `historyService.js`
- **AI Analysis**: Only triggered when incidents are created; powered by Gemini API
- **Test Env**: Set NODE_ENV=test; uses real Prisma + test DB

## Useful Resources

- Swagger/OpenAPI docs: http://localhost:3000/api-docs
- Prisma Studio: `npx prisma studio` (visualize data)
- GitHub Actions CI: `.github/workflows/ci.yml`
