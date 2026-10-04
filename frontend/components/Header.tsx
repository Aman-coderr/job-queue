"use client";

import React, { useState } from 'react';
import {
  Activity,
  Layers,
  BarChart3,
  Pause,
  Play,
  Settings,
  Wifi,
  WifiOff,
  User,
  Plus,
} from 'lucide-react';
import { SocketStatus } from '@/services/socket';

interface HeaderProps {
  activeTab: 'jobs' | 'metrics';
  setActiveTab: (tab: 'jobs' | 'metrics') => void;
  socketStatus: SocketStatus;
  isQueuePaused: boolean;
  onToggleQueuePause: () => void;
  onOpenSubmitModal: () => void;
  onOpenSettingsModal: () => void;
  userEmail: string | null;
  isDemo: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  socketStatus,
  isQueuePaused,
  onToggleQueuePause,
  onOpenSubmitModal,
  onOpenSettingsModal,
  userEmail,
  isDemo,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-zinc-100 ring-1 ring-zinc-700/60">
              <Activity className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight text-zinc-100">QueueCraft</span>
                <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-400">
                  v1.2
                </span>
                {isDemo && (
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 ring-1 ring-amber-500/20">
                    Sandbox
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">Distributed Job Processing Platform</p>
            </div>
          </div>

          <nav className="hidden sm:flex items-center gap-1 rounded-lg bg-zinc-900/90 p-1 ring-1 ring-zinc-800">
            <button
              onClick={() => setActiveTab('jobs')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'jobs'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Jobs & Queue
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'metrics'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Metrics & Workers
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] ${
                socketStatus === 'connected'
                  ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                  : socketStatus === 'connecting'
                  ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {socketStatus === 'connected' ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline">WS Live</span>
                </>
              ) : socketStatus === 'connecting' ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="hidden sm:inline">WS Connecting</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span className="hidden sm:inline">WS Offline</span>
                </>
              )}
            </span>

            <button
              onClick={onToggleQueuePause}
              title={isQueuePaused ? 'Resume Redis consumer loop' : 'Pause Redis consumer loop'}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                isQueuePaused
                  ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30 hover:bg-amber-500/30'
                  : 'bg-zinc-900 text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-800'
              }`}
            >
              {isQueuePaused ? (
                <>
                  <Play className="h-3 w-3 fill-current text-amber-400" />
                  <span>Resume Queue</span>
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3 text-zinc-400" />
                  <span>Pause Queue</span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={onOpenSubmitModal}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Enqueue Job</span>
          </button>

          <button
            onClick={onOpenSettingsModal}
            title="Connection & Auth Settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 transition hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex sm:hidden border-t border-zinc-800/80 px-4 py-2">
        <div className="flex w-full rounded-lg bg-zinc-900 p-1">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex-1 py-1.5 text-center text-xs font-medium rounded ${
              activeTab === 'jobs' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'
            }`}
          >
            Jobs & Queue
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex-1 py-1.5 text-center text-xs font-medium rounded ${
              activeTab === 'metrics' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'
            }`}
          >
            Metrics & Workers
          </button>
        </div>
      </div>
    </header>
  );
};
