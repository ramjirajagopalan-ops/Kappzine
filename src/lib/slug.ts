import { customAlphabet } from "nanoid";
import { prisma } from "@/server/db";

const suffix = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

function baseSlugFor(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "flipbook";
}

export async function generateUniqueSlug(title: string): Promise<string> {
  const base = baseSlugFor(title);
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${suffix()}`;
    const existing = await prisma.flipbook.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
  }
  return `${base}-${suffix()}`;
}
