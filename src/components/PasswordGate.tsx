'use client';

import { useState } from 'react';

export default function PasswordGate({ slug, title }: { slug: string; title: string }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/albums/${slug}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError('Incorrect password. Please try again.');
        setLoading(false);
        return;
      }
      window.location.reload();
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#171512] px-4 text-stone-200">
      <div className="w-full max-w-sm text-center">
        <p className="mb-1 text-[11px] uppercase tracking-[0.25em] text-brass">Private Album</p>
        <h1 className="font-display mb-6 text-2xl text-stone-100">{title}</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="rounded-md border border-white/15 bg-white/5 px-4 py-3 text-center text-stone-100 outline-none focus:border-brass"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="rounded-md bg-brass px-4 py-3 font-medium text-[#171512] transition-opacity disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'View Album'}
          </button>
        </form>
      </div>
    </div>
  );
}
