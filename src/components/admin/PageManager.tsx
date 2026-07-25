'use client';

import { useRef, useState } from 'react';
import type { PageDTO } from '@/lib/types';

interface Props {
  albumId: string;
  pages: PageDTO[];
  onChange: () => void;
  selectedPageId: string | null;
  onSelectPage: (id: string) => void;
}

export default function PageManager({ albumId, pages, onChange, selectedPageId, onSelectPage }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [localOrder, setLocalOrder] = useState<PageDTO[] | null>(null);

  const list = localOrder ?? pages;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const form = new FormData();
    Array.from(files).forEach((f) => form.append('files', f));
    await fetch(`/api/admin/albums/${albumId}/pages`, { method: 'POST', body: form });
    setUploading(false);
    onChange();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function onDragStart(index: number) {
    setDragIndex(index);
  }

  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const next = [...list];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setDragIndex(index);
    setLocalOrder(next);
  }

  async function onDragEnd() {
    setDragIndex(null);
    if (!localOrder) return;
    await fetch(`/api/admin/albums/${albumId}/pages/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: localOrder.map((p) => p.id) }),
    });
    setLocalOrder(null);
    onChange();
  }

  async function updatePage(id: string, data: Partial<{ caption: string | null; isCover: boolean; density: string }>) {
    await fetch(`/api/admin/pages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    onChange();
  }

  async function deletePage(id: string) {
    if (!confirm('Delete this page? This cannot be undone.')) return;
    await fetch(`/api/admin/pages/${id}`, { method: 'DELETE' });
    onChange();
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-full bg-brass px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#171512] disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : '+ Upload Photos'}
        </button>
        <span className="text-xs text-stone-500">Drag thumbnails to reorder. Click a page to edit its overlays.</span>
      </div>

      {list.length === 0 ? (
        <p className="text-stone-500">No pages yet — upload your first photos above.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {list.map((page, index) => (
            <div
              key={page.id}
              draggable
              onDragStart={() => onDragStart(index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDragEnd={onDragEnd}
              onClick={() => onSelectPage(page.id)}
              className={`group relative cursor-pointer rounded-lg border p-2 transition-colors ${
                selectedPageId === page.id ? 'border-brass' : 'border-white/10 hover:border-white/30'
              }`}
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded bg-black/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={page.imageUrl} alt="" className="h-full w-full object-cover" />
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  {index + 1}
                </span>
                {page.overlays.length > 0 && (
                  <span className="absolute right-1 top-1 rounded bg-brass/90 px-1.5 py-0.5 text-[10px] text-[#171512]">
                    {page.overlays.length} overlay{page.overlays.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <input
                value={page.caption ?? ''}
                onChange={(e) => updatePage(page.id, { caption: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                placeholder="Caption…"
                className="mt-2 w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-stone-200 outline-none focus:border-brass"
              />
              <div className="mt-2 flex items-center justify-between text-[10px] text-stone-500">
                <label className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={page.density === 'hard'}
                    onChange={(e) => updatePage(page.id, { density: e.target.checked ? 'hard' : 'soft' })}
                  />
                  Hard cover
                </label>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePage(page.id);
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
