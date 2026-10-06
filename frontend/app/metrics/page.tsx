"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { MetricsOverview } from '@/components/MetricsOverview';
import { Job, QueueMetrics } from '@/types';
import { fetchJobs, fetchQueueStatus, setQueuePause as apiSetQueuePause } from '@/lib/api';
import { initializeSocket, closeSocket, SocketStatus } from '@/lib/socket';
import { Loader2, RefreshCw } from 'lucide-react';

export default function MetricsPage() {
  const router = useRouter();
  const { token, userEmail, isLoading, logout } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');
  const [isQueuePaused, setIsQueuePaused] = useState(false);

  useEffect(() => {
    if (!isLoading && !token) router.push('/login');
  }, [isLoading, token, router]);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchJobs();
      setJobs(data);
      const queue = await fetchQueueStatus().catch(() => ({ paused: false }));
      setIsQueuePaused(queue.paused);
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    loadData();
    initializeSocket(() => loadData(), setSocketStatus);
    return () => closeSocket();
  }, [token, loadData]);

  const metrics: QueueMetrics = {
    waiting: jobs.filter(j => j.status === 'WAITING').length,
    processing: jobs.filter(j => j.status === 'PROCESSING').length,
    completed: jobs.filter(j => j.status === 'COMPLETED').length,
    failed: jobs.filter(j => j.status === 'FAILED').length,
    retrying: jobs.filter(j => j.status === 'RETRYING').length,
    deadLetter: jobs.filter(j => j.status === 'DEAD_LETTER').length,
    total: jobs.length,
    queueHigh: jobs.filter(j => j.priority === 'HIGH' && j.status === 'WAITING').length,
    queueNormal: jobs.filter(j => j.priority !== 'HIGH' && j.status === 'WAITING').length,
    isPaused: isQueuePaused,
  };

  if (isLoading || !token) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-mono">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
          <span>Loading metrics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <Header
        socketStatus={socketStatus}
        isQueuePaused={isQueuePaused}
        onToggleQueuePause={async () => {
          const next = !isQueuePaused;
          setIsQueuePaused(next);
          await apiSetQueuePause(next);
        }}
        onOpenSubmitModal={() => router.push('/')}
        onOpenSettingsModal={() => { }}
        userEmail={userEmail}
        onLogout={logout}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl p-4 sm:p-6 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">
              Queue Metrics & Analytics
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Aggregated queue throughput, failure rates, and priority partition depth
            </p>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        <MetricsOverview metrics={metrics} jobs={jobs} />
      </main>
    </div>
  );
}
