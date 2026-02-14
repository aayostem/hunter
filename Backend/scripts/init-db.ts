import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
})

async function main() {
  console.log("Starting database initialization...");

  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: "test@emailsuite.com" },
    update: {},
    create: {
      email: "test@emailsuite.com",
      name: "Test User",
      plan: "PRO",
    },
  });

  console.log("Database initialized successfully");
  console.log("Test user created:", user.email);
}

main()
  .catch((e) => {
    console.error("Database initialization failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
