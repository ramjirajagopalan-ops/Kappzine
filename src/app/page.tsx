import Link from "next/link";
import { auth } from "@/server/auth";
import { BookOpen, Layers, Lock, Search, Share2, Sparkles } from "lucide-react";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Realistic page-turn physics",
    body: "Drag any corner, click, swipe, or use the arrows — pages bend and cast shadow exactly like paper, powered by StPageFlip.",
  },
  {
    icon: Layers,
    title: "Every creation option",
    body: "Single/double page, auto-flip slideshow, flip sound, background music, themes, hard covers, RTL, custom accent color.",
  },
  {
    icon: Search,
    title: "Search inside the book",
    body: "Full text is extracted from your PDF at upload time, so readers can jump straight to the page that mentions a word.",
  },
  {
    icon: Share2,
    title: "Share & embed anywhere",
    body: "A clean public link, an iframe embed snippet, and a QR code are generated for every flipbook automatically.",
  },
  {
    icon: Lock,
    title: "Privacy controls",
    body: "Public, unlisted, password-protected, or fully private — set it per flipbook, plus toggle downloads on or off.",
  },
  {
    icon: Sparkles,
    title: "Your own storage",
    body: "Files live on local disk or your own Google Drive — no third-party cloud lock-in, ready to swap in cheaper storage later.",
  },
];

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex-1">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-xl">Kappzine</span>
        <nav className="flex items-center gap-4 text-sm">
          {session ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-accent px-4 py-2 font-semibold text-[#171512] hover:bg-accent-strong transition-colors"
            >
              Go to dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-border px-4 py-2 hover:border-accent transition-colors"
            >
              Sign in
            </Link>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 pt-16 pb-20 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Self-hosted flipbook studio</p>
        <h1 className="font-display mt-4 text-4xl leading-tight sm:text-5xl">
          Turn any PDF into a page-flip magazine, on your own storage.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-muted">
          Upload a PDF, pick your options, and get a realistic, interactive flipbook you can share
          with a link, embed on a site, or download as a QR code — built for internal / startup use,
          not a commercial resale product.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href={session ? "/dashboard/new" : "/login"}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-[#171512] hover:bg-accent-strong transition-colors"
          >
            Create a flipbook
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border border-border bg-surface p-6">
            <Icon className="text-accent" size={22} />
            <h3 className="mt-4 font-medium">{title}</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
