'use client';

import { useEffect } from 'react';
import type { OverlayDTO } from '@/lib/types';

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') || u.hostname === 'youtu.be') {
      const id = u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

export default function OverlayModal({ overlay, onClose }: { overlay: OverlayDTO; onClose: () => void }) {
  useEffect(() => {
    if (overlay.type === 'link') {
      window.open(overlay.url, '_blank', 'noopener,noreferrer');
      onClose();
    }
  }, [overlay, onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (overlay.type === 'link') return null;

  const embed = overlay.type === 'video' ? toEmbedUrl(overlay.url) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl rounded-lg bg-stone-900 p-3 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-900 shadow-lg"
          aria-label="Close"
        >
          ✕
        </button>
        {overlay.label && <p className="mb-2 px-1 text-sm text-stone-300">{overlay.label}</p>}
        {overlay.type === 'video' && embed && (
          <div className="aspect-video w-full overflow-hidden rounded">
            <iframe
              src={`${embed}${overlay.autoplay ? '?autoplay=1' : ''}`}
              className="h-full w-full"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        {overlay.type === 'video' && !embed && (
          <video src={overlay.url} controls autoPlay={overlay.autoplay} className="max-h-[70vh] w-full rounded" />
        )}
        {overlay.type === 'audio' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="text-4xl">♪</div>
            <audio src={overlay.url} controls autoPlay={overlay.autoplay} className="w-full max-w-md" />
          </div>
        )}
      </div>
    </div>
  );
}
