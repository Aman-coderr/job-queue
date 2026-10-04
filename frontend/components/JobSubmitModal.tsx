"use client";

import React, { useState } from 'react';
import { X, Upload, Mail, Image as ImageIcon, Sliders, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { JobType, Priority } from '@/types';
import { createJob, uploadJobFile } from '@/services/api';

interface JobSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: () => void;
  isDemo: boolean;
  onMockJobAdd?: (jobType: JobType, priority: Priority, payload: Record<string, unknown>, idempotencyKey?: string) => void;
}

export const JobSubmitModal: React.FC<JobSubmitModalProps> = ({
  isOpen,
  onClose,
  onJobCreated,
  isDemo,
  onMockJobAdd,
}) => {
  const [jobType, setJobType] = useState<JobType>('EMAIL');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  
  // Email fields
  const [emailTo, setEmailTo] = useState('user@example.com');
  const [emailSubject, setEmailSubject] = useState('Notification Alert');
  const [emailBody, setEmailBody] = useState('Your scheduled report is ready.');

  // Image Resize fields
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [resizeWidth, setResizeWidth] = useState(400);
  const [resizeHeight, setResizeHeight] = useState(400);

  // Dummy fields
  const [dummyDuration, setDummyDuration] = useState(3);
  const [dummyFailRate, setDummyFailRate] = useState(0.3);

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleGenerateKey = () => {
    setIdempotencyKey(`idem-${Math.random().toString(36).substring(2, 9)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    try {
      let payload: Record<string, unknown> = {};

      if (jobType === 'EMAIL') {
        if (!emailTo.trim() || !emailSubject.trim()) {
          throw new Error('Email recipient and subject are required');
        }
        payload = { to: emailTo.trim(), subject: emailSubject.trim(), body: emailBody.trim() };
      } else if (jobType === 'IMAGE_RESIZE') {
        let finalFileUrl = imageUrl.trim();
        if (imageFile && !isDemo) {
          finalFileUrl = await uploadJobFile(imageFile);
        } else if (!finalFileUrl) {
          finalFileUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800';
        }
        payload = { fileUrl: finalFileUrl, width: Number(resizeWidth), height: Number(resizeHeight) };
      } else if (jobType === 'DUMMY') {
        payload = { duration: Number(dummyDuration), failRate: Number(dummyFailRate) };
      }

      if (isDemo && onMockJobAdd) {
        onMockJobAdd(jobType, priority, payload, idempotencyKey || undefined);
        setStatusMessage({ type: 'success', text: 'Job enqueued to sandbox queue' });
      } else {
        const res = await createJob(jobType, priority, payload, idempotencyKey || undefined);
        setStatusMessage({
          type: 'success',
          text: res.duplicate ? `Idempotent duplicate caught (Job ID: ${res.jobId})` : `Job enqueued (${res.jobId})`,
        });
      }

      onJobCreated();
      setTimeout(() => {
        onClose();
        setStatusMessage(null);
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit job';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleBurstSubmit = async (count: number = 5) => {
    setLoading(true);
    setStatusMessage(null);
    try {
      for (let i = 0; i < count; i++) {
        const burstPayload = {
          duration: Math.floor(Math.random() * 3) + 1,
          failRate: i % 2 === 0 ? 0 : 0.6,
        };
        const burstPriority: Priority = i % 3 === 0 ? 'HIGH' : 'NORMAL';

        if (isDemo && onMockJobAdd) {
          onMockJobAdd('DUMMY', burstPriority, burstPayload);
        } else {
          await createJob('DUMMY', burstPriority, burstPayload);
        }
      }
      setStatusMessage({ type: 'success', text: `Enqueued burst of ${count} jobs!` });
      onJobCreated();
      setTimeout(() => {
        onClose();
        setStatusMessage(null);
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Burst enqueue failed';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-indigo-400" />
            <h2 className="text-base font-semibold text-zinc-100">Submit New Job</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {statusMessage && (
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Job Executor Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setJobType('EMAIL')}
                className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 px-3 text-xs font-medium transition ${
                  jobType === 'EMAIL'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                    : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <Mail className="h-3.5 w-3.5" />
                Email
              </button>
              <button
                type="button"
                onClick={() => setJobType('IMAGE_RESIZE')}
                className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 px-3 text-xs font-medium transition ${
                  jobType === 'IMAGE_RESIZE'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                    : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Image Resize
              </button>
              <button
                type="button"
                onClick={() => setJobType('DUMMY')}
                className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 px-3 text-xs font-medium transition ${
                  jobType === 'DUMMY'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                    : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                Dummy / Test
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Priority</label>
              <div className="flex rounded-lg bg-zinc-950 p-1 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPriority('NORMAL')}
                  className={`flex-1 rounded py-1.5 text-center text-xs font-medium transition ${
                    priority === 'NORMAL' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  NORMAL (0)
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('HIGH')}
                  className={`flex-1 rounded py-1.5 text-center text-xs font-medium transition ${
                    priority === 'HIGH' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  HIGH (1)
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-400">Idempotency Key</label>
                <button
                  type="button"
                  onClick={handleGenerateKey}
                  className="text-[11px] text-indigo-400 hover:underline font-mono"
                >
                  Auto
                </button>
              </div>
              <input
                type="text"
                value={idempotencyKey}
                onChange={(e) => setIdempotencyKey(e.target.value)}
                placeholder="Optional unique key"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 font-mono text-xs text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {jobType === 'EMAIL' && (
            <div className="space-y-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Recipient (to)</label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  required
                  placeholder="recipient@example.com"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  required
                  placeholder="Task Completed Alert"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Message Body</label>
                <textarea
                  rows={2}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Details of the job..."
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {jobType === 'IMAGE_RESIZE' && (
            <div className="space-y-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Upload Image or URL</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImageFile(e.target.files[0]);
                      setImageUrl(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                  className="w-full text-xs text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-200 hover:file:bg-zinc-700"
                />
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Or paste direct image URL (https://...)"
                  className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Target Width (px)</label>
                  <input
                    type="number"
                    value={resizeWidth}
                    onChange={(e) => setResizeWidth(Number(e.target.value))}
                    min={50}
                    max={3000}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Target Height (px)</label>
                  <input
                    type="number"
                    value={resizeHeight}
                    onChange={(e) => setResizeHeight(Number(e.target.value))}
                    min={50}
                    max={3000}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {jobType === 'DUMMY' && (
            <div className="space-y-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3.5">
              <div>
                <div className="flex justify-between text-xs font-medium text-zinc-400 mb-1">
                  <span>Work Duration: {dummyDuration}s</span>
                  <span className="text-zinc-500 font-mono">1s - 10s</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={dummyDuration}
                  onChange={(e) => setDummyDuration(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium text-zinc-400 mb-1">
                  <span>Simulated Fail Rate: {(dummyFailRate * 100).toFixed(0)}%</span>
                  <span className="text-zinc-500 font-mono">
                    {dummyFailRate === 0 ? 'Always Succeed' : dummyFailRate === 1 ? 'Always DLQ' : 'Random Retries'}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={dummyFailRate}
                  onChange={(e) => setDummyFailRate(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleBurstSubmit(5)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition disabled:opacity-50"
            >
              Enqueue 5 Burst Jobs
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-500 transition disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Enqueue Job'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
