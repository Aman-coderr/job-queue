import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();
const redis = new Redis(process.env.REDIS_URL as string);
redis.set("test_key", "hello_from_job_queue").then(() => {
  redis.get("test_key").then((val) => {
    console.log("Redis test value:", val);
    process.exit(0);
  });
});
