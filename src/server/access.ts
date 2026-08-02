import type { Flipbook } from "@prisma/client";
import { cookies } from "next/headers";
import { auth } from "@/server/auth";
import { unlockCookieName, verifyUnlockToken } from "@/lib/unlockToken";

export type ViewAccessResult =
  | { allowed: true }
  | { allowed: false; reason: "password_required" }
  | { allowed: false; reason: "forbidden" };

/**
 * Central gate for the public viewer, the file-serving route, and PDF
 * downloads — every read path for a flipbook's content funnels through
 * here so privacy rules stay consistent across all three.
 */
export async function checkViewAccess(flipbook: Flipbook): Promise<ViewAccessResult> {
  if (flipbook.privacy === "PUBLIC" || flipbook.privacy === "UNLISTED") {
    return { allowed: true };
  }

  const session = await auth();
  if (session?.user?.id === flipbook.userId) return { allowed: true };

  if (flipbook.privacy === "PRIVATE") {
    return { allowed: false, reason: "forbidden" };
  }

  // PASSWORD
  const jar = await cookies();
  const token = jar.get(unlockCookieName(flipbook.id))?.value;
  if (token && verifyUnlockToken(token, flipbook.id)) {
    return { allowed: true };
  }
  return { allowed: false, reason: "password_required" };
}
