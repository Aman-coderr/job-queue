import Redis from "ioredis";
import { getIO } from "./socket";

export function startJobUpdateSubscriber() {
  const subscriber = new Redis(process.env.REDIS_URL as string);

  subscriber.subscribe("job-updates", (err) => {
    if (err) {
      console.error("Failed to subscribe to job-updates:", err);
      return;
    }
    console.log("Subscribed to job-updates channel");
  });

  subscriber.on("message", (channel, message) => {
    if (channel !== "job-updates") return;

    try {
      const { jobId, userId, status } = JSON.parse(message);
      getIO().to(`user-${userId}`).emit("job:updated", { jobId, status });
    } catch (err) {
      console.error("Failed to process job-updates message:", err);
    }
  });

  subscriber.on("error", (err) => {
    console.error("Job update subscriber error:", err);
  });
}
