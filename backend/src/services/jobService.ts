import "dotenv/config"
import { enqueue, prisma, Prisma, removeFromQueue } from "shared";

type emailSchema = {
  to: string;
  subject: string;
  body: string;
};
type imageSchema = {
  fileUrl: string;
  width: number;
  height: number;
}
type dummySchema = {
  duration: number;
  failRate: number;
}

export class EnqueueFailedError extends Error {
  constructor(jobId: string) {
    super(`Failed to enqueue job ${jobId}`);
    this.name = "EnqueueFailedError";
  }
}

function isUniqueViolation(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export async function createJob(
  userId: string, type: "IMAGE_RESIZE" | "EMAIL" | "DUMMY",
  priority: "HIGH" | "NORMAL", payload: emailSchema | imageSchema | dummySchema, idempotencyKey?: string): Promise<{ jobId: string, duplicate: boolean }> {
  const priorityValue = priority === "HIGH" ? 1 : 0;
  try {
    const job = await prisma.job.create({
      data: {
        userId,
        type,
        priority: priorityValue,
        payload,
        ...(idempotencyKey && { idempotencyKey }),
        logs: { create: { event: "WAITING" } },
      },
    });

    try {
      await enqueue(job.id, priority);
    } catch (e) {
      console.error("Enqueue failed for job", job.id, e);
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          lastError: "enqueue failed",
          idempotencyKey: null,
        },
      }).catch((updateErr: unknown) => console.error(`Failed to mark job ${job.id} FAILED:`, updateErr));
      await prisma.jobLog.create({
        data: { jobId: job.id, event: "FAILED", error: "enqueue failed" },
      }).catch((logErr: unknown) => console.error(`Failed to write JobLog for ${job.id}:`, logErr));
      throw new EnqueueFailedError(job.id);
    }

    return { jobId: job.id, duplicate: false };
  } catch (e) {
    if (!idempotencyKey || !isUniqueViolation(e)) throw e;
    const existing = await prisma.job.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
    });
    if (!existing) throw e;
    return { jobId: existing.id, duplicate: true };
  }
}

export async function getJobById(userId: string, jobId: string) {
  return prisma.job.findFirst({
    where: {
      id: jobId,
      userId,
    },
  });
}

export async function listJobs(
  userId: string,
  filters: { status?: string; type?: string }
) {
  return prisma.job.findMany({
    where: {
      userId,
      ...(filters.status && { status: filters.status as any }),
      ...(filters.type && { type: filters.type as any }),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function cancelJob(userId: string, jobId: string) {
  try {
    const { count } = await prisma.job.updateMany({
      where: {
        id: jobId,
        userId,
        status: {
          in: ["WAITING", "RETRYING"]
        }
      },
      data: {
        status: "cancelled"
      },
    }
    );
    if (count === 0) {
      const job = await prisma.job.findFirst({
        where: { id: jobId, userId },
        select: { status: true },
      });
      if (!job) return { result: "NOT_FOUND" as const };
      return { result: "NOT_CANCELLABLE" as const, status: job.status };
    }
    await prisma.jobLog.create({
      data: {
        jobId,
        event: "CANCELLED"
      }
    });

    await removeFromQueue(jobId).catch((err) =>
      console.error(`Failed to remove ${jobId} from queue:`, err)
    );

    return { result: "CANCELLED" as const };
  }
  catch (e) {
    throw new Error("Failed to Cancel Job");
  }
}
