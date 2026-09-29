import * as dotenv from "dotenv";
dotenv.config();
import { enqueue, dequeue, isQueuePaused } from "shared";
import { prisma } from "shared";
import { emailSender } from "./executors/emailExecutor";
import { dummyExecutor } from "./executors/dummyExecutor";
import { imageResizeExecutor } from "./executors/imageResizeExecutor";
import { registerWorker, startHeartbeatLoop } from "./heartbeat";

const workerId = process.env.WORKER_ID || "worker-unknown";

export default async function worker() {
  while (true) {
    if (await isQueuePaused()) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      continue;
    }
    const jobId = await dequeue();
    if (!jobId) continue;

    const startTime = Date.now();
    let resultUrl: string | undefined;
    let hasIncremented = false;

    let job: Awaited<ReturnType<typeof prisma.job.findFirst>> = null;
    let jobLoaded = false;
    let executorSucceeded = false;
    try {
      job = await prisma.job.findFirst({ where: { id: jobId } });
      jobLoaded = true;

      if (!job) {
        console.log(`[${workerId}] Job ${jobId} not found, skipping`);
        continue;
      }

      if (job.status !== "WAITING" && job.status !== "RETRYING") {
        console.log(`[${workerId}] Job ${jobId} is ${job.status}, skipping`);
        continue;
      }

      const claim = await prisma.job.updateMany({
        where: { id: jobId, status: { in: ["WAITING", "RETRYING"] } },
        data: { status: "PROCESSING" },
      });
      if (claim.count === 0) {
        console.log(`[${workerId}] Lost claim on job ${jobId}, skipping`);
        continue;
      }

      await prisma.worker.update({
        where: { id: workerId },
        data: { activeJobs: { increment: 1 }, status: "BUSY" },
      });
      hasIncremented = true;

      await prisma.jobLog.create({
        data: { jobId: job.id, workerId, event: "PROCESSING" },
      });

      console.log(`[${workerId}] Processing job ${jobId} (type: ${job.type})`);

      const payload = job.payload as any;

      if (job.type === "EMAIL") {
        await emailSender(payload.to, payload.subject, payload.body);
      } else if (job.type === "DUMMY") {
        await dummyExecutor(payload.duration, payload.failRate);
      } else if (job.type === "IMAGE_RESIZE") {
        resultUrl = await imageResizeExecutor(payload.fileUrl, payload.width, payload.height);
      } else {
        throw new Error(`No executor implemented for job type: ${job.type}`);
      }
      executorSucceeded = true;

      const duration = Date.now() - startTime;

      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          lastError: null,
          completedAt: new Date(),
          ...(resultUrl && { resultUrl }),
        },
      }).catch((e) => {
        console.error(`[${workerId}] Failed to mark job ${jobId} COMPLETED:`, e);
        throw e;
      });

      await prisma.jobLog.create({
        data: {
          jobId: job.id,
          workerId,
          event: "COMPLETED",
          duration,
        },
      }).catch((e) => {
        console.error(`[${workerId}] Failed to write COMPLETED log for ${jobId}:`, e);
        throw e;
      });

      await prisma.worker.update({
        where: { id: workerId },
        data: {
          activeJobs: { decrement: 1 },
          status: "IDLE",
        },
      }).catch((e) => {
        console.error(`[${workerId}] Failed to mark worker ${workerId} IDLE:`, e);
        throw e;
      });

      console.log(`[${workerId}] Completed job ${jobId}`);

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[${workerId}] Error processing job ${jobId}:`, error);
      if (!jobLoaded) {
        console.error(`[${workerId}] Lookup failed for job ${jobId}, re-enqueueing:`, error);
        setTimeout(() => {
          enqueue(jobId, "NORMAL").catch((e) => console.error("Re-enqueue failed:", e));
        }, 1000);
        continue;
      }
      if (!job) continue;

      if (executorSucceeded) {
        console.error(`[${workerId}] Job ${jobId} succeeded but bookkeeping failed:`, error);

        await prisma.job.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            lastError: null,
            completedAt: new Date(),
            ...(resultUrl && { resultUrl }),
          },
        }).catch((e: unknown) => console.error(`[${workerId}] Could not mark ${jobId} COMPLETED:`, e));

        await prisma.jobLog.create({
          data: { jobId, workerId, event: "COMPLETED", duration },
        }).catch((e: unknown) => console.error(`[${workerId}] Failed to write COMPLETED log for ${jobId}:`, e));

        if (hasIncremented) {
          await prisma.worker.update({
            where: { id: workerId },
            data: { activeJobs: { decrement: 1 }, status: "IDLE" },
          }).catch((e: unknown) => console.error(`[${workerId}] Worker update failed:`, e));
        }
        continue;
      }
      await prisma.job.update({
        where: {
          id: jobId,
        },
        data: {
          status: "FAILED",
          lastError: error.message || String(error),
        }
      }).catch((updateErr: unknown) =>
        console.error(`[${workerId}] Failed to mark job ${jobId} as FAILED:`, updateErr));

      await prisma.jobLog.create({
        data: { jobId, workerId, event: "FAILED", duration, error: error.message || String(error) },
      }).catch((logErr: unknown) =>
        console.error(`[${workerId}] Failed to write JobLog for ${jobId}:`, logErr)
      );

      const currentRetries = job.retries;
      const canRetry = currentRetries < job.maxRetries;
      if (canRetry) {
        const nextRetryCount = currentRetries + 1;
        const delay = Math.pow(2, nextRetryCount) * 1000;

        await prisma.job.update({
          where: { id: jobId },
          data: { status: "RETRYING", retries: nextRetryCount },
        }).catch((e: unknown) => console.error(`[${workerId}] Failed to mark ${jobId} RETRYING:`, e));

        await prisma.jobLog.create({
          data: { jobId, workerId, event: "RETRYING", duration, error: error.message },
        }).catch((e: unknown) => console.error(`[${workerId}] Failed to write RETRYING log:`, e));

        const retryPriority = job.priority === 1 ? "HIGH" : "NORMAL";
        setTimeout(() => {
          enqueue(jobId, retryPriority).catch((e) => console.error("Re-enqueue failed:", e));
        }, delay);

        if (hasIncremented) {
          await prisma.worker.update({
            where: { id: workerId },
            data: { activeJobs: { decrement: 1 }, status: "IDLE" },
          }).catch((wErr: unknown) => console.error(`[${workerId}] Failed to update worker on retry:`, wErr));
        }

      }
      else {
        await prisma.job.update({
          where: { id: jobId },
          data: {
            status: "DEAD_LETTER",
            lastError: error.message || String(error)
          },
        }).catch((updateErr: unknown) =>
          console.error(`[${workerId}] Failed to mark job ${jobId} as DEAD_LETTER:`, updateErr));

        await prisma.jobLog.create({
          data: { jobId, workerId, event: "DEAD_LETTER", duration, error: error.message || String(error) },
        }).catch((logErr: unknown) =>
          console.error(`[${workerId}] Failed to write JobLog for ${jobId}:`, logErr)
        );

        if (hasIncremented) {
          await prisma.worker.update({
            where: { id: workerId },
            data: { activeJobs: { decrement: 1 }, status: "IDLE" },
          }).catch((wErr: unknown) =>
            console.error(`[${workerId}] Failed to update worker after failure:`, wErr)
          );
        }
      }
    }
  }
}
async function start() {
  await registerWorker(workerId);
  startHeartbeatLoop(workerId);
  worker().catch((err) => {
    console.error(`[${workerId}] Worker loop crashed:`, err);
    process.exit(1);
  });
}

start();
