import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma } from '../src/lib/prisma';

const execAsync = promisify(exec);

async function debugMigration() {
  console.log('🔍 Debugging Prisma Migration...\n');

  try {
    // 1. Check connection
    console.log('1. Testing database connection...');
    const result = await prisma.$queryRaw`SELECT current_database() as db, current_user as user, version() as version`;
    console.log('✅ Connected to:', result);
    
    // 2. Check existing tables
    console.log('\n2. Checking existing tables...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public' 
      ORDER BY table_name
    `;
    console.log('📊 Existing tables:', tables);

    // 3. Check migrations table
    console.log('\n3. Checking migrations history...');
    try {
      const migrations = await prisma.$queryRaw`
        SELECT * FROM _prisma_migrations ORDER BY started_at DESC
      `;
      console.log('📋 Migrations:', migrations);
    } catch (e) {
      console.log('ℹ️  No migrations table yet');
    }

    // 4. Check Prisma version
    console.log('\n4. Prisma version:');
    const { stdout: version } = await execAsync('npx prisma --version');
    console.log(version);

    // 5. Try to create a test migration
    console.log('\n5. Attempting to create test migration...');
    try {
      await execAsync('npx prisma migrate dev --name test --create-only --skip-generate');
      console.log('✅ Test migration created');
    } catch (e: any) {
      console.error('❌ Failed to create migration:', e.message);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMigration();