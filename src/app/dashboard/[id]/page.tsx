import { notFound, redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { FlipbookDetailClient } from "./FlipbookDetailClient";

export default async function FlipbookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const flipbook = await prisma.flipbook.findUnique({
    where: { id },
    include: {
      pages: { orderBy: { pageNumber: "asc" }, include: { hotspots: true } },
      _count: { select: { viewEvents: true } },
    },
  });
  if (!flipbook || flipbook.userId !== session.user.id) notFound();

  return <FlipbookDetailClient flipbook={JSON.parse(JSON.stringify(flipbook))} />;
}
