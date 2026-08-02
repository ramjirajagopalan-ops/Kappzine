"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-muted hover:text-danger transition-colors"
    >
      Sign out
    </button>
  );
}
