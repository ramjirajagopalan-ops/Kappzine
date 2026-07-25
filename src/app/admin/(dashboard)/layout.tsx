'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <div className="min-h-[100dvh]">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <Link href="/admin" className="flex items-baseline gap-2">
          <span className="font-display text-lg text-stone-100">Kappzine</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-brass">Admin</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/" target="_blank" className="text-xs uppercase tracking-wider text-stone-400 hover:text-brass">
            View Site ↗
          </Link>
          <button onClick={logout} className="text-xs uppercase tracking-wider text-stone-400 hover:text-brass">
            Log Out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
