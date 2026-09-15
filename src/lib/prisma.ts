import pkg from "pg";
const { Pool } = pkg;
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

// En entorno de prueba usar la BD aislada (opsmind_test) para no corruptuar datos de producción
const connectionString =
  process.env.NODE_ENV === "test"
    ? process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    : process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;