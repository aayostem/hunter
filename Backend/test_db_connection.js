import { PrismaClient } from '@prisma/client';

async function testConnection(DATABASE_URL) {
  console.log('Testing database connection...');
  console.log('DATABASE_URL:', DATABASE_URL.replace(/:[^:]*@/, ':***@'));
  
  const prisma = new PrismaClient();
  
  try {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('✅ Connection successful!', result);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check if your IP is allowed in Supabase Network Restrictions');
    console.log('2. Verify password is URL-encoded');
    console.log('3. Try using the connection pooler instead of direct connection');
    console.log('4. Make sure SSL is enabled (sslmode=require)');
  } finally {
    await prisma.$disconnect();
  }
}

testConnection(process.env.DIRECT_URL)
setTimeout(() => {
  console.log('\nTesting second database connection after 5 seconds...');
}, 5000);
testConnection(process.env.DATABASE_URL2)
testConnection(process.env.DATABASE_URL);
