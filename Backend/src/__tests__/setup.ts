import { prisma } from '../lib/prisma';

export const testUtils = {
  async clearDatabase() {
    await prisma.aIInsight.deleteMany();
    await prisma.linkClick.deleteMany();
    await prisma.emailOpen.deleteMany();
    await prisma.trackedEmail.deleteMany();
    await prisma.campaignTemplate.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.webhook.deleteMany();
    await prisma.notificationSettings.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.apiKey.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  }
};

afterAll(async () => {
  await prisma.$disconnect();
});

test('setup file', () => {
  expect(true).toBe(true);
});