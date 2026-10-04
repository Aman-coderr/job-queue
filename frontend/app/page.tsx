"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { JobList } from '@/components/JobList';
import { MetricsOverview } from '@/components/MetricsOverview';
import { WorkersView } from '@/components/WorkersView';
import { JobSubmitModal } from '@/components/JobSubmitModal';
import { JobDetailsModal } from '@/components/JobDetailsModal';
import { SettingsModal } from '@/components/SettingsModal';
import { Job, JobStatus, JobType, Priority, QueueMetrics, WorkerInfo } from '@/types';
import {
  fetchJobs,
  fetchJobById,
  cancelJob as apiCancelJob,
  fetchQueueStatus,
  setQueuePause as apiSetQueuePause,
  getAuthToken,
  getUserEmail,
  isDemoMode,
  setDemoMode,
} from '@/services/api';
import { initializeSocket, closeSocket, SocketStatus } from '@/services/socket';
import { INITIAL_MOCK_JOBS, INITIAL_MOCK_WORKERS } from '@/services/mockData';
import { Layers, Plus, Zap, AlertCircle, Play, Pause } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'metrics'>('jobs');
  const [jobs, setJobs] = useState<Job[]>(INITIAL_MOCK_JOBS);
  const [workers, setWorkers] = useState<WorkerInfo[]>(INITIAL_MOCK_WORKERS);
  const [loading, setLoading] = useState(false);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');
  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDemo, setIsDemo] = useState(true);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const calculateMetrics = useCallback((): QueueMetrics => {
    const normalize = (s: string) => s.replace(/\s+/g, '_').toUpperCase();
    const isHigh = (p: number | string) => p === 1 || p === 'HIGH';

    const waiting = jobs.filter((j) => normalize(j.status) === 'WAITING').length;
    const processing = jobs.filter((j) => normalize(j.status) === 'PROCESSING').length;
    const completed = jobs.filter((j) => normalize(j.status) === 'COMPLETED').length;
    const failed = jobs.filter((j) => normalize(j.status) === 'FAILED').length;
    const retrying = jobs.filter((j) => normalize(j.status) === 'RETRYING').length;
    const deadLetter = jobs.filter((j) => normalize(j.status) === 'DEAD_LETTER').length;
    const queueHigh = jobs.filter((j) => isHigh(j.priority) && normalize(j.status) === 'WAITING').length;
    const queueNormal = jobs.filter((j) => !isHigh(j.priority) && normalize(j.status) === 'WAITING').length;

    return {
      waiting,
      processing,
      completed,
      failed,
      retrying,
      deadLetter,
      total: jobs.length,
      queueHigh,
      queueNormal,
      isPaused: isQueuePaused,
    };
  }, [jobs, isQueuePaused]);

  const loadData = useCallback(async () => {
    if (isDemo) return;
    setLoading(true);
    try {
      const data = await fetchJobs();
      const normalizedData = data.map((j) => ({
        ...j,
        status: (j.status ? j.status.replace(/\s+/g, '_').toUpperCase() : 'WAITING') as JobStatus,
      }));
      setJobs(normalizedData);
      const queue = await fetchQueueStatus().catch(() => ({ paused: false }));
      setIsQueuePaused(queue.paused);
      setBannerNotice(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not reach backend API';
      setBannerNotice(`API connection: ${msg}. Showing sandbox preview.`);
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  const handleJobUpdateEvent = useCallback((update: { jobId: string; status: JobStatus | string }) => {
    const normalizedStatus = (update.status ? update.status.replace(/\s+/g, '_').toUpperCase() : 'WAITING') as JobStatus;

    setJobs((prevJobs) =>
      prevJobs.map((job) => {
        if (job.id === update.jobId) {
          const updated: Job = {
            ...job,
            status: normalizedStatus,
            updatedAt: new Date().toISOString(),
          };
          if (normalizedStatus === 'COMPLETED') {
            updated.completedAt = new Date().toISOString();
          }
          return updated;
        }
        return job;
      })
    );

    setSelectedJob((prev) => {
      if (prev && prev.id === update.jobId) {
        return {
          ...prev,
          status: normalizedStatus,
          updatedAt: new Date().toISOString(),
        };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    const demoSetting = isDemoMode();
    if (!token && !demoSetting) {
      setDemoMode(true);
      setIsDemo(true);
    } else {
      setIsDemo(demoSetting);
    }
  }, []);

  useEffect(() => {
    if (!isDemo) {
      loadData();
      initializeSocket(handleJobUpdateEvent, setSocketStatus);
    } else {
      setSocketStatus('connected');
    }

    return () => {
      closeSocket();
    };
  }, [isDemo, loadData, handleJobUpdateEvent]);

  useEffect(() => {
    if (!isDemo || isQueuePaused) return;

    const interval = setInterval(() => {
      setJobs((prev) => {
        const waitingJob = prev.find((j) => j.status === 'WAITING');
        if (waitingJob) {
          return prev.map((j) =>
            j.id === waitingJob.id
              ? {
                  ...j,
                  status: 'PROCESSING',
                  updatedAt: new Date().toISOString(),
                  logs: [
                    ...(j.logs || []),
                    {
                      id: `log-${Date.now()}`,
                      jobId: j.id,
                      workerId: 'worker-primary-1',
                      event: 'PROCESSING',
                      createdAt: new Date().toISOString(),
                    },
                  ],
                }
              : j
          );
        }

        const processingJob = prev.find((j) => j.status === 'PROCESSING');
        if (processingJob) {
          const isFail =
            processingJob.type === 'DUMMY' &&
            Number((processingJob.payload as { failRate?: number }).failRate || 0) > 0.5;

          if (isFail) {
            const nextRetries = processingJob.retries + 1;
            const canRetry = nextRetries < processingJob.maxRetries;
            const nextStatus: JobStatus = canRetry ? 'RETRYING' : 'DEAD_LETTER';

            return prev.map((j) =>
              j.id === processingJob.id
                ? {
                    ...j,
                    status: nextStatus,
                    retries: nextRetries,
                    lastError: canRetry
                      ? 'Simulated timeout: retry scheduled'
                      : 'Exceeded max retries (3): fatal error',
                    updatedAt: new Date().toISOString(),
                    logs: [
                      ...(j.logs || []),
                      {
                        id: `log-${Date.now()}`,
                        jobId: j.id,
                        workerId: 'worker-primary-2',
                        event: nextStatus,
                        duration: 2100,
                        error: canRetry
                          ? 'Simulated timeout: retry scheduled'
                          : 'Exceeded max retries (3): fatal error',
                        createdAt: new Date().toISOString(),
                      },
                    ],
                  }
                : j
            );
          } else {
            return prev.map((j) =>
              j.id === processingJob.id
                ? {
                    ...j,
                    status: 'COMPLETED',
                    completedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    logs: [
                      ...(j.logs || []),
                      {
                        id: `log-${Date.now()}`,
                        jobId: j.id,
                        workerId: 'worker-primary-1',
                        event: 'COMPLETED',
                        duration: 1250,
                        createdAt: new Date().toISOString(),
                      },
                    ],
                  }
                : j
            );
          }
        }

        const retryingJob = prev.find((j) => j.status === 'RETRYING');
        if (retryingJob) {
          return prev.map((j) =>
            j.id === retryingJob.id
              ? {
                  ...j,
                  status: 'WAITING',
                  updatedAt: new Date().toISOString(),
                }
              : j
          );
        }

        return prev;
      });

      setWorkers((prev) =>
        prev.map((w, idx) => ({
          ...w,
          lastHeartbeat: new Date().toISOString(),
          status: idx === 1 ? 'BUSY' : 'IDLE',
        }))
      );
    }, 3500);

    return () => clearInterval(interval);
  }, [isDemo, isQueuePaused]);

  const handleToggleQueuePause = async () => {
    const nextState = !isQueuePaused;
    setIsQueuePaused(nextState);

    if (!isDemo) {
      try {
        await apiSetQueuePause(nextState);
      } catch (err: unknown) {
        setIsQueuePaused(!nextState);
        const msg = err instanceof Error ? err.message : 'Failed to update queue';
        alert(msg);
      }
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (!isDemo) {
      try {
        await apiCancelJob(jobId);
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, status: 'CANCELLED' } : j))
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Cancel failed';
        alert(msg);
      }
    } else {
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: 'CANCELLED' } : j))
      );
    }
  };

  const handleSelectJob = async (job: Job) => {
    if (!isDemo) {
      try {
        const fullJob = await fetchJobById(job.id);
        setSelectedJob(fullJob);
        return;
      } catch {
        setSelectedJob(job);
      }
    } else {
      setSelectedJob(job);
    }
  };

  const handleMockJobAdd = (
    type: JobType,
    priority: Priority,
    payload: Record<string, unknown>,
    idempotencyKey?: string
  ) => {
    if (idempotencyKey && jobs.some((j) => j.idempotencyKey === idempotencyKey)) {
      return;
    }

    const newJob: Job = {
      id: `job-${Math.random().toString(36).substring(2, 10)}`,
      type,
      status: 'WAITING',
      priority: priority === 'HIGH' ? 1 : 0,
      payload,
      retries: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: 'usr-dev-1',
      idempotencyKey,
      resultUrl:
        type === 'IMAGE_RESIZE'
          ? (payload.fileUrl as string) ||
            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400'
          : undefined,
      logs: [],
    };

    setJobs((prev) => [newJob, ...prev]);
  };

  const handleAddWorker = () => {
    const newWorker: WorkerInfo = {
      id: `worker-replica-${workers.length + 1}`,
      status: 'IDLE',
      lastHeartbeat: new Date().toISOString(),
      activeJobs: 0,
    };
    setWorkers((prev) => [...prev, newWorker]);
  };

  const metrics = calculateMetrics();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        socketStatus={socketStatus}
        isQueuePaused={isQueuePaused}
        onToggleQueuePause={handleToggleQueuePause}
        onOpenSubmitModal={() => setIsSubmitOpen(true)}
        onOpenSettingsModal={() => setIsSettingsOpen(true)}
        userEmail={getUserEmail()}
        isDemo={isDemo}
      />

      {bannerNotice && (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-300">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>{bannerNotice}</span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="font-medium underline hover:text-white"
            >
              Configure Gateway
            </button>
          </div>
        </div>
      )}

      {isQueuePaused && (
        <div className="border-b border-amber-500/30 bg-amber-950/30 px-4 py-2 text-center text-xs text-amber-300 font-medium flex items-center justify-center gap-2">
          <Pause className="h-3.5 w-3.5 fill-current text-amber-400" />
          <span>Queue is currently PAUSED. Workers will not dequeue new jobs until resumed.</span>
        </div>
      )}

      <main className="flex-1 mx-auto w-full max-w-7xl p-4 sm:p-6 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-100">
                {activeTab === 'jobs' ? 'Asynchronous Job Stream' : 'System Metrics & Worker Fleet'}
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {activeTab === 'jobs'
                ? 'Submit, inspect, and monitor background tasks with live WebSocket telemetry'
                : 'Aggregated queue throughput, failure rates, and background worker heartbeats'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5">
                <span className="text-[11px] text-zinc-500">High Queue:</span>
                <span className="font-mono font-semibold text-indigo-400">{metrics.queueHigh}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5">
                <span className="text-[11px] text-zinc-500">Normal Queue:</span>
                <span className="font-mono font-semibold text-zinc-300">{metrics.queueNormal}</span>
              </div>
            </div>

            <button
              onClick={() => setIsSubmitOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Job</span>
            </button>
          </div>
        </div>

        {activeTab === 'jobs' ? (
          <JobList
            jobs={jobs}
            loading={loading}
            onRefresh={loadData}
            onSelectJob={handleSelectJob}
            onCancelJob={handleCancelJob}
          />
        ) : (
          <div className="space-y-8">
            <MetricsOverview metrics={metrics} jobs={jobs} />
            <WorkersView
              workers={workers}
              onRefresh={loadData}
              onAddWorker={handleAddWorker}
              isDemo={isDemo}
            />
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 text-center text-[11px] text-zinc-600">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 font-mono">
          <span>QueueCraft Engine · Node.js + Redis + PostgreSQL</span>
          <span>Day 15 & 16 Milestone</span>
        </div>
      </footer>

      <JobSubmitModal
        isOpen={isSubmitOpen}
        onClose={() => setIsSubmitOpen(false)}
        onJobCreated={loadData}
        isDemo={isDemo}
        onMockJobAdd={handleMockJobAdd}
      />

      <JobDetailsModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onCancelJob={handleCancelJob}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigChange={() => {
          setIsDemo(isDemoMode());
          loadData();
        }}
      />
    </div>
  );
}
