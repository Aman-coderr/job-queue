import redisClient from "./redisClient";
export async function publishJobUpdate(jobId: string, userId: string, status: string) {
  await redisClient.publish(
    "job-updates",
    JSON.stringify({ jobId, userId, status })
  );
}
