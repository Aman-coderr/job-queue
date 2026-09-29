import { Redis } from "ioredis"
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL is not defined in enviroment variables");
}
const redisClient = new Redis(redisUrl);

redisClient.on("connect", () => {
  console.log("Redis Client Connected");
});

redisClient.on("error", (err) => {
  console.log("Redis Client Error:", err);
});

export default redisClient;
