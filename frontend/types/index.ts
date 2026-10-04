export type JobType = 'EMAIL' | 'IMAGE_RESIZE' | 'DUMMY';

export type JobStatus =
  | 'WAITING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRYING'
  | 'DEAD_LETTER'
  | 'CANCELLED';

export type Priority = 'NORMAL' | 'HIGH';

export interface JobLog {
  id: string;
  jobId: string;
  workerId?: string | null;
  event: string;
  duration?: number | null;
  error?: string | null;
  createdAt: string;
}

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  priority: number | Priority;
  payload: Record<string, unknown>;
  retries: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string | null;
  completedAt?: string | null;
  userId: string;
  resultUrl?: string | null;
  lastError?: string | null;
  idempotencyKey?: string | null;
  logs?: JobLog[];
}

export interface WorkerInfo {
  id: string;
  status: 'IDLE' | 'BUSY';
  lastHeartbeat: string;
  activeJobs: number;
}

export interface QueueMetrics {
  waiting: number;
  processing: number;
  completed: number;
  failed: number;
  retrying: number;
  deadLetter: number;
  total: number;
  queueHigh: number;
  queueNormal: number;
  isPaused: boolean;
}
