'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import type { AlbumDTO } from '@/lib/types';
import { ASPECT_RATIOS, PAGE_MODES, THEMES } from '@/lib/validation';

interface AlbumStats {
  totalViews: number;
  avgCompletionPercent: number;
  completedViews: number;
  lastViewedAt: string | null;
}

export default function AlbumSettingsForm({ album, onChange }: { album: AlbumDTO; onChange: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(album.title);
  const [coupleNames, setCoupleNames] = useState(album.coupleNames ?? '');
  const [description, setDescription] = useState(album.description ?? '');
  const [theme, setTheme] = useState(album.theme);
  const [hardCovers, setHardCovers] = useState(album.hardCovers);
  const [pageMode, setPageMode] = useState(album.pageMode);
  const [soundEnabled, setSoundEnabled] = useState(album.soundEnabled);
  const [aspectRatio, setAspectRatio] = useState(album.aspectRatio);
  const [published, setPublished] = useState(album.published);
  const [hasPassword, setHasPassword] = useState(album.hasPassword);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [publicUrl, setPublicUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<AlbumStats | null>(null);

  useEffect(() => {
    const url = `${window.location.origin}/album/${album.slug}`;
    setPublicUrl(url);
    QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: '#171512', light: '#efe8d8' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [album.slug]);

  useEffect(() => {
    fetch(`/api/admin/albums/${album.id}/stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => undefined);
  }, [album.id]);

  async function save(extra: Record<string, unknown> = {}) {
    setSaving(true);
    const res = await fetch(`/api/admin/albums/${album.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        coupleNames,
        description,
        theme,
        hardCovers,
        pageMode,
        soundEnabled,
        aspectRatio,
        published,
        ...extra,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSavedAt(Date.now());
      onChange();
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    await save({ password: newPassword });
    setHasPassword(Boolean(newPassword));
    setNewPassword('');
  }

  async function handleRemovePassword() {
    await save({ password: null });
    setHasPassword(false);
  }

  async function handleDelete() {
    if (!confirm('Delete this entire album, including all pages and photos? This cannot be undone.')) return;
    await fetch(`/api/admin/albums/${album.id}`, { method: 'DELETE' });
    router.push('/admin');
  }

  return (
    <div className="grid max-w-2xl gap-8">
      <section className="grid gap-3">
        <h2 className="text-xs uppercase tracking-wider text-stone-400">Details</h2>
        <label className="text-xs text-stone-400">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brass"
          />
        </label>
        <label className="text-xs text-stone-400">
          Couple Names (shown on the front cover)
          <input
            value={coupleNames}
            onChange={(e) => setCoupleNames(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brass"
          />
        </label>
        <label className="text-xs text-stone-400">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brass"
          />
        </label>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xs uppercase tracking-wider text-stone-400">Cover &amp; Theme</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`rounded-lg border p-3 text-left ${theme === t.id ? 'border-brass' : 'border-white/10'}`}
              style={{ background: t.bg }}
            >
              <div className="mb-2 h-8 rounded" style={{ background: t.pageBg }} />
              <p className="text-xs" style={{ color: t.accent }}>
                {t.label}
              </p>
            </button>
          ))}
        </div>
        <label className="mt-1 flex items-center gap-2 text-xs text-stone-400">
          <input type="checkbox" checked={hardCovers} onChange={(e) => setHardCovers(e.target.checked)} />
          Hard front/back covers
        </label>
        <label className="text-xs text-stone-400">
          Page aspect ratio
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brass"
          >
            {ASPECT_RATIOS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xs uppercase tracking-wider text-stone-400">Reading Experience</h2>
        <label className="text-xs text-stone-400">
          Default page mode
          <select
            value={pageMode}
            onChange={(e) => setPageMode(e.target.value as typeof pageMode)}
            className="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brass"
          >
            {PAGE_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-stone-400">
          <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
          Page-turn sound enabled by default
        </label>
        <label className="flex items-center gap-2 text-xs text-stone-400">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          Published (visible on the public site)
        </label>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xs uppercase tracking-wider text-stone-400">Password Protection</h2>
        {hasPassword ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-stone-300">This album is password protected.</p>
            <button onClick={handleRemovePassword} className="text-xs text-red-400 hover:text-red-300">
              Remove password
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordSave} className="flex items-center gap-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Set a viewing password"
              className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brass"
            />
            <button
              type="submit"
              disabled={!newPassword}
              className="rounded-md bg-brass px-3 py-2 text-xs font-semibold text-[#171512] disabled:opacity-50"
            >
              Set Password
            </button>
          </form>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-xs uppercase tracking-wider text-stone-400">Share &amp; Stats</h2>
        <div className="flex flex-wrap items-start gap-6">
          {qrDataUrl && (
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR code linking to this album" className="rounded-md" width={140} height={140} />
              <a
                href={qrDataUrl}
                download={`${album.slug}-qr.png`}
                className="mt-1 block text-[11px] text-brass hover:underline"
              >
                Download QR
              </a>
            </div>
          )}
          <div className="grid gap-2 text-xs text-stone-400">
            <div className="flex items-center gap-2">
              <span className="max-w-[260px] truncate rounded border border-white/10 bg-black/20 px-2 py-1 text-stone-300">
                {publicUrl}
              </span>
            </div>
            <a
              href={`/api/public/albums/${album.slug}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brass hover:underline"
            >
              Download album as PDF ↓
            </a>
            {stats && (
              <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
                <span>Views</span>
                <span className="text-stone-200">{stats.totalViews}</span>
                <span>Avg. completion</span>
                <span className="text-stone-200">{stats.avgCompletionPercent}%</span>
                <span>Finished album</span>
                <span className="text-stone-200">{stats.completedViews}</span>
                <span>Last viewed</span>
                <span className="text-stone-200">
                  {stats.lastViewedAt ? new Date(stats.lastViewedAt).toLocaleDateString() : '—'}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="flex items-center gap-4 border-t border-white/10 pt-6">
        <button
          onClick={() => save()}
          disabled={saving}
          className="rounded-full bg-brass px-5 py-2 text-xs font-semibold uppercase tracking-wider text-[#171512] disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {savedAt && <span className="text-xs text-stone-500">Saved.</span>}
        <button onClick={handleDelete} className="ml-auto text-xs text-red-400 hover:text-red-300">
          Delete Album
        </button>
      </div>
    </div>
  );
}
