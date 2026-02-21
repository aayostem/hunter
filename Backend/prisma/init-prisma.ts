// // lib/prisma.ts or similar
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient({
//   datasourceUrl: process.env.DATABASE_URL,
// });

import { PrismaClient } from "@prisma/client";
import { addBreadcrumb } from "../src/lib/sentry";

const prisma = new PrismaClient({
  log: [{ emit: "event", level: "query" }],
});

prisma.$on("query", (e) => {
  addBreadcrumb(`Prisma: ${e.query}`, "db.prisma", {
    params: e.params,
    duration: `${e.duration}ms`,
  });
});

export default prisma;
