# ============================================================
# STAGE 1: Build frontend (React + Vite)
# ============================================================
FROM node:22-alpine AS frontend

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend ./
RUN npm run build

# ============================================================
# STAGE 2: Backend (Express + TS)
# ============================================================
FROM node:22-alpine

WORKDIR /app

# 1. Instalar dependencias
COPY package*.json ./
RUN npm install

# 2. Generar cliente de Prisma
COPY prisma ./prisma
RUN npx prisma generate

# 3. Copiar el código fuente
COPY . .

# 4. COMPILAR TYPESCRIPT (Genera la carpeta dist/)
RUN npm run build

# 5. Copiar el frontend ya compilado desde el stage anterior
COPY --from=frontend /frontend/dist ./frontend/dist

EXPOSE 3000

# 6. Aplicar migraciones a la BD y arrancar la app desde dist/app.js
CMD npx prisma migrate deploy && npm start
