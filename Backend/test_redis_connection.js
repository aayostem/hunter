import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

async function testRedisConnection() {
  console.log("🔍 Testing Redis connection...");
  console.log(
    "REDIS_URL:",
    process.env.REDIS_URL?.replace(/:([^:@]*)@/, ":***@")
  );

  const redis = new Redis(process.env.REDIS_URL, {
    retryStrategy: null,
    connectTimeout: 10000,
    maxRetriesPerRequest: 3,
    tls: {},
  });

  redis.on("error", (err) => {
    console.error("❌ Redis error:", err.message);
    if (err.code === "ETIMEDOUT") {
      console.log("\n🔧 Troubleshooting tips:");
      console.log("1. Disable VPN if active");
      console.log("2. Use the External hostname from Render dashboard");
      console.log("3. Ensure your REDIS_URL starts with rediss:// (not redis://)");
      console.log("4. Check Render dashboard that external access is enabled");
    }
  });

  try {
    const result = await redis.ping();
    console.log("✅ Redis ping successful:", result);

    await redis.set("test:key", "Hello Redis!");
    const value = await redis.get("test:key");
    console.log("✅ Set/Get test passed:", value);

    await redis.del("test:key");
    console.log("✅ Cleanup complete");

    process.exit(0);
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    process.exit(1);
  } finally {
    redis.disconnect();
  }
}

testRedisConnection();