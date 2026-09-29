export const QUEUE_HIGH = "queue:high";
export const QUEUE_NORMAL = "queue:normal";

export const QUEUE_KEYS_BY_PRIORITY = [QUEUE_HIGH, QUEUE_NORMAL] as const;

export const PROCESSING_PREFIX = "processing:";
export const processingKey = (workerId: string) => `${PROCESSING_PREFIX}${workerId}`;

export const DEAD_LETTER_QUEUE = "queue:dead_letter";
export const QUEUE_PAUSED = "queue:paused";

