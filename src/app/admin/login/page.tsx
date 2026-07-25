'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setError('Incorrect password.');
      setLoading(false);
      return;
    }
    router.push(params.get('next') || '/admin');
    router.refresh();
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <p className="mb-1 text-[11px] uppercase tracking-[0.3em] text-brass">Kappzine</p>
        <h1 className="font-display mb-6 text-2xl text-stone-100">Admin Sign In</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="rounded-md border border-white/15 bg-white/5 px-4 py-3 text-center text-stone-100 outline-none focus:border-brass"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="rounded-md bg-brass px-4 py-3 font-medium text-[#171512] transition-opacity disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
