import express from "express";
import multer from "multer";
import { createJob, cancelJob, EnqueueFailedError } from "../services/jobService";
import { getJobById, listJobs } from "../services/jobService";
import { jobSchema, idempotencyKeySchema } from "../validators/jobValidator";
import { authMiddleware } from "../middleware/authMiddleware";
import { upload } from "../config/upload";
import { pauseQueue, resumeQueue, isQueuePaused } from "shared";
const router = express.Router();

router.post("/create", authMiddleware, async (req, res) => {
  const parsedData = jobSchema.safeParse(req.body);
  if (!parsedData.success) {
    const errors = parsedData.error.issues.map((issue) => issue.message);
    return res.status(400).json({ message: errors.join(",") });
  }
  const rawKey = req.header("Idempotency-Key");
  let idempotencyKey: string | undefined;
  if (rawKey !== undefined) {
    const parsedKey = idempotencyKeySchema.safeParse(rawKey);
    if (!parsedKey.success) {
      return res.status(400).json({ message: "Invalid Idempotency-Key header" });
    }
    idempotencyKey = parsedKey.data;
  }
  try {
    const { type, priority, payload } = parsedData.data;
    const { jobId, duplicate } = await createJob(req.id!, type, priority, payload, idempotencyKey);
    res.status(duplicate ? 200 : 201).json({
      message: "Job Created", jobId, duplicate
    });
  }
  catch (e) {
    if (e instanceof EnqueueFailedError) {
      return res.status(503).json({ message: "Job could not be queued, please retry" });
    }
    console.error("Job creation error:", e);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const job = await getJobById(req.id!, req.params.id as string);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.json(job);
  } catch (e) {
    console.error("Get job error:", e);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/:id/result", authMiddleware, async (req, res) => {
  try {
    const job = await getJobById(req.id!, req.params.id as string);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    if (job.status !== "COMPLETED") {
      return res.status(202).json({ message: `Job is currently ${job.status}`, status: job.status });
    }
    res.json({ resultUrl: job.resultUrl });
  } catch (e) {
    console.error("Get job result error:", e);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { status, type } = req.query;
    const filters: { status?: string; type?: string } = {};
    if (typeof status === "string") filters.status = status;
    if (typeof type === "string") filters.type = type;
    const jobs = await listJobs(req.id!, filters);
    res.json(jobs);
  } catch (e) {
    console.error("List jobs error:", e);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.post("/upload", authMiddleware, (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(413).json({ message: "File too large (max 5MB)" });
      }
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) {
    return res.status(500).json({ message: "Server Configuration Error" });
  }
  const file = req.file as Express.MulterS3.File;
  res.json({
    fileUrl: `${publicUrl}/${file.key}`,
  });
})

router.post("/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const outcome = await cancelJob(req.id!, req.params.id as string);

    if (outcome.result === "NOT_FOUND") {
      return res.status(404).json({ message: "Job not found" });
    }
    if (outcome.result === "NOT_CANCELLABLE") {
      return res.status(409).json({
        message: `Job is ${outcome.status} and can no longer be cancelled`,
      });
    }
    res.json({ message: "Job cancelled", jobId: req.params.id });
  } catch (e) {
    console.error("Cancel job error:", e);
    res.status(500).json({ message: "Something went wrong" });
  }
});
router.post("/queue/pause", authMiddleware, async (req, res) => {
  await pauseQueue();
  res.json({ message: "Queue paused" });
});

router.post("/queue/resume", authMiddleware, async (req, res) => {
  await resumeQueue();
  res.json({ message: "Queue resumed" });
});

router.get("/queue/status", authMiddleware, async (req, res) => {
  const paused = await isQueuePaused();
  res.json({ paused });
});

export default router;

