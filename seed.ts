import { prisma } from './lib/prisma.js';

async function main() {
  console.log("🌱 Sembrando datos...");
  const monitor = await prisma.monitor.create({
    data: {
      url: "https://google.com",
      name: "Google",
    },
  });
  console.log("✅ Creado con ID:", monitor.id);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());