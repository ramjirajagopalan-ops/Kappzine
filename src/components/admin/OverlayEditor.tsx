'use client';

import { useRef, useState } from 'react';
import type { OverlayDTO, PageDTO } from '@/lib/types';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_SIZE = 4;

function clampRect(r: Rect): Rect {
  const x = Math.max(0, Math.min(100 - MIN_SIZE, r.x));
  const y = Math.max(0, Math.min(100 - MIN_SIZE, r.y));
  const width = Math.max(MIN_SIZE, Math.min(100 - x, r.width));
  const height = Math.max(MIN_SIZE, Math.min(100 - y, r.height));
  return { x, y, width, height };
}

export default function OverlayEditor({ page, onChange }: { page: PageDTO; onChange: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawRect, setDrawRect] = useState<Rect | null>(null);
  const [pendingRect, setPendingRect] = useState<Rect | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'link' as OverlayDTO['type'], url: '', label: '', autoplay: false });

  const selected = page.overlays.find((o) => o.id === selectedId) || null;

  function percentFromEvent(e: React.MouseEvent | MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  }

  function handleContainerMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-overlay-box]')) return;
    setSelectedId(null);
    setPendingRect(null);
    const start = percentFromEvent(e);
    setDrawStart(start);
    setDrawRect({ x: start.x, y: start.y, width: 0, height: 0 });

    function onMove(ev: MouseEvent) {
      const cur = percentFromEvent(ev);
      setDrawRect(
        clampRect({
          x: Math.min(start.x, cur.x),
          y: Math.min(start.y, cur.y),
          width: Math.abs(cur.x - start.x),
          height: Math.abs(cur.y - start.y),
        }),
      );
    }
    function onUp(ev: MouseEvent) {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const cur = percentFromEvent(ev);
      const finalRect = clampRect({
        x: Math.min(start.x, cur.x),
        y: Math.min(start.y, cur.y),
        width: Math.abs(cur.x - start.x) || 20,
        height: Math.abs(cur.y - start.y) || 20,
      });
      setDrawStart(null);
      setDrawRect(null);
      if (finalRect.width < MIN_SIZE || finalRect.height < MIN_SIZE) {
        setPendingRect(clampRect({ ...finalRect, width: 20, height: 20 }));
      } else {
        setPendingRect(finalRect);
      }
      setForm({ type: 'link', url: '', label: '', autoplay: false });
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function startDragExisting(overlay: OverlayDTO, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedId(overlay.id);
    setPendingRect(null);
    const startMouse = percentFromEvent(e);
    const origin = { x: overlay.x, y: overlay.y };

    function onMove(ev: MouseEvent) {
      const cur = percentFromEvent(ev);
      const next = clampRect({
        x: origin.x + (cur.x - startMouse.x),
        y: origin.y + (cur.y - startMouse.y),
        width: overlay.width,
        height: overlay.height,
      });
      containerRef.current?.style.setProperty('cursor', 'grabbing');
      setLiveOverlayRect(overlay.id, next);
    }
    async function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const rect = liveOverlayRectRef.current;
      if (rect) {
        await fetch(`/api/admin/overlays/${overlay.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rect),
        });
        onChange();
      }
      liveOverlayRectRef.current = null;
      setLiveRectVersion((v) => v + 1);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function startResizeExisting(overlay: OverlayDTO, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedId(overlay.id);
    const startMouse = percentFromEvent(e);
    const origin = { width: overlay.width, height: overlay.height };

    function onMove(ev: MouseEvent) {
      const cur = percentFromEvent(ev);
      const next = clampRect({
        x: overlay.x,
        y: overlay.y,
        width: origin.width + (cur.x - startMouse.x),
        height: origin.height + (cur.y - startMouse.y),
      });
      setLiveOverlayRect(overlay.id, next);
    }
    async function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const rect = liveOverlayRectRef.current;
      if (rect) {
        await fetch(`/api/admin/overlays/${overlay.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rect),
        });
        onChange();
      }
      liveOverlayRectRef.current = null;
      setLiveRectVersion((v) => v + 1);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  const liveOverlayRectRef = useRef<Rect | null>(null);
  const [, setLiveRectVersion] = useState(0);
  function setLiveOverlayRect(_id: string, rect: Rect) {
    liveOverlayRectRef.current = rect;
    setLiveRectVersion((v) => v + 1);
  }

  async function createOverlay(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingRect || !form.url.trim()) return;
    await fetch(`/api/admin/pages/${page.id}/overlays`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...pendingRect, ...form }),
    });
    setPendingRect(null);
    onChange();
  }

  async function updateSelected(data: Partial<{ url: string; label: string; autoplay: boolean }>) {
    if (!selected) return;
    await fetch(`/api/admin/overlays/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    onChange();
  }

  async function deleteOverlay(id: string) {
    await fetch(`/api/admin/overlays/${id}`, { method: 'DELETE' });
    setSelectedId(null);
    onChange();
  }

  function overlayStyle(overlay: OverlayDTO): React.CSSProperties {
    const live = selectedId === overlay.id ? liveOverlayRectRef.current : null;
    const r = live || overlay;
    return { left: `${r.x}%`, top: `${r.y}%`, width: `${r.width}%`, height: `${r.height}%` };
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_280px]">
      <div>
        <p className="mb-3 text-xs text-stone-500">
          Click and drag on the photo to place a video, audio, or link hotspot. Drag an existing hotspot to move it,
          or its corner handle to resize.
        </p>
        <div
          ref={containerRef}
          onMouseDown={handleContainerMouseDown}
          className="relative aspect-[3/4] w-full max-w-md select-none overflow-hidden rounded-lg border border-white/10 bg-black/40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.imageUrl} alt="" className="pointer-events-none h-full w-full object-cover" />

          {page.overlays.map((overlay) => (
            <div
              key={overlay.id}
              data-overlay-box
              onMouseDown={(e) => startDragExisting(overlay, e)}
              style={overlayStyle(overlay)}
              className={`absolute cursor-grab rounded border-2 ${
                selectedId === overlay.id ? 'border-brass bg-brass/20' : 'border-white/70 bg-white/10'
              }`}
            >
              <span className="absolute -top-5 left-0 rounded bg-black/70 px-1 text-[10px] text-white">
                {overlay.type}
              </span>
              <div
                onMouseDown={(e) => startResizeExisting(overlay, e)}
                className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm bg-brass"
              />
            </div>
          ))}

          {drawRect && (
            <div
              style={{ left: `${drawRect.x}%`, top: `${drawRect.y}%`, width: `${drawRect.width}%`, height: `${drawRect.height}%` }}
              className="absolute rounded border-2 border-dashed border-brass bg-brass/10"
            />
          )}

          {pendingRect && (
            <div
              style={{
                left: `${pendingRect.x}%`,
                top: `${pendingRect.y}%`,
                width: `${pendingRect.width}%`,
                height: `${pendingRect.height}%`,
              }}
              className="absolute rounded border-2 border-brass bg-brass/20"
            />
          )}
        </div>
      </div>

      <div>
        {pendingRect && (
          <form onSubmit={createOverlay} className="grid gap-3 rounded-lg border border-brass/40 p-4">
            <h3 className="text-xs uppercase tracking-wider text-brass">New Hotspot</h3>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as OverlayDTO['type'] }))}
              className="rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-stone-100"
            >
              <option value="link">Link</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
            </select>
            <input
              required
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder={form.type === 'link' ? 'https://example.com' : 'https://...mp4 or YouTube/Vimeo URL'}
              className="rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-stone-100"
            />
            <input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Label (optional)"
              className="rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-stone-100"
            />
            {form.type !== 'link' && (
              <label className="flex items-center gap-2 text-xs text-stone-400">
                <input
                  type="checkbox"
                  checked={form.autoplay}
                  onChange={(e) => setForm((f) => ({ ...f, autoplay: e.target.checked }))}
                />
                Autoplay
              </label>
            )}
            <div className="flex gap-2">
              <button type="submit" className="rounded-md bg-brass px-3 py-1.5 text-xs font-semibold text-[#171512]">
                Add Hotspot
              </button>
              <button
                type="button"
                onClick={() => setPendingRect(null)}
                className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-stone-300"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {!pendingRect && selected && (
          <div className="grid gap-3 rounded-lg border border-white/10 p-4">
            <h3 className="text-xs uppercase tracking-wider text-stone-400">Edit Hotspot ({selected.type})</h3>
            <input
              defaultValue={selected.url}
              onBlur={(e) => updateSelected({ url: e.target.value })}
              className="rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-stone-100"
            />
            <input
              defaultValue={selected.label ?? ''}
              onBlur={(e) => updateSelected({ label: e.target.value })}
              placeholder="Label"
              className="rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-stone-100"
            />
            {selected.type !== 'link' && (
              <label className="flex items-center gap-2 text-xs text-stone-400">
                <input
                  type="checkbox"
                  defaultChecked={selected.autoplay}
                  onChange={(e) => updateSelected({ autoplay: e.target.checked })}
                />
                Autoplay
              </label>
            )}
            <button
              onClick={() => deleteOverlay(selected.id)}
              className="justify-self-start text-xs text-red-400 hover:text-red-300"
            >
              Delete Hotspot
            </button>
          </div>
        )}

        {!pendingRect && !selected && (
          <div className="grid gap-2">
            <h3 className="text-xs uppercase tracking-wider text-stone-400">Hotspots on this page</h3>
            {page.overlays.length === 0 && <p className="text-xs text-stone-500">None yet.</p>}
            {page.overlays.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedId(o.id)}
                className="rounded-md border border-white/10 px-3 py-2 text-left text-xs text-stone-300 hover:border-brass"
              >
                <span className="mr-2 uppercase text-brass">{o.type}</span>
                {o.label || o.url}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
