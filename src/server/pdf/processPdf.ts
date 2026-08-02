import sharp from "sharp";
import type { Canvas, SKRSContext2D } from "@napi-rs/canvas";
import { keyFor, contentTypeFor, type StorageProvider } from "@/server/storage";

interface NodeCanvasFactory {
  create(width: number, height: number): { canvas: Canvas; context: SKRSContext2D };
  destroy(canvasAndContext: { canvas: Canvas; context: SKRSContext2D }): void;
}

// The main pdfjs-dist build assumes browser globals (DOMMatrix, etc); the
// `legacy` build is the one that patches those in for plain Node.js and
// wires up @napi-rs/canvas as its raster target automatically.
type PdfjsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
let pdfjsPromise: Promise<PdfjsModule> | null = null;
function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjsPromise;
}

// Raster tiers rendered per page. "low" is what streams in while the reader
// is actively flipping (small, loads instantly); "high" is swapped in once a
// page is at rest or the reader zooms, matching Heyzine's progressive-load
// behavior on large scans.
const TIERS = {
  thumb: 240,
  low: 900,
  high: 1800,
} as const;

export interface ProcessedPage {
  pageNumber: number;
  width: number;
  height: number;
  thumbKey: string;
  lowKey: string;
  highKey: string;
  textContent: string;
}

export interface ProcessPdfOptions {
  storage: StorageProvider;
  userId: string;
  flipbookId: string;
  pdfBuffer: Buffer;
  renderDpi: number; // used only to pick the base render scale (draft/standard/high)
  onProgress?: (current: number, total: number) => Promise<void> | void;
}

export interface ProcessPdfResult {
  pageCount: number;
  pages: ProcessedPage[];
}

export async function processPdf(opts: ProcessPdfOptions): Promise<ProcessPdfResult> {
  const pdfjsLib = await loadPdfjs();
  const data = new Uint8Array(opts.pdfBuffer);
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;

  // renderDpi is a user-facing quality dial (96 draft / 150 standard / 220 high);
  // 72 is the PDF's native points-per-inch, so this converts it to a canvas scale.
  const baseScale = Math.max(1, opts.renderDpi / 72);

  const pages: ProcessedPage[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: baseScale });

    // pdfjs-dist's Node canvas factory (backed by @napi-rs/canvas) isn't part
    // of its public TypeScript surface — `canvasFactory` is typed as `Object`
    // and RenderParameters doesn't declare it, even though the legacy Node
    // build requires it. Narrow casts here, not `any` throughout the file.
    const canvasFactory = doc.canvasFactory as NodeCanvasFactory;
    const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
    await page.render({
      canvasContext: canvasAndContext.context,
      viewport,
      canvasFactory,
    } as unknown as Parameters<typeof page.render>[0]).promise;

    const fullResPng = canvasAndContext.canvas.toBuffer("image/png");
    canvasFactory.destroy(canvasAndContext);

    const width = Math.round(viewport.width);
    const height = Math.round(viewport.height);

    const [thumbKey, lowKey, highKey] = await Promise.all([
      renderTier(fullResPng, width, TIERS.thumb, opts, pageNumber, "thumb"),
      renderTier(fullResPng, width, TIERS.low, opts, pageNumber, "low"),
      renderTier(fullResPng, width, TIERS.high, opts, pageNumber, "high"),
    ]);

    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .trim();

    pages.push({ pageNumber, width, height, thumbKey, lowKey, highKey, textContent: text });

    await opts.onProgress?.(pageNumber, doc.numPages);
  }

  return { pageCount: doc.numPages, pages };
}

async function renderTier(
  fullResPng: Buffer,
  fullWidth: number,
  targetWidth: number,
  opts: ProcessPdfOptions,
  pageNumber: number,
  tier: "thumb" | "low" | "high"
): Promise<string> {
  const width = Math.min(targetWidth, fullWidth);
  const webp = await sharp(fullResPng)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: tier === "thumb" ? 70 : tier === "low" ? 78 : 88 })
    .toBuffer();

  const key = keyFor(opts.userId, opts.flipbookId, "pages", String(pageNumber), `${tier}.webp`);
  await opts.storage.put(key, webp, contentTypeFor("webp"));
  return key;
}
