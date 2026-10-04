"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, Server } from 'lucide-react';
import { loginUser, getApiUrl, setApiUrl } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [apiUrl, setApiUrlState] = useState(getApiUrl());
  const [showConfig, setShowConfig] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await loginUser(email.trim(), password);
      if (res.token) {
        login(res.token, email.trim());
        router.push('/');
      } else {
        throw new Error('No authentication token returned by server');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setApiUrl(apiUrl.trim());
    setShowConfig(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center px-4 py-12 selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 shadow-md">
            <Activity className="h-6 w-6 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Sign in to QueueCraft</h1>
          <p className="text-xs text-zinc-400">
            Enter your credentials to access the distributed job queue dashboard
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 shadow-2xl backdrop-blur-sm p-6 sm:p-8 space-y-6">
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-10 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 px-4 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              {!loading && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </form>

          <div className="text-center text-xs text-zinc-400 border-t border-zinc-800/80 pt-4">
            Don't have an account yet?{' '}
            <Link
              href="/signup"
              className="font-medium text-indigo-400 hover:text-indigo-300 underline"
            >
              Create an account
            </Link>
          </div>

          <div className="border-t border-zinc-800/80 pt-3">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition"
            >
              <Server className="h-3.5 w-3.5" />
              <span>{showConfig ? 'Hide Gateway settings' : 'Configure Backend API URL'}</span>
            </button>

            {showConfig && (
              <form onSubmit={handleSaveApiUrl} className="mt-3 space-y-2">
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrlState(e.target.value)}
                  placeholder="http://localhost:3000"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 font-mono text-[11px] text-zinc-300 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded bg-zinc-800 px-3 py-1 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700"
                >
                  Save URL
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
