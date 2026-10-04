"use client";

import React, { useState } from 'react';
import { X, Server, Key, LogIn, UserPlus, Check, Sparkles } from 'lucide-react';
import {
  getApiUrl,
  setApiUrl,
  getAuthToken,
  setAuthToken,
  getUserEmail,
  isDemoMode,
  setDemoMode,
  loginUser,
  registerUser,
} from '@/services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChange: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onConfigChange }) => {
  const [apiUrl, setApiUrlState] = useState(getApiUrl());
  const [token, setTokenState] = useState(getAuthToken() || '');
  const [demo, setDemoState] = useState(isDemoMode());

  const [authTab, setAuthTab] = useState<'signin' | 'signup' | 'token'>('signin');
  const [email, setEmail] = useState(getUserEmail() || 'admin@queuecraft.dev');
  const [password, setPassword] = useState('password123');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    setApiUrl(apiUrl);
    setAuthToken(token.trim() || null);
    setDemoMode(demo);
    onConfigChange();
    onClose();
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      if (authTab === 'signin') {
        const res = await loginUser(email, password);
        setTokenState(res.token);
        setAuthToken(res.token, email);
        setAuthSuccess('Signed in successfully! JWT token saved.');
      } else if (authTab === 'signup') {
        const res = await registerUser(email, password);
        if (res.token) {
          setTokenState(res.token);
          setAuthToken(res.token, email);
        }
        setAuthSuccess('Account created! You can now sign in.');
      }
      onConfigChange();
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAuth = () => {
    setAuthToken(null);
    setTokenState('');
    onConfigChange();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-indigo-400" />
            <h2 className="text-base font-semibold text-zinc-100">Gateway & Auth Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <form onSubmit={handleSaveConnection} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Backend API & WebSocket Gateway URL
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrlState(e.target.value)}
                placeholder="http://localhost:3000"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
              />
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Connects to Express REST API & Socket.IO
              </span>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Sandbox Simulation Mode</span>
                </div>
                <div className="text-[11px] text-zinc-500">
                  Simulate workers and live transitions without running local server
                </div>
              </div>
              <input
                type="checkbox"
                checked={demo}
                onChange={(e) => setDemoState(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500 accent-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition"
            >
              Save Gateway Configuration
            </button>
          </form>

          <div className="border-t border-zinc-800 pt-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-zinc-300">Authentication</span>
              {token && (
                <button
                  type="button"
                  onClick={handleClearAuth}
                  className="text-[11px] text-rose-400 hover:underline"
                >
                  Disconnect Token
                </button>
              )}
            </div>

            <div className="flex rounded-lg bg-zinc-950 p-1 border border-zinc-800 mb-3 text-xs">
              <button
                type="button"
                onClick={() => setAuthTab('signin')}
                className={`flex-1 rounded py-1 text-center font-medium ${
                  authTab === 'signin' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthTab('signup')}
                className={`flex-1 rounded py-1 text-center font-medium ${
                  authTab === 'signup' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'
                }`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => setAuthTab('token')}
                className={`flex-1 rounded py-1 text-center font-medium ${
                  authTab === 'token' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'
                }`}
              >
                JWT Paste
              </button>
            </div>

            {authError && (
              <div className="mb-3 rounded bg-rose-500/10 p-2 text-xs text-rose-400 border border-rose-500/20">
                {authError}
              </div>
            )}
            {authSuccess && (
              <div className="mb-3 rounded bg-emerald-500/10 p-2 text-xs text-emerald-400 border border-emerald-500/20">
                {authSuccess}
              </div>
            )}

            {authTab === 'token' ? (
              <div className="space-y-3">
                <textarea
                  rows={3}
                  value={token}
                  onChange={(e) => setTokenState(e.target.value)}
                  placeholder="Paste Bearer JWT token here..."
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 font-mono text-[11px] text-zinc-300 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setAuthToken(token.trim() || null);
                    onConfigChange();
                    setAuthSuccess('Token updated');
                  }}
                  className="w-full rounded-lg bg-indigo-600 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                >
                  Save Token
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@example.com"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Password"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : authTab === 'signin' ? 'Sign In to API' : 'Register Account'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
