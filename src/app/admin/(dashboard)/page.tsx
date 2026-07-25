'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AlbumSummaryDTO } from '@/lib/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [albums, setAlbums] = useState<AlbumSummaryDTO[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [coupleNames, setCoupleNames] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/admin/albums');
    setAlbums(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/admin/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, coupleNames }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Could not create album');
      return;
    }
    const album = await res.json();
    router.push(`/admin/albums/${album.id}`);
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl text-stone-100">Albums</h1>
        <button
          onClick={() => setCreating((c) => !c)}
          className="rounded-full bg-brass px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#171512]"
        >
          {creating ? 'Cancel' : '+ New Album'}
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="mb-10 grid max-w-md gap-3 rounded-lg border border-white/10 p-5">
          <label className="text-xs uppercase tracking-wider text-stone-400">
            Album Title
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Alex & Priya's Wedding"
              className="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brass"
            />
          </label>
          <label className="text-xs uppercase tracking-wider text-stone-400">
            Couple Names (shown on cover)
            <input
              value={coupleNames}
              onChange={(e) => setCoupleNames(e.target.value)}
              placeholder="Alex & Priya"
              className="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brass"
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="mt-1 rounded-md bg-brass px-4 py-2 text-sm font-medium text-[#171512]">
            Create Album
          </button>
        </form>
      )}

      {albums === null ? (
        <p className="text-stone-500">Loading…</p>
      ) : albums.length === 0 ? (
        <p className="text-stone-500">No albums yet. Create your first one above.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {albums.map((album) => (
            <Link
              key={album.id}
              href={`/admin/albums/${album.id}`}
              className="rounded-lg border border-white/10 p-4 transition-colors hover:border-brass"
            >
              <div
                className="mb-3 aspect-[3/4] rounded bg-cover bg-center bg-white/5"
                style={album.coverImageUrl ? { backgroundImage: `url(${album.coverImageUrl})` } : undefined}
              />
              <p className="font-display text-stone-100">{album.title}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-stone-500">
                {album.pageCount} pages · {album.published ? 'published' : 'draft'}
                {album.hasPassword ? ' · protected' : ''}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
