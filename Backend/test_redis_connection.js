import Redis from 'ioredis';
import dotenv from 'dotenv';



dotenv.config();

async function testRedisConnection() {
  console.log('🔍 Testing Redis connection...');
  console.log('REDIS_URL:', process.env.REDIS_URL?.replace(/:[^:@]*@/, ':***@'));

  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    retryStrategy: null, // Disable retry for testing
    connectTimeout: 5000,
  });

  redis.on('error', (err) => {
    console.error('❌ Redis error:', err.message);
    if (err.code === 'ETIMEDOUT') {
      console.log('\n🔧 Troubleshooting tips:');
      console.log('1. Is Redis running? Run: docker ps | grep redis');
      console.log('2. Is port 6379 exposed? Run: netstat -an | grep 6379');
      console.log('3. Check if firewall is blocking the connection');
      console.log('4. Verify REDIS_URL in .env file');
      console.log('5. Try: docker run -p 6379:6379 redis:alpine');
    }
    process.exit(1);
  });

  try {
    const result = await redis.ping();
    console.log('✅ Redis ping successful:', result);
    
    // Test basic operations
    await redis.set('test:key', 'Hello Redis!');
    const value = await redis.get('test:key');
    console.log('✅ Set/Get test passed:', value);
    
    await redis.del('test:key');
    console.log('✅ Cleanup complete');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  } finally {
    redis.disconnect();
  }
}

testRedisConnection();