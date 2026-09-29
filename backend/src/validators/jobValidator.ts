import * as z from "zod";

const emailPayloadSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

const imageResizePayloadSchema = z.object({
  fileUrl: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
});

const dummyPayloadSchema = z.object({
  duration: z.number().positive(),
  failRate: z.number().min(0).max(1),
});

const prioritySchema = z.enum(["HIGH", "NORMAL"]);

export const idempotencyKeySchema = z.string().trim().min(1).max(255);

export const jobSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("EMAIL"), priority: prioritySchema, payload: emailPayloadSchema }),
  z.object({ type: z.literal("IMAGE_RESIZE"), priority: prioritySchema, payload: imageResizePayloadSchema }),
  z.object({ type: z.literal("DUMMY"), priority: prioritySchema, payload: dummyPayloadSchema }),
])

