import { execSync } from 'child_process';

console.log('Running database migrations...');
try {
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('✅ Migrations complete');
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
