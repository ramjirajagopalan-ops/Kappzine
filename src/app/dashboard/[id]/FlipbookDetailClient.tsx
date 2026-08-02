"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2, Check } from "lucide-react";
import { OptionsForm, type FlipbookOptionsValue, inputClass } from "@/components/dashboard/OptionsForm";
import { ProcessingStatus } from "./ProcessingStatus";

interface HotspotDTO {
  id: string;
  pageId: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  url: string | null;
  caption: string | null;
}

interface PageDTO {
  id: string;
  pageNumber: number;
  hotspots: HotspotDTO[];
}

interface FlipbookDTO extends FlipbookOptionsValue {
  id: string;
  slug: string;
  status: string;
  pageCount: number | null;
  viewCount: number;
  downloadCount: number;
  pages: PageDTO[];
  _count: { viewEvents: number };
}

const TABS = ["Overview", "Settings", "Page links", "Danger zone"] as const;

export function FlipbookDetailClient({ flipbook }: { flipbook: FlipbookDTO }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [values, setValues] = useState<FlipbookOptionsValue>({
    title: flipbook.title,
    description: flipbook.description ?? "",
    renderDpi: flipbook.renderDpi,
    privacy: flipbook.privacy,
    password: "",
    defaultViewMode: flipbook.defaultViewMode,
    rtl: flipbook.rtl,
    flipSound: flipbook.flipSound,
    autoFlipEnabled: flipbook.autoFlipEnabled,
    autoFlipSeconds: flipbook.autoFlipSeconds,
    showToc: flipbook.showToc,
    showThumbnails: flipbook.showThumbnails,
    showDownloadBtn: flipbook.showDownloadBtn,
    showShareBtn: flipbook.showShareBtn,
    showPrintBtn: flipbook.showPrintBtn,
    allowDownload: flipbook.allowDownload,
    allowSearch: flipbook.allowSearch,
    allowZoom: flipbook.allowZoom,
    cornerFlipZones: flipbook.cornerFlipZones,
    backgroundStyle: flipbook.backgroundStyle,
    accentColor: flipbook.accentColor,
    hardCovers: flipbook.hardCovers,
    embedAllowed: flipbook.embedAllowed,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const shareUrl = useMemo(
    () => (typeof window !== "undefined" ? `${window.location.origin}/f/${flipbook.slug}` : `/f/${flipbook.slug}`),
    [flipbook.slug]
  );
  const embedCode = useMemo(
    () =>
      `<iframe src="${shareUrl}?embed=1" width="100%" height="640" style="border:0;" allowfullscreen loading="lazy"></iframe>`,
    [shareUrl]
  );

  async function saveSettings() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/flipbooks/${flipbook.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function deleteFlipbook() {
    if (!confirm(`Delete "${flipbook.title}"? This permanently removes the PDF and all rendered pages.`)) return;
    const res = await fetch(`/api/flipbooks/${flipbook.id}`, { method: "DELETE" });
    if (res.ok) router.push("/dashboard");
  }

  const isReady = flipbook.status === "READY";

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">{flipbook.title}</h1>
          <p className="text-sm text-muted mt-1">
            {flipbook.pageCount ? `${flipbook.pageCount} pages · ` : ""}
            {flipbook.viewCount} views · {flipbook.downloadCount} downloads
          </p>
        </div>
        {isReady && (
          <a
            href={`/f/${flipbook.slug}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-[#171512] hover:bg-accent-strong transition-colors"
          >
            Open flipbook
          </a>
        )}
      </div>

      {!isReady && (
        <div className="mt-6">
          <ProcessingStatus flipbookId={flipbook.id} initialStatus={flipbook.status} />
        </div>
      )}

      <div className="mt-8 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
              tab === t ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "Overview" && (
          <OverviewTab
            disabled={!isReady}
            shareUrl={shareUrl}
            embedCode={embedCode}
            embedAllowed={flipbook.embedAllowed}
            flipbookId={flipbook.id}
          />
        )}

        {tab === "Settings" && (
          <div className="max-w-2xl space-y-4">
            <OptionsForm value={values} onChange={setValues} mode="edit" />
            <div className="flex items-center gap-3">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-[#171512] hover:bg-accent-strong transition-colors disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              {saved && (
                <span className="flex items-center gap-1 text-sm text-emerald-400">
                  <Check size={14} /> Saved
                </span>
              )}
            </div>
          </div>
        )}

        {tab === "Page links" && <HotspotsTab flipbookId={flipbook.id} pages={flipbook.pages} disabled={!isReady} />}

        {tab === "Danger zone" && (
          <div className="max-w-lg rounded-xl border border-danger/30 bg-danger/5 p-6">
            <h3 className="font-medium text-danger">Delete this flipbook</h3>
            <p className="mt-2 text-sm text-muted">
              Removes the original PDF, every rendered page image, and all analytics for this
              flipbook from storage. This can&apos;t be undone.
            </p>
            <button
              onClick={deleteFlipbook}
              className="mt-4 flex items-center gap-2 rounded-full border border-danger/50 px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
            >
              <Trash2 size={14} /> Delete permanently
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={value} className={inputClass} onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="shrink-0 rounded-lg border border-border p-2.5 hover:border-accent transition-colors"
        aria-label="Copy"
      >
        {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
      </button>
    </div>
  );
}

function OverviewTab({
  disabled,
  shareUrl,
  embedCode,
  embedAllowed,
  flipbookId,
}: {
  disabled: boolean;
  shareUrl: string;
  embedCode: string;
  embedAllowed: boolean;
  flipbookId: string;
}) {
  if (disabled) {
    return <p className="text-sm text-muted">Sharing options unlock once processing finishes.</p>;
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="space-y-6">
        <div>
          <h3 className="font-medium mb-2">Share link</h3>
          <CopyField value={shareUrl} />
        </div>
        {embedAllowed && (
          <div>
            <h3 className="font-medium mb-2">Embed on your site</h3>
            <CopyField value={embedCode} />
          </div>
        )}
      </div>
      <div>
        <h3 className="font-medium mb-2">QR code</h3>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/flipbooks/${flipbookId}/qrcode`}
          alt="QR code linking to this flipbook"
          className="w-full rounded-xl border border-border bg-white p-3"
        />
      </div>
    </div>
  );
}

function HotspotsTab({
  flipbookId,
  pages,
  disabled,
}: {
  flipbookId: string;
  pages: PageDTO[];
  disabled: boolean;
}) {
  const [pageId, setPageId] = useState(pages[0]?.id ?? "");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [x, setX] = useState(0.7);
  const [y, setY] = useState(0.8);
  const [width, setWidth] = useState(0.25);
  const [height, setHeight] = useState(0.1);
  const [items, setItems] = useState<HotspotDTO[]>(pages.flatMap((p) => p.hotspots));
  const [submitting, setSubmitting] = useState(false);

  if (disabled) return <p className="text-sm text-muted">Page links unlock once processing finishes.</p>;

  async function addHotspot(e: React.FormEvent) {
    e.preventDefault();
    if (!pageId || !url) return;
    setSubmitting(true);
    const res = await fetch(`/api/flipbooks/${flipbookId}/hotspots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId, type: "LINK", url, caption: caption || null, x, y, width, height }),
    });
    setSubmitting(false);
    if (res.ok) {
      const json = await res.json();
      setItems((prev) => [...prev, json.hotspot]);
      setUrl("");
      setCaption("");
    }
  }

  async function removeHotspot(id: string) {
    const res = await fetch(`/api/hotspots/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((h) => h.id !== id));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={addHotspot} className="space-y-3 rounded-xl border border-border bg-surface p-5">
        <h3 className="font-medium">Add a clickable link</h3>
        <label className="block text-sm">
          Page
          <select value={pageId} onChange={(e) => setPageId(e.target.value)} className={`${inputClass} mt-1`}>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                Page {p.pageNumber}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          URL
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="block text-sm">
          Label (optional)
          <input value={caption} onChange={(e) => setCaption(e.target.value)} className={`${inputClass} mt-1`} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Left (x)" value={x} onChange={setX} />
          <NumberField label="Top (y)" value={y} onChange={setY} />
          <NumberField label="Width" value={width} onChange={setWidth} />
          <NumberField label="Height" value={height} onChange={setHeight} />
        </div>
        <p className="text-xs text-muted">
          Position values are fractions of the page (0 = left/top edge, 1 = right/bottom edge).
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-[#171512] hover:bg-accent-strong transition-colors disabled:opacity-60"
        >
          Add link
        </button>
      </form>

      <div className="space-y-2">
        <h3 className="font-medium mb-2">Existing links</h3>
        {items.length === 0 && <p className="text-sm text-muted">No page links yet.</p>}
        {items.map((h) => {
          const page = pages.find((p) => p.id === h.pageId);
          return (
            <div key={h.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5 text-sm">
              <div>
                <span className="text-muted">Page {page?.pageNumber ?? "?"} —</span> {h.caption || h.url}
              </div>
              <button onClick={() => removeHotspot(h.id)} className="text-muted hover:text-danger transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-xs">
      {label}
      <input
        type="number"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`${inputClass} mt-1`}
      />
    </label>
  );
}
