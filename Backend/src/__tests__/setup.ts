import { prisma } from '../lib/prisma';
import redis from '../config';

beforeAll(async () => {
  // Clean database before tests
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
  await redis.quit();
});

test('setup file', () => {
  expect(true).toBe(true);
});