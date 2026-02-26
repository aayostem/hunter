// Jest setup file
import { prisma } from '../lib/prisma';

afterAll(async () => {
  await prisma.$disconnect();
});


// Add a dummy test to satisfy Jest
test('setup file', () => {
  expect(true).toBe(true);
});