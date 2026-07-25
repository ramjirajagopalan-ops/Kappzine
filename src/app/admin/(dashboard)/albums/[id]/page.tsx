'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AlbumDTO } from '@/lib/types';
import PageManager from '@/components/admin/PageManager';
import AlbumSettingsForm from '@/components/admin/AlbumSettingsForm';
import OverlayEditor from '@/components/admin/OverlayEditor';
import FlipBook from '@/components/FlipBook';

type Tab = 'pages' | 'overlays' | 'settings' | 'preview';

export default function AlbumEditorPage({ params }: { params: { id: string } }) {
  const [album, setAlbum] = useState<AlbumDTO | null>(null);
  const [tab, setTab] = useState<Tab>('pages');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/albums/${params.id}`);
    if (res.ok) {
      const data: AlbumDTO = await res.json();
      setAlbum(data);
      if (!selectedPageId && data.pages.length > 0) setSelectedPageId(data.pages[0].id);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (!album) return <p className="text-stone-500">Loading…</p>;

  const selectedPage = album.pages.find((p) => p.id === selectedPageId) || null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-xs text-stone-500 hover:text-brass">
            ← All Albums
          </Link>
          <h1 className="font-display mt-1 text-2xl text-stone-100">{album.title}</h1>
        </div>
        <Link
          href={`/album/${album.slug}`}
          target="_blank"
          className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-wider text-stone-300 hover:border-brass hover:text-brass"
        >
          Preview Live ↗
        </Link>
      </div>

      <div className="mb-8 flex gap-1 border-b border-white/10">
        {(['pages', 'overlays', 'settings', 'preview'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs uppercase tracking-wider transition-colors ${
              tab === t ? 'border-b-2 border-brass text-brass' : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'pages' && (
        <PageManager
          albumId={album.id}
          pages={album.pages}
          onChange={load}
          selectedPageId={selectedPageId}
          onSelectPage={(id) => {
            setSelectedPageId(id);
            setTab('overlays');
          }}
        />
      )}

      {tab === 'overlays' && (
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            {album.pages.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setSelectedPageId(p.id)}
                className={`h-14 w-11 overflow-hidden rounded border ${
                  selectedPageId === p.id ? 'border-brass' : 'border-white/10'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.imageUrl} alt={`Page ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          {selectedPage ? (
            <OverlayEditor page={selectedPage} onChange={load} />
          ) : (
            <p className="text-stone-500">Upload pages first, then select one above to add hotspots.</p>
          )}
        </div>
      )}

      {tab === 'settings' && <AlbumSettingsForm album={album} onChange={load} />}

      {tab === 'preview' && (
        <div className="flex justify-center rounded-lg border border-white/10 p-6" style={{ minHeight: 560 }}>
          {album.pages.length === 0 ? (
            <p className="text-stone-500">Upload pages to preview the flipbook.</p>
          ) : (
            <FlipBook
              pages={album.pages}
              theme={album.theme}
              aspectRatio={album.aspectRatio}
              pageMode={album.pageMode}
              soundEnabled={album.soundEnabled}
              onOverlayActivate={() => undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}
