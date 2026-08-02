import "dotenv/config";
import { prisma } from "@/server/db";
import { claimNextJob, completeJob, failJob } from "@/server/jobs/queue";
import { getStorageForUser } from "@/server/storage";
import { processPdf } from "@/server/pdf/processPdf";

const POLL_INTERVAL_MS = 3000;

async function runOne(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) return false;

  const flipbook = job.flipbook;
  console.log(`[worker] processing flipbook ${flipbook.id} ("${flipbook.title}")`);

  try {
    await prisma.flipbook.update({
      where: { id: flipbook.id },
      data: { status: "PROCESSING", processedPages: 0, errorMessage: null },
    });

    if (!flipbook.originalFileKey) {
      throw new Error("Flipbook has no uploaded PDF (originalFileKey missing)");
    }

    const storage = await getStorageForUser(flipbook.userId);
    const pdfBuffer = await storage.get(flipbook.originalFileKey);

    const result = await processPdf({
      storage,
      userId: flipbook.userId,
      flipbookId: flipbook.id,
      pdfBuffer,
      renderDpi: flipbook.renderDpi,
      onProgress: async (current) => {
        await prisma.flipbook.update({
          where: { id: flipbook.id },
          data: { processedPages: current },
        });
      },
    });

    await prisma.$transaction([
      prisma.page.deleteMany({ where: { flipbookId: flipbook.id } }),
      prisma.page.createMany({
        data: result.pages.map((p) => ({
          flipbookId: flipbook.id,
          pageNumber: p.pageNumber,
          width: p.width,
          height: p.height,
          thumbKey: p.thumbKey,
          lowKey: p.lowKey,
          highKey: p.highKey,
          textContent: p.textContent,
        })),
      }),
      prisma.flipbook.update({
        where: { id: flipbook.id },
        data: {
          status: "READY",
          pageCount: result.pageCount,
          processedPages: result.pageCount,
          publishedAt: flipbook.publishedAt ?? new Date(),
        },
      }),
    ]);

    await completeJob(job.id);
    console.log(`[worker] finished flipbook ${flipbook.id}: ${result.pageCount} pages`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[worker] failed flipbook ${flipbook.id}:`, message);
    await failJob(job.id, message);
    await prisma.flipbook.update({
      where: { id: flipbook.id },
      data: { status: "FAILED", errorMessage: message },
    });
  }

  return true;
}

async function main() {
  console.log("[worker] Kappzine PDF processing worker started, polling for jobs...");
  while (true) {
    let didWork = false;
    try {
      didWork = await runOne();
    } catch (err) {
      console.error("[worker] unexpected error claiming/running job:", err);
    }
    if (!didWork) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
