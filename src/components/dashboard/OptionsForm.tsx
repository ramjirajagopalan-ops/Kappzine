"use client";

import { useState } from "react";

export interface FlipbookOptionsValue {
  title: string;
  description: string;
  renderDpi: 96 | 150 | 220;
  privacy: "PUBLIC" | "UNLISTED" | "PASSWORD" | "PRIVATE";
  password: string;
  defaultViewMode: "SINGLE" | "DOUBLE" | "AUTO";
  rtl: boolean;
  flipSound: boolean;
  autoFlipEnabled: boolean;
  autoFlipSeconds: number;
  showToc: boolean;
  showThumbnails: boolean;
  showDownloadBtn: boolean;
  showShareBtn: boolean;
  showPrintBtn: boolean;
  allowDownload: boolean;
  allowSearch: boolean;
  allowZoom: boolean;
  cornerFlipZones: "ALL" | "TOP_RIGHT" | "BOTTOM_RIGHT";
  backgroundStyle: string;
  accentColor: string;
  hardCovers: boolean;
  embedAllowed: boolean;
}

export const DEFAULT_OPTIONS: FlipbookOptionsValue = {
  title: "",
  description: "",
  renderDpi: 150,
  privacy: "UNLISTED",
  password: "",
  defaultViewMode: "AUTO",
  rtl: false,
  flipSound: true,
  autoFlipEnabled: false,
  autoFlipSeconds: 6,
  showToc: true,
  showThumbnails: true,
  showDownloadBtn: true,
  showShareBtn: true,
  showPrintBtn: true,
  allowDownload: true,
  allowSearch: true,
  allowZoom: true,
  cornerFlipZones: "ALL",
  backgroundStyle: "charcoal",
  accentColor: "#b98d4a",
  hardCovers: true,
  embedAllowed: true,
};

const BACKGROUND_STYLES = [
  { value: "charcoal", label: "Charcoal" },
  { value: "linen", label: "Linen" },
  { value: "midnight", label: "Midnight blue" },
  { value: "forest", label: "Forest" },
  { value: "plain-white", label: "Plain white" },
];

export function OptionsForm({
  value,
  onChange,
  mode,
}: {
  value: FlipbookOptionsValue;
  onChange: (next: FlipbookOptionsValue) => void;
  mode: "create" | "edit";
}) {
  function set<K extends keyof FlipbookOptionsValue>(key: K, v: FlipbookOptionsValue[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="space-y-8">
      <Section title="Basics">
        <Field label="Title">
          <input
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Q3 Product Catalogue"
            className={inputClass}
            required
          />
        </Field>
        <Field label="Description (optional)">
          <textarea
            value={value.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            className={inputClass}
          />
        </Field>
        {mode === "create" && (
          <Field label="Render quality" hint="Higher quality = sharper zoom, slower processing, more storage.">
            <div className="flex gap-2">
              {[
                { v: 96, label: "Draft (96 DPI)" },
                { v: 150, label: "Standard (150 DPI)" },
                { v: 220, label: "High (220 DPI)" },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.v}
                  onClick={() => set("renderDpi", opt.v as 96 | 150 | 220)}
                  className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                    value.renderDpi === opt.v
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-muted hover:border-accent/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>
        )}
      </Section>

      <Section title="Privacy & access">
        <Field label="Who can view this">
          <select
            value={value.privacy}
            onChange={(e) => set("privacy", e.target.value as FlipbookOptionsValue["privacy"])}
            className={inputClass}
          >
            <option value="PUBLIC">Public — anyone with the link, indexable</option>
            <option value="UNLISTED">Unlisted — anyone with the link</option>
            <option value="PASSWORD">Password protected</option>
            <option value="PRIVATE">Private — only me</option>
          </select>
        </Field>
        {value.privacy === "PASSWORD" && (
          <Field label={mode === "edit" ? "New password (leave blank to keep current)" : "Password"}>
            <input
              type="text"
              value={value.password}
              onChange={(e) => set("password", e.target.value)}
              className={inputClass}
              placeholder="Shared with readers"
            />
          </Field>
        )}
        <ToggleRow label="Allow PDF download" checked={value.allowDownload} onChange={(v) => set("allowDownload", v)} />
        <ToggleRow label="Allow embedding on other sites" checked={value.embedAllowed} onChange={(v) => set("embedAllowed", v)} />
      </Section>

      <Section title="Reading experience">
        <Field label="Default page layout">
          <select
            value={value.defaultViewMode}
            onChange={(e) => set("defaultViewMode", e.target.value as FlipbookOptionsValue["defaultViewMode"])}
            className={inputClass}
          >
            <option value="AUTO">Auto (spread on desktop, single on mobile)</option>
            <option value="SINGLE">Single page</option>
            <option value="DOUBLE">Double page spread</option>
          </select>
        </Field>
        <Field label="Corner drag zones">
          <select
            value={value.cornerFlipZones}
            onChange={(e) => set("cornerFlipZones", e.target.value as FlipbookOptionsValue["cornerFlipZones"])}
            className={inputClass}
          >
            <option value="ALL">All corners</option>
            <option value="TOP_RIGHT">Top-right only</option>
            <option value="BOTTOM_RIGHT">Bottom-right only</option>
          </select>
        </Field>
        <ToggleRow label="Right-to-left page order" checked={value.rtl} onChange={(v) => set("rtl", v)} />
        <ToggleRow label="Page flip sound effect" checked={value.flipSound} onChange={(v) => set("flipSound", v)} />
        <ToggleRow label="Hard covers (front/back)" checked={value.hardCovers} onChange={(v) => set("hardCovers", v)} />
        <ToggleRow label="Allow zoom" checked={value.allowZoom} onChange={(v) => set("allowZoom", v)} />
        <ToggleRow label="Allow search inside the book" checked={value.allowSearch} onChange={(v) => set("allowSearch", v)} />
        <ToggleRow
          label="Auto-flip slideshow"
          checked={value.autoFlipEnabled}
          onChange={(v) => set("autoFlipEnabled", v)}
        />
        {value.autoFlipEnabled && (
          <Field label="Seconds per page">
            <input
              type="number"
              min={2}
              max={60}
              value={value.autoFlipSeconds}
              onChange={(e) => set("autoFlipSeconds", Number(e.target.value))}
              className={inputClass}
            />
          </Field>
        )}
      </Section>

      <Section title="Toolbar & appearance">
        <ToggleRow label="Show table of contents / thumbnail rail" checked={value.showToc} onChange={(v) => set("showToc", v)} />
        <ToggleRow label="Show thumbnails strip" checked={value.showThumbnails} onChange={(v) => set("showThumbnails", v)} />
        <ToggleRow label="Show download button" checked={value.showDownloadBtn} onChange={(v) => set("showDownloadBtn", v)} />
        <ToggleRow label="Show share button" checked={value.showShareBtn} onChange={(v) => set("showShareBtn", v)} />
        <ToggleRow label="Show print button" checked={value.showPrintBtn} onChange={(v) => set("showPrintBtn", v)} />
        <Field label="Background theme">
          <select
            value={value.backgroundStyle}
            onChange={(e) => set("backgroundStyle", e.target.value)}
            className={inputClass}
          >
            {BACKGROUND_STYLES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Accent color">
          <input
            type="color"
            value={value.accentColor}
            onChange={(e) => set("accentColor", e.target.value)}
            className="h-10 w-20 rounded-lg border border-border bg-surface"
          />
        </Field>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <h3 className="font-medium">{title}</h3>
        <span className="text-muted text-xs">{open ? "Hide" : "Show"}</span>
      </button>
      {open && <div className="space-y-4 border-t border-border px-5 py-4">{children}</div>}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      {hint && <span className="block text-xs text-muted mb-1.5">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent";
