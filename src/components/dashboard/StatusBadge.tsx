const LABELS: Record<string, { text: string; className: string }> = {
  DRAFT: { text: "Draft", className: "bg-white/10 text-muted" },
  UPLOADING: { text: "Uploading", className: "bg-accent/20 text-accent" },
  QUEUED: { text: "Queued", className: "bg-accent/20 text-accent" },
  PROCESSING: { text: "Processing", className: "bg-accent/20 text-accent" },
  READY: { text: "Ready", className: "bg-emerald-500/20 text-emerald-400" },
  FAILED: { text: "Failed", className: "bg-danger/20 text-danger" },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = LABELS[status] ?? LABELS.DRAFT;
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cfg.className}`}>
      {cfg.text}
    </span>
  );
}
