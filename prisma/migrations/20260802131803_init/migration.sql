-- CreateEnum
CREATE TYPE "StorageProviderKind" AS ENUM ('LOCAL', 'GDRIVE');

-- CreateEnum
CREATE TYPE "FlipbookStatus" AS ENUM ('DRAFT', 'UPLOADING', 'QUEUED', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "PrivacyMode" AS ENUM ('PUBLIC', 'UNLISTED', 'PASSWORD', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ViewMode" AS ENUM ('SINGLE', 'DOUBLE', 'AUTO');

-- CreateEnum
CREATE TYPE "PageCorner" AS ENUM ('ALL', 'TOP_RIGHT', 'BOTTOM_RIGHT');

-- CreateEnum
CREATE TYPE "HotspotType" AS ENUM ('LINK', 'VIDEO', 'IMAGE', 'TEXT');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "googleAccessToken" TEXT,
    "googleRefreshToken" TEXT,
    "googleTokenExpiry" TIMESTAMP(3),
    "driveRootFolderId" TEXT,
    "storageProvider" "StorageProviderKind" NOT NULL DEFAULT 'LOCAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Flipbook" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "status" "FlipbookStatus" NOT NULL DEFAULT 'DRAFT',
    "errorMessage" TEXT,
    "originalFileKey" TEXT,
    "originalFileName" TEXT,
    "originalFileSize" INTEGER,
    "pageCount" INTEGER,
    "renderDpi" INTEGER NOT NULL DEFAULT 150,
    "privacy" "PrivacyMode" NOT NULL DEFAULT 'UNLISTED',
    "passwordHash" TEXT,
    "defaultViewMode" "ViewMode" NOT NULL DEFAULT 'AUTO',
    "rtl" BOOLEAN NOT NULL DEFAULT false,
    "flipSound" BOOLEAN NOT NULL DEFAULT true,
    "backgroundMusicKey" TEXT,
    "autoFlipEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoFlipSeconds" INTEGER NOT NULL DEFAULT 6,
    "showToc" BOOLEAN NOT NULL DEFAULT true,
    "showThumbnails" BOOLEAN NOT NULL DEFAULT true,
    "showDownloadBtn" BOOLEAN NOT NULL DEFAULT true,
    "showShareBtn" BOOLEAN NOT NULL DEFAULT true,
    "showPrintBtn" BOOLEAN NOT NULL DEFAULT true,
    "allowDownload" BOOLEAN NOT NULL DEFAULT true,
    "allowSearch" BOOLEAN NOT NULL DEFAULT true,
    "allowZoom" BOOLEAN NOT NULL DEFAULT true,
    "cornerFlipZones" "PageCorner" NOT NULL DEFAULT 'ALL',
    "backgroundStyle" TEXT NOT NULL DEFAULT 'charcoal',
    "backgroundColor" TEXT,
    "backgroundImageKey" TEXT,
    "brandLogoKey" TEXT,
    "brandLogoLinkUrl" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#b98d4a',
    "pageCornerRadius" INTEGER NOT NULL DEFAULT 0,
    "hardCovers" BOOLEAN NOT NULL DEFAULT true,
    "gaTrackingId" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "embedAllowed" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flipbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "flipbookId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "thumbKey" TEXT NOT NULL,
    "lowKey" TEXT NOT NULL,
    "highKey" TEXT NOT NULL,
    "textContent" TEXT,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hotspot" (
    "id" TEXT NOT NULL,
    "flipbookId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" "HotspotType" NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "url" TEXT,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hotspot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewEvent" (
    "id" TEXT NOT NULL,
    "flipbookId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "referrer" TEXT,
    "country" TEXT,
    "deviceType" TEXT,
    "maxPageReached" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessingJob" (
    "id" TEXT NOT NULL,
    "flipbookId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Flipbook_slug_key" ON "Flipbook"("slug");

-- CreateIndex
CREATE INDEX "Flipbook_userId_idx" ON "Flipbook"("userId");

-- CreateIndex
CREATE INDEX "Page_flipbookId_idx" ON "Page"("flipbookId");

-- CreateIndex
CREATE UNIQUE INDEX "Page_flipbookId_pageNumber_key" ON "Page"("flipbookId", "pageNumber");

-- CreateIndex
CREATE INDEX "Hotspot_flipbookId_idx" ON "Hotspot"("flipbookId");

-- CreateIndex
CREATE INDEX "Hotspot_pageId_idx" ON "Hotspot"("pageId");

-- CreateIndex
CREATE INDEX "ViewEvent_flipbookId_createdAt_idx" ON "ViewEvent"("flipbookId", "createdAt");

-- CreateIndex
CREATE INDEX "ProcessingJob_status_createdAt_idx" ON "ProcessingJob"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flipbook" ADD CONSTRAINT "Flipbook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_flipbookId_fkey" FOREIGN KEY ("flipbookId") REFERENCES "Flipbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hotspot" ADD CONSTRAINT "Hotspot_flipbookId_fkey" FOREIGN KEY ("flipbookId") REFERENCES "Flipbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hotspot" ADD CONSTRAINT "Hotspot_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewEvent" ADD CONSTRAINT "ViewEvent_flipbookId_fkey" FOREIGN KEY ("flipbookId") REFERENCES "Flipbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessingJob" ADD CONSTRAINT "ProcessingJob_flipbookId_fkey" FOREIGN KEY ("flipbookId") REFERENCES "Flipbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
