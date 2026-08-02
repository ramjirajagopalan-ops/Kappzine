"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function SettingsClient({
  storageProvider,
  googleDriveConnected,
}: {
  storageProvider: "LOCAL" | "GDRIVE";
  googleDriveConnected: boolean;
}) {
  const [provider, setProvider] = useState(storageProvider);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(next: "LOCAL" | "GDRIVE") {
    if (next === "GDRIVE" && !googleDriveConnected) {
      setError("Connect Google Drive first (sign in with Google below).");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storageProvider: next }),
    });
    setSaving(false);
    if (res.ok) setProvider(next);
    else setError((await res.json()).error ?? "Could not update storage provider");
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="font-medium">Storage provider</h3>
        <p className="mt-1 text-sm text-muted">
          Where new uploads and rendered pages are stored. Existing flipbooks stay on whichever
          provider was active when they were created.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => choose("LOCAL")}
            disabled={saving}
            className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
              provider === "LOCAL" ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
            }`}
          >
            <span className="font-medium">Local disk</span>
            <p className="mt-1 text-xs text-muted">Stored on this server&apos;s volume.</p>
          </button>
          <button
            onClick={() => choose("GDRIVE")}
            disabled={saving}
            className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
              provider === "GDRIVE" ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
            }`}
          >
            <span className="font-medium">Google Drive</span>
            <p className="mt-1 text-xs text-muted">
              {googleDriveConnected ? "Connected." : "Not connected yet."}
            </p>
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </div>

      {!googleDriveConnected && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="font-medium">Connect Google Drive</h3>
          <p className="mt-1 text-sm text-muted">
            Sign in with Google to grant Kappzine access to a dedicated &quot;Kappzine
            Flipbooks&quot; folder in your Drive (not your whole Drive).
          </p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard/settings" })}
            className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-[#171512] hover:bg-accent-strong transition-colors"
          >
            Connect with Google
          </button>
        </div>
      )}
    </div>
  );
}
