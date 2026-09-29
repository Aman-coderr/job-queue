import redisClient from "./redisClient";
import { QUEUE_HIGH, QUEUE_NORMAL, QUEUE_KEYS_BY_PRIORITY, QUEUE_PAUSED } from './queueKeys';

export type Priority = "HIGH" | "NORMAL";

export async function enqueue(jobId: string, priority: Priority): Promise<void> {
  const key = priority === "HIGH" ? QUEUE_HIGH : QUEUE_NORMAL;
  await redisClient.lpush(key, jobId);
}

export async function dequeue(timeoutSeconds: number = 0): Promise<string | null> {
  const result = await redisClient.brpop(...QUEUE_KEYS_BY_PRIORITY, timeoutSeconds);
  if (!result) return null;
  const [, jobId] = result;
  return jobId;
}

export async function getQueueLength(): Promise<{ high: number; normal: number }> {
  const [high, normal] = await Promise.all([
    redisClient.llen(QUEUE_HIGH),
    redisClient.llen(QUEUE_NORMAL),
  ]);
  return { high, normal };
}
export async function removeFromQueue(jobId: string): Promise<number> {
  const [high, normal] = await Promise.all([
    redisClient.lrem(QUEUE_HIGH, 0, jobId),
    redisClient.lrem(QUEUE_NORMAL, 0, jobId),
  ]);
  return high + normal;
}
export async function pauseQueue(): Promise<void> {
  await redisClient.set(QUEUE_PAUSED, "1");
}

export async function resumeQueue(): Promise<void> {
  await redisClient.del(QUEUE_PAUSED);
}

export async function isQueuePaused(): Promise<boolean> {
  const val = await redisClient.get(QUEUE_PAUSED);
  return val === "1";
}
