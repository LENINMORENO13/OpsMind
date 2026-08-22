FROM node:20-alpine

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

EXPOSE 3000

# 5. Aplicar esquema a la BD y arrancar la app desde dist/app.js
CMD npx prisma db push && npm start