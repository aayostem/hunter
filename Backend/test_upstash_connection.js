import Redis from 'ioredis';

// Use the EXACT connection string from Upstash
const redisUrl = "rediss://default:akJCm0LPLp5NFMrRHYd2FbDfLzrfYVfU@national-ibex-19017.upstash.io:6379";

console.log('Testing with Redis password (NOT REST token)...');

const redis = new Redis(redisUrl, {
  tls: { rejectUnauthorized: false }
});

redis.on('connect', () => console.log('✅ Connected!'));
redis.on('ready', async () => {
  console.log('✅ Ready!');
  await redis.set('test', 'ok');
  const val = await redis.get('test');
  console.log('✅ Works:', val);
  process.exit(0);
});

redis.on('error', (err) => {
  console.error('❌ Failed:', err.message);
  if (err.message.includes('NOAUTH')) {
    console.error('   You used the wrong password!');
    console.error('   Make sure you copied from "Redis Client" section, not REST API');
  }
});