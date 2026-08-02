"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface StatusResponse {
  status: string;
  pageCount: number | null;
  processedPages: number;
  errorMessage: string | null;
}

export function ProcessingStatus({ flipbookId, initialStatus }: { flipbookId: string; initialStatus: string }) {
  const router = useRouter();
  const [data, setData] = useState<StatusResponse>({
    status: initialStatus,
    pageCount: null,
    processedPages: 0,
    errorMessage: null,
  });

  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/flipbooks/${flipbookId}/status`, { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const json: StatusResponse = await res.json();
      setData(json);
      if (json.status === "READY" || json.status === "FAILED") {
        clearInterval(interval);
        router.refresh();
      }
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [flipbookId, router]);

  const pct = data.pageCount ? Math.round((data.processedPages / data.pageCount) * 100) : 5;

  if (data.status === "FAILED") {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 p-6">
        <h3 className="font-medium text-danger">Processing failed</h3>
        <p className="mt-2 text-sm text-muted">{data.errorMessage || "Unknown error."}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h3 className="font-medium">
        {data.status === "UPLOADING" && "Uploading…"}
        {data.status === "QUEUED" && "Queued for processing…"}
        {data.status === "PROCESSING" && "Rendering pages…"}
      </h3>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {data.pageCount ? `${data.processedPages} / ${data.pageCount} pages` : "Starting up…"}
      </p>
    </div>
  );
}
