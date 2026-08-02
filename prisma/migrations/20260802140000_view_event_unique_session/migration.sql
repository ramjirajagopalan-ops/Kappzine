-- AlterTable
ALTER TABLE "Flipbook" ADD COLUMN     "processedPages" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "ViewEvent_flipbookId_sessionId_key" ON "ViewEvent"("flipbookId", "sessionId");

