import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { SignOutButton } from "@/components/dashboard/SignOutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="font-display text-lg">
            Kappzine
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/dashboard" className="text-muted hover:text-foreground transition-colors">
              My flipbooks
            </Link>
            <Link href="/dashboard/settings" className="text-muted hover:text-foreground transition-colors">
              Settings
            </Link>
            <Link
              href="/dashboard/new"
              className="rounded-full bg-accent px-4 py-1.5 font-semibold text-[#171512] hover:bg-accent-strong transition-colors"
            >
              + New flipbook
            </Link>
            <span className="text-muted">{session.user.email}</span>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
