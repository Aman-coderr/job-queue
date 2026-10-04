"use client";

import React from 'react';
import { Cpu, Activity, Clock, Zap, Plus, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { WorkerInfo } from '@/types';

interface WorkersViewProps {
  workers: WorkerInfo[];
  onRefresh: () => void;
  onAddWorker?: () => void;
  isDemo: boolean;
}

export const WorkersView: React.FC<WorkersViewProps> = ({
  workers,
  onRefresh,
  onAddWorker,
  isDemo,
}) => {
  const getHealthStatus = (heartbeatIso: string) => {
    const diffSeconds = Math.round((Date.now() - new Date(heartbeatIso).getTime()) / 1000);
    if (diffSeconds <= 30) {
      return { label: 'HEALTHY', color: 'emerald', text: `${diffSeconds}s ago` };
    } else if (diffSeconds <= 60) {
      return { label: 'LAGGING', color: 'amber', text: `${diffSeconds}s ago` };
    } else {
      return { label: 'STALE', color: 'rose', text: `${diffSeconds}s ago` };
    }
  };

  const busyWorkers = workers.filter((w) => w.status === 'BUSY').length;
  const idleWorkers = workers.filter((w) => w.status === 'IDLE').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">Worker Fleet Architecture</h2>
          <p className="text-xs text-zinc-400">
            Node.js background consumers tracking heartbeats and atomic job claims
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isDemo && onAddWorker && (
            <button
              onClick={onAddWorker}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Spawn Worker Instance</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Heartbeats</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-xs font-medium">Registered Instances</span>
            <Cpu className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-zinc-100">{workers.length}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Worker fleet size</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-xs font-medium">Busy Processing</span>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-blue-400">{busyWorkers}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Executing job handlers</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-xs font-medium">Idle & Polling</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-400">{idleWorkers}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Listening via Redis BRPOP</div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden shadow-sm">
        <div className="border-b border-zinc-800 bg-zinc-950/50 px-4 py-3">
          <h3 className="text-xs font-semibold text-zinc-300">Live Worker Heartbeat Registry</h3>
        </div>

        {workers.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            No active worker instances connected. Run `node workers/src/index.ts` to spin up a worker.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Worker ID</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Active Jobs</th>
                  <th className="px-4 py-3">Last Heartbeat</th>
                  <th className="px-4 py-3">Liveness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {workers.map((worker) => {
                  const health = getHealthStatus(worker.lastHeartbeat);
                  return (
                    <tr key={worker.id} className="hover:bg-zinc-800/40 transition">
                      <td className="px-4 py-3.5 font-mono text-zinc-200 font-medium">
                        {worker.id}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-medium ${
                            worker.status === 'BUSY'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              worker.status === 'BUSY' ? 'bg-blue-400 animate-pulse' : 'bg-zinc-500'
                            }`}
                          />
                          {worker.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-zinc-300">
                        {worker.activeJobs} <span className="text-zinc-500">/ 3 max</span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-zinc-400 text-[11px]">
                        {new Date(worker.lastHeartbeat).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-[11px] ${
                            health.color === 'emerald'
                              ? 'text-emerald-400'
                              : health.color === 'amber'
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              health.color === 'emerald'
                                ? 'bg-emerald-400 animate-pulse'
                                : health.color === 'amber'
                                ? 'bg-amber-400'
                                : 'bg-rose-400'
                            }`}
                          />
                          {health.label} ({health.text})
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
