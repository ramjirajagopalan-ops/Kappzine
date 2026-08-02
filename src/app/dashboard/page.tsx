import Link from "next/link";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Eye, FileText } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const flipbooks = await prisma.flipbook.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
  });

  if (flipbooks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
        <FileText className="text-muted" size={32} />
        <h2 className="mt-4 font-display text-xl">No flipbooks yet</h2>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Upload a PDF and pick your options to create your first realistic page-flip magazine.
        </p>
        <Link
          href="/dashboard/new"
          className="mt-6 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-[#171512] hover:bg-accent-strong transition-colors"
        >
          Create a flipbook
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl">My flipbooks</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {flipbooks.map((fb) => (
          <Link
            key={fb.id}
            href={`/dashboard/${fb.id}`}
            className="group rounded-xl border border-border bg-surface p-4 hover:border-accent transition-colors"
          >
            <div className="flex aspect-[4/5] items-center justify-center rounded-lg bg-surface-2 overflow-hidden">
              {fb.status === "READY" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/files/${fb.id}/pages/1/thumb.webp`}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <FileText className="text-muted" size={28} />
              )}
            </div>
            <div className="mt-3 flex items-start justify-between gap-2">
              <h3 className="font-medium leading-snug line-clamp-2">{fb.title}</h3>
              <StatusBadge status={fb.status} />
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1">
                <Eye size={13} /> {fb.viewCount}
              </span>
              {fb.pageCount ? <span>{fb.pageCount} pages</span> : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
