// Jest setup file
import { prisma } from '../lib/prisma';

afterAll(async () => {
  await prisma.$disconnect();
});
