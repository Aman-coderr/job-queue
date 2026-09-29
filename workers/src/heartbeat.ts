import { prisma } from "shared";

export async function registerWorker(workerId: string) {
  await prisma.worker.upsert({
    where: { id: workerId },
    update: { status: "IDLE", lastHeartbeat: new Date() },
    create: { id: workerId, status: "IDLE", lastHeartbeat: new Date() },
  });
}

export async function sendHeartbeat(workerId: string) {
  await prisma.worker.update({
    where: { id: workerId },
    data: { lastHeartbeat: new Date() },
  }).catch((err) => console.error(`[${workerId}] Heartbeat update failed:`, err));
}

export function startHeartbeatLoop(workerId: string, intervalMs: number = 5000) {
  setInterval(() => sendHeartbeat(workerId), intervalMs);
}
