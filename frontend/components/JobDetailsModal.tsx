"use client";

import React from 'react';
import { X, Clock, AlertTriangle, CheckCircle, ExternalLink, Terminal, Shield, RefreshCw } from 'lucide-react';
import { Job } from '@/types';

interface JobDetailsModalProps {
  job: Job | null;
  onClose: () => void;
  onCancelJob: (id: string) => void;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({ job, onClose, onCancelJob }) => {
  if (!job) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold text-zinc-300">
              {job.id}
            </span>
            <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-400">
              {job.type}
            </span>
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                job.status === 'COMPLETED'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : job.status === 'PROCESSING'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
                  : job.status === 'RETRYING'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : job.status === 'DEAD_LETTER' || job.status === 'FAILED'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : job.status === 'CANCELLED'
                  ? 'bg-zinc-800 text-zinc-400'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {job.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-3">
              <span className="text-[11px] text-zinc-500 block mb-1">Priority</span>
              <span className={`text-xs font-semibold ${job.priority === 1 ? 'text-indigo-400' : 'text-zinc-300'}`}>
                {job.priority === 1 ? 'HIGH (1)' : 'NORMAL (0)'}
              </span>
            </div>
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-3">
              <span className="text-[11px] text-zinc-500 block mb-1">Retries</span>
              <span className="text-xs font-mono text-zinc-300">
                {job.retries} / {job.maxRetries}
              </span>
            </div>
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-3">
              <span className="text-[11px] text-zinc-500 block mb-1">Created At</span>
              <span className="text-xs font-mono text-zinc-400">
                {new Date(job.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-3">
              <span className="text-[11px] text-zinc-500 block mb-1">Idempotency Key</span>
              <span className="text-xs font-mono text-zinc-400 truncate block">
                {job.idempotencyKey || 'None'}
              </span>
            </div>
          </div>

          {job.lastError && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span>Last Encountered Error</span>
              </div>
              <pre className="mt-1 font-mono text-xs text-rose-300 whitespace-pre-wrap break-all bg-black/40 p-2.5 rounded">
                {job.lastError}
              </pre>
            </div>
          )}

          {job.resultUrl && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Processed Artifact</span>
                </div>
                <a
                  href={job.resultUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-emerald-300 hover:underline"
                >
                  Open Direct Link <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="overflow-hidden rounded border border-zinc-800 bg-black max-h-48 flex items-center justify-center">
                <img
                  src={job.resultUrl}
                  alt="Processed Output"
                  className="max-h-48 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-300">Payload Data</span>
            </div>
            <pre className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300 overflow-x-auto">
              {JSON.stringify(job.payload, null, 2)}
            </pre>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-300">Audit Trail (JobLog)</span>
            </div>
            {job.logs && job.logs.length > 0 ? (
              <div className="space-y-2">
                {job.logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-950 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-zinc-500">{new Date(log.createdAt).toLocaleTimeString()}</span>
                      <span className="font-semibold text-indigo-400">{log.event}</span>
                      {log.workerId && <span className="text-zinc-500">[{log.workerId}]</span>}
                    </div>
                    <div className="flex items-center gap-3 text-zinc-400 mt-1 sm:mt-0 font-mono text-[11px]">
                      {log.duration !== undefined && log.duration !== null && (
                        <span>{log.duration}ms</span>
                      )}
                      {log.error && (
                        <span className="text-rose-400 max-w-xs truncate" title={log.error}>
                          {log.error}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 text-center text-xs text-zinc-500">
                No intermediate audit log entries recorded yet.
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950/50 px-6 py-3">
          {job.status === 'WAITING' || job.status === 'RETRYING' ? (
            <button
              onClick={() => {
                onCancelJob(job.id);
                onClose();
              }}
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition"
            >
              Cancel This Job
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-4 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
