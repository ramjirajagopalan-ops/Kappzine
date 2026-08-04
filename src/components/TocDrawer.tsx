'use client';

import { X } from 'lucide-react';
import type { PageDTO } from '@/lib/types';

export default function TocDrawer({
  pages,
  currentIndex,
  accent,
  onJump,
  onClose,
}: {
  pages: PageDTO[];
  currentIndex: number;
  accent: string;
  onJump: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-xs flex-col bg-[#171512] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-stone-400">Pages</h2>
          <button onClick={onClose} aria-label="Close" className="text-stone-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="grid flex-1 auto-rows-min grid-cols-3 gap-2 overflow-y-auto p-4">
          {pages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => onJump(i)}
              className="group overflow-hidden rounded-lg border text-left transition-colors"
              style={{ borderColor: i === currentIndex ? accent : 'rgba(255,255,255,0.1)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrl} alt={p.caption ?? `Page ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
              <span className="block truncate px-1.5 py-1 text-[10px] text-stone-400">
                {i + 1}
                {p.caption ? ` · ${p.caption}` : ''}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
