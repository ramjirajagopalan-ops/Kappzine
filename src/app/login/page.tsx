import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  const devLoginEnabled = process.env.ENABLE_DEV_LOGIN === "true";

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="font-display text-3xl text-foreground">Kappzine</h1>
        <p className="mt-2 text-sm text-muted">Sign in to build and manage your flipbooks.</p>
      </div>
      <LoginForm devLoginEnabled={devLoginEnabled} />
    </main>
  );
}
