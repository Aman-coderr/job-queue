"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Layers,
  BarChart3,
  Cpu,
  Pause,
  Play,
  Settings,
  WifiOff,
  Plus,
  LogOut,
} from 'lucide-react';
import { SocketStatus } from '@/lib/socket';

interface HeaderProps {
  socketStatus: SocketStatus;
  isQueuePaused: boolean;
  onToggleQueuePause: () => void;
  onOpenSubmitModal: () => void;
  onOpenSettingsModal: () => void;
  userEmail: string | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  socketStatus,
  isQueuePaused,
  onToggleQueuePause,
  onOpenSubmitModal,
  onOpenSettingsModal,
  userEmail,
  onLogout,
}) => {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-zinc-100 ring-1 ring-zinc-700/60">
              <Activity className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight text-zinc-100">QueueCraft</span>
              </div>
              <p className="text-xs text-zinc-400">Distributed Job Queue System</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 rounded-lg bg-zinc-900/90 p-1 ring-1 border border-zinc-800">
            <Link
              href="/"
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${pathname === '/'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
                }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Jobs Stream
            </Link>
            <Link
              href="/metrics"
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${pathname === '/metrics'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
                }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Metrics
            </Link>
            <Link
              href="/workers"
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${pathname === '/workers'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
                }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              Worker Fleet
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] ${socketStatus === 'connected'
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
                  <span className="hidden sm:inline">Connecting</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
            </span>

            <button
              onClick={onToggleQueuePause}
              title={isQueuePaused ? 'Resume Redis consumer loop' : 'Pause Redis consumer loop'}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${isQueuePaused
                ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30 hover:bg-amber-500/30'
                : 'bg-zinc-900 text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-800'
                }`}
            >
              {isQueuePaused ? (
                <>
                  <Play className="h-3 w-3 fill-current text-amber-400" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3 text-zinc-400" />
                  <span>Pause</span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={onOpenSubmitModal}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Enqueue</span>
          </button>

          <button
            onClick={onOpenSettingsModal}
            title="Gateway Settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 transition hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Settings className="h-4 w-4" />
          </button>

          {userEmail && (
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
              <span className="hidden lg:inline font-mono text-xs text-zinc-400 truncate max-w-[120px]" title={userEmail}>
                {userEmail}
              </span>
              <button
                onClick={onLogout}
                title="Log out"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 transition hover:bg-rose-500/20 hover:text-rose-300 hover:ring-rose-500/30"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex md:hidden border-t border-zinc-800/80 px-4 py-2">
        <div className="flex w-full rounded-lg bg-zinc-900 p-1">
          <Link
            href="/"
            className={`flex-1 py-1.5 text-center text-xs font-medium rounded ${pathname === '/' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'
              }`}
          >
            Jobs
          </Link>
          <Link
            href="/metrics"
            className={`flex-1 py-1.5 text-center text-xs font-medium rounded ${pathname === '/metrics' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'
              }`}
          >
            Metrics
          </Link>
          <Link
            href="/workers"
            className={`flex-1 py-1.5 text-center text-xs font-medium rounded ${pathname === '/workers' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'
              }`}
          >
            Workers
          </Link>
        </div>
      </div>
    </header>
  );
};
