# AGENTS.md

OpsMind: Express 5 + TypeScript (ESM) REST API for service monitoring and AI-assisted incident analysis. PostgreSQL via Prisma 7, JWT auth, `node-cron` background checks, Google Gemini. No frontend. Deployed on Render (API) + Supabase (Postgres), released to `main` as **v2.4.0**. Prompts/README are in Spanish; code/comments mix Spanish and English.

## Commands

- `npm run dev` — tsx watch `src/app.ts`
- `npm run build` — `tsc -p tsconfig.build.json` → `dist/`; `npm start` runs `dist/app.js`
- `npm test` — sets `NODE_ENV=test`, Jest with `--detectOpenHandles --forceExit`
- Single test: `npm test -- tests/monitor.test.ts` (files are `.ts`, not `.js`)
- `npm run typecheck` — `tsc -p tsconfig.test.json` (checks `src` + `tests`); `npm run typecheck:build` checks build config only
- No lint/format script exists; use `typecheck` for verification.
- `docker compose up --build`; PostgreSQL is exposed on host port **5433** (not 5432).

## Non-obvious constraints

- **ESM + NodeNext imports:** TypeScript source uses `.js` extensions on relative imports (e.g. `import prisma from "../lib/prisma.js"`), even though the files are `.ts`. Match this or build/runtime breaks. Jest strips the extension via `moduleNameMapper`.
- **Tests need a real PostgreSQL.** Under `NODE_ENV=test`, `src/lib/prisma.ts` uses `TEST_DATABASE_URL` (falls back to `DATABASE_URL`). The schema must already exist; run `npx prisma db push` first. Tests truncate with `deleteMany` and disconnect via `afterAll(() => prisma.$disconnect())`.
- **Prisma CLI + client:** `prisma.config.ts` prefers `DIRECT_URL` over `DATABASE_URL` for CLI commands. There is no `postinstall`; run `npx prisma generate` after editing `prisma/schema.prisma` (CI does) or typecheck/build fails on the missing client. Tests provision the schema with `npx prisma db push` against a throwaway Postgres; **production uses `prisma migrate deploy`** (CD and Dockerfile `CMD`).
- **`.env.example`** includes `DIRECT_URL` and `TEST_DATABASE_URL`, which `prisma.config.ts` and `src/lib/prisma.ts` read. Prod (Supabase) requires the direct IPv4 URL for `migrate deploy` and the pooler (`:6543`) for the app at runtime.
- **Cron only runs outside tests:** `app.ts` calls `startCronJobs()` only when `NODE_ENV !== "test"` and after `app.listen`. The job runs every 5 min (`scheduler.service.ts`).
- **AI is event-driven:** `incident.service.openIncident` emits `incident-opened`; the listener lives in `notification.service.ts`, imported for its side effect in `app.ts`. Removing/altering that import silently disables AI analysis.
- **Status endpoints have side effects:** `GET /api/v1/monitors/status/all` and `/status/:site` run real checks via `executeMonitorCheck`, writing `Log` rows and potentially opening/resolving incidents and triggering Gemini. Don't hit them casually in tests or manual probes.
- **`src/controllers/resolution.controller.ts` is an unfinished stub** (empty handler) and is not wired to any route, despite the `ResolutionLog` model existing.

## Architecture

Flow: `scheduler.service` → `history.service.executeMonitorCheck` → `checker.service` (axios, 5s timeout) → `analyzer.service` (state + `TREND_MATRIX` → `ServiceStatus`/`TrendStatus`) → `prisma.log.create` → `incident.service` `openIncident`/`resolvedIncident` → emitter → `notification.service` → `ai.service` (Gemini structured JSON, persisted as `AIInsight`, with historical context from the last 5 resolved incidents).

Layers: `routes/` (with OpenAPI JSDoc) → `controllers/` (thin req/res, delegate to services) → `services/` (business logic) → `lib/prisma.ts` singleton. Zod schemas in `src/schemas/`, applied via `validateSchema` / `validateParams` middleware. All routes are under `/api/v1/`; protected routes require `Authorization: Bearer <token>` (JWT payload `{ id, email }`).

Response envelope everywhere: `{ success, message?, error?, data? }`.

## Repo notes

- `docs/` and `.postman/` are gitignored. `docs/ARCHITECTURE.md` and `.github/copilot-instructions.md` are **stale** (reference `.js` filenames, old service names, a nonexistent `seed.ts`). Trust source over those docs.
- Working branch is `develop`; workflow (`.github/workflows/main.yml`) runs CI on `main` and `develop` (temporary Postgres + `prisma db push` before `npm test`, plus typecheck/build) and CD on `main` (`migrate deploy` a Supabase + webhook de Render).
- **Deployment setup is external to the repo:** GitHub Actions secrets `DATABASE_URL`/`DIRECT_URL` (Supabase direct IPv4, port `5432`) and `RENDER_DEPLOY_HOOK`; Render service builds from the repo Dockerfile with Auto-Deploy disabled (deploys only via the webhook) and runtime `DATABASE_URL` uses the Supabase pooler (`:6543?pgbouncer=true`). Don't create or change these from here.
- Commits follow conventional prefixes (`feat:`, `fix:`, `docs:`, `test:`, `db:`).
