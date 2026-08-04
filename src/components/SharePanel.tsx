'use client';

import { useState } from 'react';
import { X, Check, Copy } from 'lucide-react';

export default function SharePanel({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard API unavailable — the visible link text is the fallback */
    }
  }

  const links = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(url)}` },
    { label: 'X', href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { label: 'Email', href: `mailto:?subject=${encodeURIComponent('Take a look')}&body=${encodeURIComponent(url)}` },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-t-2xl border border-white/10 bg-[#1c1a16] p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-[0.2em] text-stone-400">Share this album</h2>
          <button onClick={onClose} aria-label="Close" className="text-stone-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
          <span className="flex-1 truncate text-xs text-stone-300">{url}</span>
          <button
            onClick={copyLink}
            className="flex items-center gap-1 rounded-full bg-brass px-2.5 py-1 text-[11px] font-medium text-[#171512]"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/10 py-2.5 text-center text-[11px] text-stone-300 hover:border-brass hover:text-brass"
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
