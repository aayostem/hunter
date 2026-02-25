import Redis from "ioredis";
import dotenv from "dotenv";


dotenv.config();

const {
  REDIS_SERVICE_NAME,
  REDIS_HOST,
  REDIS_PASSWORD,
  REDIS_PORT
} = process.env;

const renderRedis = new Redis({
  // Render Redis service name, red-xxxxxxxxxxxxxxxxxxxx
  username: REDIS_SERVICE_NAME,
  // Render Redis hostname, HOSTNAME.render.com
  host: REDIS_HOST,
  // Provided password
  password: REDIS_PASSWORD,
  // Default Redis port
  port: REDIS_PORT || 6379,
  // TLS required when externally connecting to Render Redis
  tls: { rejectUnauthorized: false },
});

console.log("Connected to Render Redis! 🚀");

console.log({
  host: REDIS_HOST,
  port: REDIS_PORT,
  hasPassword: !!REDIS_PASSWORD,
  username: REDIS_SERVICE_NAME,
});

renderRedis.on("error", (err) => console.error("Redis error:", err));
renderRedis.on("connect", () => console.log("Connected to Render Redis! 🚀"));

renderRedis.set("animal", "dog");

renderRedis.get("animal").then((result) => {
  console.log(`Result for key animal: ${result}`); // Prints "dog"
});

renderRedis.del("animal");