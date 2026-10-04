"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { WorkersView } from '@/components/WorkersView';
import { WorkerInfo } from '@/types';
import { fetchWorkers, fetchQueueStatus, setQueuePause as apiSetQueuePause } from '@/lib/api';
import { initializeSocket, closeSocket, SocketStatus } from '@/lib/socket';
import { Loader2 } from 'lucide-react';

export default function WorkersPage() {
  const router = useRouter();
  const { token, userEmail, isLoading, logout } = useAuth();
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');
  const [isQueuePaused, setIsQueuePaused] = useState(false);

  useEffect(() => {
    if (!isLoading && !token) router.push('/login');
  }, [isLoading, token, router]);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchWorkers();
      setWorkers(data);
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

  if (isLoading || !token) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-mono">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
          <span>Loading workers...</span>
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
        onOpenSettingsModal={() => {}}
        userEmail={userEmail}
        onLogout={logout}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl p-4 sm:p-6 sm:py-8 space-y-6">
        <div className="border-b border-zinc-800/80 pb-4">
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            Distributed Worker Fleet
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time cluster worker heartbeats, status badges, and active job concurrency (Day 16)
          </p>
        </div>

        <WorkersView workers={workers} onRefresh={loadData} isDemo={false} />
      </main>
    </div>
  );
}
