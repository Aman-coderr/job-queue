import { Job, JobStatus, JobType, WorkerInfo } from '@/types';

const STORAGE_KEYS = {
  API_URL: 'queuecraft_api_url',
  AUTH_TOKEN: 'queuecraft_auth_token',
  USER_EMAIL: 'queuecraft_user_email',
  DEMO_MODE: 'queuecraft_demo_mode',
};

export const getApiUrl = (): string => {
  if (typeof window === 'undefined') return 'http://localhost:3000';
  return localStorage.getItem(STORAGE_KEYS.API_URL) || 'http://localhost:3000';
};

export const setApiUrl = (url: string) => {
  localStorage.setItem(STORAGE_KEYS.API_URL, url.replace(/\/$/, ''));
};

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
};

export const setAuthToken = (token: string | null, email?: string) => {
  if (token) {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    if (email) localStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
  } else {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  }
};

export const getUserEmail = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
};

export const isDemoMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEYS.DEMO_MODE) === 'true';
};

export const setDemoMode = (enabled: boolean) => {
  localStorage.setItem(STORAGE_KEYS.DEMO_MODE, enabled ? 'true' : 'false');
};

const getHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export async function fetchJobs(filters?: { status?: string; type?: string }): Promise<Job[]> {
  const baseUrl = getApiUrl();
  const query = new URLSearchParams();
  if (filters?.status && filters.status !== 'ALL') query.set('status', filters.status);
  if (filters?.type && filters.type !== 'ALL') query.set('type', filters.type);

  const url = `${baseUrl}/jobs${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch jobs (${res.status})`);
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
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch job (${res.status})`);
  }
  return res.json();
}

export async function createJob(
  type: JobType,
  priority: 'NORMAL' | 'HIGH',
  payload: Record<string, unknown>,
  idempotencyKey?: string
): Promise<{ message: string; jobId: string; duplicate?: boolean }> {
  const baseUrl = getApiUrl();
  const extraHeaders: Record<string, string> = {};
  if (idempotencyKey && idempotencyKey.trim()) {
    extraHeaders['Idempotency-Key'] = idempotencyKey.trim();
  }

  const res = await fetch(`${baseUrl}/jobs/create`, {
    method: 'POST',
    headers: getHeaders(extraHeaders),
    body: JSON.stringify({
      type,
      priority,
      payload,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to create job (${res.status})`);
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

export async function loginUser(email: string, password: string): Promise<{ token: string }> {
  const baseUrl = getApiUrl();
  const res = await fetch(`${baseUrl}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `Login failed (${res.status})`);
  }
  return res.json();
}

export async function registerUser(email: string, password: string): Promise<{ token?: string }> {
  const baseUrl = getApiUrl();
  const res = await fetch(`${baseUrl}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `Registration failed (${res.status})`);
  }
  return res.json();
}
