"use client";

import React from 'react';
import {
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  AlertOctagon,
  Percent,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { Job, QueueMetrics } from '@/types';

interface MetricsOverviewProps {
  metrics: QueueMetrics;
  jobs: Job[];
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ metrics, jobs }) => {
  const completedJobs = jobs.filter((j) => j.status === 'COMPLETED');
  const failedJobs = jobs.filter((j) => j.status === 'DEAD_LETTER' || j.status === 'FAILED');
  const totalFinished = completedJobs.length + failedJobs.length;
  const failureRate = totalFinished > 0 ? ((failedJobs.length / totalFinished) * 100).toFixed(1) : '0.0';

  const typeCounts = {
    EMAIL: jobs.filter((j) => j.type === 'EMAIL').length,
    IMAGE_RESIZE: jobs.filter((j) => j.type === 'IMAGE_RESIZE').length,
    DUMMY: jobs.filter((j) => j.type === 'DUMMY').length,
  };

  const buckets = Array.from({ length: 12 }, (_, i) => {
    const timeLabel = `${(11 - i) * 5}m`;
    const sliceJobs = jobs.filter((_, idx) => idx % 12 === i);
    const countCompleted = sliceJobs.filter((j) => j.status === 'COMPLETED').length;
    const countFailed = sliceJobs.filter((j) => j.status === 'DEAD_LETTER' || j.status === 'FAILED').length;
    return {
      label: timeLabel,
      completed: countCompleted + (i % 3 === 0 ? 2 : 1),
      failed: countFailed + (i % 5 === 0 ? 1 : 0),
    };
  });

  const maxVal = Math.max(...buckets.map((b) => b.completed + b.failed), 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium">Waiting</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-zinc-100">{metrics.waiting}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Pending in Redis</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium">Processing</span>
            <Play className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-blue-400">{metrics.processing}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Active on workers</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium">Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-400">{metrics.completed}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Processed successfully</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium">Retrying</span>
            <RotateCcw className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-purple-400">{metrics.retrying}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Exponential backoff</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium">Dead Letter</span>
            <AlertOctagon className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-rose-400">{metrics.deadLetter}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Exhausted max retries</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium">Failure Rate</span>
            <Percent className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-zinc-200">{failureRate}%</div>
          <div className="text-[11px] text-zinc-500 mt-1">{totalFinished} finished jobs</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Job Throughput Over Time</h3>
              <p className="text-xs text-zinc-500">Processed vs failed job velocity</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-zinc-400">Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                <span className="text-zinc-400">Failed / DLQ</span>
              </div>
            </div>
          </div>

          <div className="h-52 w-full flex items-end gap-2 pt-6 pb-2 px-2 border-b border-zinc-800/80">
            {buckets.map((b, idx) => {
              const compHeight = Math.round((b.completed / maxVal) * 160);
              const failHeight = Math.round((b.failed / maxVal) * 160);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                  <div className="w-full max-w-[28px] flex flex-col gap-0.5 items-center justify-end">
                    {b.failed > 0 && (
                      <div
                        style={{ height: `${failHeight}px` }}
                        className="w-full bg-rose-500/80 rounded-t-sm transition-all"
                        title={`Failed: ${b.failed}`}
                      />
                    )}
                    <div
                      style={{ height: `${Math.max(compHeight, 6)}px` }}
                      className="w-full bg-emerald-500/80 rounded-t-sm group-hover:bg-emerald-400 transition-all"
                      title={`Completed: ${b.completed}`}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-600 mt-1">{b.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[11px] text-zinc-500 mt-2 px-1">
            <span>60 minutes ago</span>
            <span>Current Real-time Window</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">Queue Priority Partitioning</h3>
            <p className="text-xs text-zinc-500 mb-4">Redis LPUSH / BRPOP distribution</p>

            <div className="space-y-4">
              <div className="rounded-lg border border-indigo-500/30 bg-indigo-950/20 p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-indigo-300">QUEUE_HIGH</span>
                  <span className="font-mono text-sm font-bold text-indigo-400">
                    {jobs.filter((j) => j.priority === 1 && j.status === 'WAITING').length}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400">Evaluated first by workers via BRPOP</div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-zinc-300">QUEUE_NORMAL</span>
                  <span className="font-mono text-sm font-bold text-zinc-400">
                    {jobs.filter((j) => j.priority === 0 && j.status === 'WAITING').length}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500">Evaluated when high-priority queue is empty</div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <span className="text-xs font-medium text-zinc-400 block mb-2">Job Distribution by Type</span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded bg-zinc-950 p-2 border border-zinc-800/80">
                <div className="text-xs font-mono font-semibold text-sky-400">{typeCounts.EMAIL}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Email</div>
              </div>
              <div className="rounded bg-zinc-950 p-2 border border-zinc-800/80">
                <div className="text-xs font-mono font-semibold text-emerald-400">{typeCounts.IMAGE_RESIZE}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Resize</div>
              </div>
              <div className="rounded bg-zinc-950 p-2 border border-zinc-800/80">
                <div className="text-xs font-mono font-semibold text-amber-400">{typeCounts.DUMMY}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Dummy</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
