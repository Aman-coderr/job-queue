"use client";

import React, { useState } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  XCircle,
  ExternalLink,
  ChevronRight,
  Clock,
  Zap,
  Mail,
  Image as ImageIcon,
  Sliders,
  AlertCircle,
} from 'lucide-react';
import { Job, JobStatus, JobType } from '@/types';

interface JobListProps {
  jobs: Job[];
  loading: boolean;
  onRefresh: () => void;
  onSelectJob: (job: Job) => void;
  onCancelJob: (jobId: string) => void;
}

const STATUS_FILTERS: Array<{ label: string; value: JobStatus | 'ALL' }> = [
  { label: 'All Jobs', value: 'ALL' },
  { label: 'Waiting', value: 'WAITING' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Retrying', value: 'RETRYING' },
  { label: 'Dead Letter', value: 'DEAD_LETTER' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export const JobList: React.FC<JobListProps> = ({
  jobs,
  loading,
  onRefresh,
  onSelectJob,
  onCancelJob,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<JobStatus | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<JobType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredJobs = jobs.filter((job) => {
    const jobStatusNorm = (job.status || '').replace(/\s+/g, '_').toUpperCase();
    if (selectedStatus !== 'ALL' && jobStatusNorm !== selectedStatus) return false;
    if (selectedType !== 'ALL' && job.type !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = job.id.toLowerCase().includes(q);
      const matchType = job.type.toLowerCase().includes(q);
      const matchPayload = JSON.stringify(job.payload).toLowerCase().includes(q);
      const matchKey = (job.idempotencyKey || '').toLowerCase().includes(q);
      if (!matchId && !matchType && !matchPayload && !matchKey) return false;
    }
    return true;
  });

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'WAITING':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            WAITING
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400 border border-blue-500/20 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            PROCESSING
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            COMPLETED
          </span>
        );
      case 'RETRYING':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-400 border border-purple-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-spin" />
            RETRYING
          </span>
        );
      case 'DEAD_LETTER':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-400 border border-rose-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            DEAD LETTER
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-400 border border-rose-500/20">
            FAILED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400 border border-zinc-700">
            CANCELLED
          </span>
        );
      default:
        return <span className="text-[11px] text-zinc-400">{status}</span>;
    }
  };

  const getTypeIcon = (type: JobType) => {
    switch (type) {
      case 'EMAIL':
        return <Mail className="h-3.5 w-3.5 text-sky-400" />;
      case 'IMAGE_RESIZE':
        return <ImageIcon className="h-3.5 w-3.5 text-emerald-400" />;
      case 'DUMMY':
        return <Sliders className="h-3.5 w-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by job ID, type, payload, or key..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as JobType | 'ALL')}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="EMAIL">Email</option>
            <option value="IMAGE_RESIZE">Image Resize</option>
            <option value="DUMMY">Dummy / Benchmark</option>
          </select>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_FILTERS.map((tab) => {
          const count =
            tab.value === 'ALL'
              ? jobs.length
              : jobs.filter((j) => j.status === tab.value).length;
          return (
            <button
              key={tab.value}
              onClick={() => setSelectedStatus(tab.value)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                selectedStatus === tab.value
                  ? 'bg-zinc-800 text-zinc-100 ring-1 ring-zinc-700'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300'
              }`}
            >
              <span>{tab.label}</span>
              <span className="rounded bg-zinc-950/80 px-1.5 py-0.2 text-[10px] font-mono text-zinc-400">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden shadow-sm">
        {filteredJobs.length === 0 ? (
          <div className="py-16 text-center">
            <Clock className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
            <p className="text-sm font-medium text-zinc-400">No jobs found in queue</p>
            <p className="text-xs text-zinc-600 mt-1">Submit a new job to start processing.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Job ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Retries</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredJobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => onSelectJob(job)}
                    className="hover:bg-zinc-800/40 cursor-pointer transition"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-zinc-200">
                          {job.id.substring(0, 13)}
                        </span>
                        {job.idempotencyKey && (
                          <span
                            title={`Idempotent key: ${job.idempotencyKey}`}
                            className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-mono text-indigo-400 ring-1 ring-indigo-500/20"
                          >
                            IDEM
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                        {getTypeIcon(job.type)}
                        <span>{job.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {job.priority === 1 || job.priority === 'HIGH' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400">
                          <Zap className="h-3 w-3 fill-current" />
                          HIGH
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-500">NORMAL</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">{getStatusBadge(job.status)}</td>
                    <td className="px-4 py-3.5 font-mono text-zinc-400">
                      {job.retries > 0 ? (
                        <span className="text-purple-400">
                          {job.retries}/{job.maxRetries}
                        </span>
                      ) : (
                        <span className="text-zinc-600">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-zinc-500 text-[11px]">
                      {new Date(job.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {job.resultUrl && (
                          <a
                            href={job.resultUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="View processed file"
                            className="rounded p-1 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}

                        {(job.status === 'WAITING' || job.status === 'RETRYING') && (
                          <button
                            onClick={() => onCancelJob(job.id)}
                            title="Cancel queued job"
                            className="rounded p-1 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 transition"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => onSelectJob(job)}
                          className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
