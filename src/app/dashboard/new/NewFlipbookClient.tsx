"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UploadCloud, FileText } from "lucide-react";
import { OptionsForm, DEFAULT_OPTIONS, type FlipbookOptionsValue } from "@/components/dashboard/OptionsForm";

export function NewFlipbookClient() {
  const router = useRouter();
  const [values, setValues] = useState<FlipbookOptionsValue>(DEFAULT_OPTIONS);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickFile(f: File | null) {
    if (!f) return;
    setFile(f);
    if (!values.title) {
      setValues((v) => ({ ...v, title: f.name.replace(/\.pdf$/i, "") }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a PDF to upload.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const createRes = await fetch("/api/flipbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) throw new Error(createJson.error?.formErrors?.[0] ?? createJson.error ?? "Could not create flipbook");

      const flipbookId = createJson.flipbook.id as string;

      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch(`/api/flipbooks/${flipbookId}/upload`, { method: "POST", body: formData });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error ?? "Upload failed");

      router.push(`/dashboard/${flipbookId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="order-2 lg:order-1">
        <OptionsForm value={values} onChange={setValues} mode="create" />
      </div>

      <div className="order-1 lg:order-2 space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pickFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragOver ? "border-accent bg-accent/5" : "border-border"
          }`}
        >
          {file ? (
            <>
              <FileText className="text-accent" size={28} />
              <p className="mt-3 text-sm font-medium break-all">{file.name}</p>
              <p className="mt-1 text-xs text-muted">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </>
          ) : (
            <>
              <UploadCloud className="text-muted" size={28} />
              <p className="mt-3 text-sm">Drag a PDF here, or</p>
            </>
          )}
          <label className="mt-3 cursor-pointer rounded-full border border-border px-4 py-2 text-xs hover:border-accent transition-colors">
            {file ? "Choose a different file" : "Browse files"}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-[#171512] hover:bg-accent-strong transition-colors disabled:opacity-60"
        >
          {submitting ? "Uploading & queuing…" : "Create flipbook"}
        </button>
        <p className="text-xs text-muted leading-relaxed">
          Pages are rendered by a background worker after upload — you&apos;ll land on a status page
          that updates automatically while it processes.
        </p>
      </div>
    </form>
  );
}
