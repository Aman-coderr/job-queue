import { Job, JobType, Priority, WorkerInfo, QueueMetrics } from '@/types';

const STORAGE_KEYS = {
  TOKEN: 'queuecraft_auth_token',
  API_URL: 'queuecraft_api_url',
};

const DEFAULT_API_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  'http://localhost:3000';

export function getApiUrl(): string {
  try {
    const custom = localStorage.getItem(STORAGE_KEYS.API_URL);
    if (custom) return custom;
  } catch {
    // SSR / Storage access handling
  }
  return DEFAULT_API_URL;
}

export function setApiUrl(url: string): void {
  localStorage.setItem(STORAGE_KEYS.API_URL, url);
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null, email?: string): void {
  if (token) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    if (email) localStorage.setItem('queuecraft_user_email', email);
  } else {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem('queuecraft_user_email');
  }
}

export function getUserEmail(): string | null {
  try {
    return localStorage.getItem('queuecraft_user_email');
  } catch {
    return null;
  }
}

export function isDemoMode(): boolean {
  try {
    return localStorage.getItem('queuecraft_demo_mode') === 'true';
  } catch {
    return false;
  }
}

export function setDemoMode(val: boolean): void {
  localStorage.setItem('queuecraft_demo_mode', String(val));
}

function getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Step 3: Auth API
export async function registerUser(email: string, password: string): Promise<{ message: string; userId?: string }> {
  const baseUrl = getApiUrl();
  const res = await fetch(`${baseUrl}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Signup failed (${res.status})`);
  }
  return data;
}

export async function loginUser(email: string, password: string): Promise<{ token: string; user?: any }> {
  const baseUrl = getApiUrl();
  const res = await fetch(`${baseUrl}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Sign in failed (${res.status})`);
  }
  return data;
}

// Step 1 & Step 4: Job API
export async function createJob(
  type: JobType,
  priority: Priority,
  payload: Record<string, any>,
  idempotencyKey?: string
): Promise<{ message: string; jobId: string; duplicate?: boolean }> {
  const baseUrl = getApiUrl();
  const headers: Record<string, string> = getHeaders();
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const res = await fetch(`${baseUrl}/jobs/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ type, priority, payload }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Job creation failed (${res.status})`);
  }
  return data;
}

export async function uploadJobFile(file: File): Promise<string> {
  const baseUrl = getApiUrl();
  const formData = new FormData();
  formData.append('file', file);

  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}/jobs/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `File upload failed (${res.status})`);
  }

  const data = await res.json();
  return data.fileUrl;
}

export async function fetchJobs(filters?: { status?: string; type?: string }): Promise<Job[]> {
  const baseUrl = getApiUrl();
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
  if (filters?.type && filters.type !== 'ALL') params.append('type', filters.type);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${baseUrl}/jobs${query}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `Failed to fetch jobs (${res.status})`);
  }
  return res.json();
}

export async function fetchJobById(id: string): Promise<Job> {
  const baseUrl = getApiUrl();
  const res = await fetch(`${baseUrl}/jobs/${id}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Job not found (${res.status})`);
  }
  return res.json();
}

export async function cancelJob(id: string): Promise<{ message: string; jobId: string }> {
  const baseUrl = getApiUrl();
  const res = await fetch(`${baseUrl}/jobs/${id}/cancel`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to cancel job (${res.status})`);
  }
  return res.json();
}

// Queue Controls
export async function fetchQueueStatus(): Promise<{ paused: boolean }> {
  const baseUrl = getApiUrl();
  const res = await fetch(`${baseUrl}/jobs/queue/status`, {
    method: 'GET',
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch queue status (${res.status})`);
  }
  return res.json();
}

export async function setQueuePause(paused: boolean): Promise<void> {
  const baseUrl = getApiUrl();
  const endpoint = paused ? '/jobs/queue/pause' : '/jobs/queue/resume';
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `Failed to update queue state`);
  }
}

// Step 10 & 11: Metrics & Workers
export async function fetchMetrics(): Promise<QueueMetrics | null> {
  const baseUrl = getApiUrl();
  try {
    const res = await fetch(`${baseUrl}/jobs/metrics`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (res.ok) return await res.json();
  } catch {
    // Handled by client
  }
  return null;
}

export async function fetchWorkers(): Promise<WorkerInfo[]> {
  const baseUrl = getApiUrl();
  try {
    const res = await fetch(`${baseUrl}/jobs/workers`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (res.ok) return await res.json();
  } catch {
    // Handled by client
  }
  return [];
}
