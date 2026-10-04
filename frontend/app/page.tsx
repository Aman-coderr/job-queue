"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { JobList } from '@/components/JobList';
import { JobSubmitModal } from '@/components/JobSubmitModal';
import { JobDetailsModal } from '@/components/JobDetailsModal';
import { SettingsModal } from '@/components/SettingsModal';
import { Job, JobStatus } from '@/types';
import {
  fetchJobs,
  fetchJobById,
  cancelJob as apiCancelJob,
  fetchQueueStatus,
  setQueuePause as apiSetQueuePause,
} from '@/lib/api';
import { initializeSocket, closeSocket, SocketStatus } from '@/lib/socket';
import { AlertCircle, Pause, Loader2, Plus } from 'lucide-react';

export default function JobsDashboardPage() {
  const router = useRouter();
  const { token, userEmail, isLoading, logout } = useAuth();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');
  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Auth Guard: redirect to /login if unauthenticated
  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/login');
    }
  }, [isLoading, token, router]);

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
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
      setBannerNotice(`API warning: ${msg}`);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  const handleWebSocketUpdate = useCallback((_payload: { jobId: string; status: JobStatus | string }) => {
    loadData(true);
  }, [loadData]);

  useEffect(() => {
    if (!token) return;
    loadData();
    initializeSocket(handleWebSocketUpdate, setSocketStatus);

    return () => {
      closeSocket();
    };
  }, [token, loadData, handleWebSocketUpdate]);

  const handleToggleQueuePause = async () => {
    const nextState = !isQueuePaused;
    setIsQueuePaused(nextState);
    try {
      await apiSetQueuePause(nextState);
    } catch (err: unknown) {
      setIsQueuePaused(!nextState);
      alert(err instanceof Error ? err.message : 'Failed to update queue state');
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await apiCancelJob(jobId);
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: 'CANCELLED' } : j))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Cancel failed');
    }
  };

  const handleSelectJob = async (job: Job) => {
    try {
      const fullJob = await fetchJobById(job.id);
      setSelectedJob(fullJob);
    } catch {
      setSelectedJob(job);
    }
  };

  if (isLoading || !token) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-mono">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
          <span>Verifying authentication...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Header
        socketStatus={socketStatus}
        isQueuePaused={isQueuePaused}
        onToggleQueuePause={handleToggleQueuePause}
        onOpenSubmitModal={() => setIsSubmitOpen(true)}
        onOpenSettingsModal={() => setIsSettingsOpen(true)}
        userEmail={userEmail}
        onLogout={logout}
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
              Configure Gateway URL
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
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">
              Asynchronous Job Stream
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Submit, inspect, and monitor background tasks with live WebSocket telemetry (Day 15)
            </p>
          </div>

          <button
            onClick={() => setIsSubmitOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Job</span>
          </button>
        </div>

        <JobList
          jobs={jobs}
          loading={loading}
          onRefresh={() => loadData(false)}
          onSelectJob={handleSelectJob}
          onCancelJob={handleCancelJob}
        />
      </main>

      <JobSubmitModal
        isOpen={isSubmitOpen}
        onClose={() => setIsSubmitOpen(false)}
        onJobCreated={() => loadData(true)}
      />

      <JobDetailsModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onCancelJob={handleCancelJob}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigChange={() => loadData(false)}
      />
    </div>
  );
}
