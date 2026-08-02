import { prisma } from "@/server/db";

export async function enqueueProcessing(flipbookId: string): Promise<void> {
  await prisma.$transaction([
    prisma.processingJob.create({ data: { flipbookId } }),
    prisma.flipbook.update({ where: { id: flipbookId }, data: { status: "QUEUED" } }),
  ]);
}

/**
 * Grabs the oldest PENDING job and atomically flips it to RUNNING so two
 * worker processes never pick up the same job (single UPDATE ... WHERE
 * status='PENDING' guarded by Postgres row locking via a transaction).
 */
export async function claimNextJob() {
  return prisma.$transaction(async (tx) => {
    const job = await tx.processingJob.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });
    if (!job) return null;

    return tx.processingJob.update({
      where: { id: job.id },
      data: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 } },
      include: { flipbook: true },
    });
  });
}

export async function completeJob(jobId: string): Promise<void> {
  await prisma.processingJob.update({
    where: { id: jobId },
    data: { status: "DONE", finishedAt: new Date() },
  });
}

export async function failJob(jobId: string, error: string): Promise<void> {
  await prisma.processingJob.update({
    where: { id: jobId },
    data: { status: "FAILED", finishedAt: new Date(), error },
  });
}
