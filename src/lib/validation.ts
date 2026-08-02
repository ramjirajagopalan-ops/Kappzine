import { z } from "zod";

export const privacyEnum = z.enum(["PUBLIC", "UNLISTED", "PASSWORD", "PRIVATE"]);
export const viewModeEnum = z.enum(["SINGLE", "DOUBLE", "AUTO"]);
export const cornerEnum = z.enum(["ALL", "TOP_RIGHT", "BOTTOM_RIGHT"]);

// Every option from the Heyzine-style "customize" panel. All optional so the
// same schema covers both creation (with sensible defaults applied by
// Prisma) and partial PATCH updates from the settings page.
export const flipbookOptionsSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  renderDpi: z.union([z.literal(96), z.literal(150), z.literal(220)]).optional(),

  privacy: privacyEnum.optional(),
  password: z.string().min(4).max(100).nullable().optional(),

  defaultViewMode: viewModeEnum.optional(),
  rtl: z.boolean().optional(),
  flipSound: z.boolean().optional(),
  autoFlipEnabled: z.boolean().optional(),
  autoFlipSeconds: z.number().int().min(2).max(60).optional(),
  showToc: z.boolean().optional(),
  showThumbnails: z.boolean().optional(),
  showDownloadBtn: z.boolean().optional(),
  showShareBtn: z.boolean().optional(),
  showPrintBtn: z.boolean().optional(),
  allowDownload: z.boolean().optional(),
  allowSearch: z.boolean().optional(),
  allowZoom: z.boolean().optional(),
  cornerFlipZones: cornerEnum.optional(),
  backgroundStyle: z.string().max(40).optional(),
  backgroundColor: z.string().max(20).nullable().optional(),
  accentColor: z.string().max(20).optional(),
  pageCornerRadius: z.number().int().min(0).max(40).optional(),
  hardCovers: z.boolean().optional(),
  gaTrackingId: z.string().max(60).nullable().optional(),
  seoTitle: z.string().max(200).nullable().optional(),
  seoDescription: z.string().max(400).nullable().optional(),
  embedAllowed: z.boolean().optional(),
  brandLogoLinkUrl: z.string().url().max(500).nullable().optional().or(z.literal("")),
});

export type FlipbookOptionsInput = z.infer<typeof flipbookOptionsSchema>;

export const createFlipbookSchema = flipbookOptionsSchema.extend({
  title: z.string().trim().min(1).max(200),
});

export const hotspotSchema = z.object({
  pageId: z.string().min(1),
  type: z.enum(["LINK", "VIDEO", "IMAGE", "TEXT"]),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0.01).max(1),
  height: z.number().min(0.01).max(1),
  url: z.string().max(1000).nullable().optional(),
  caption: z.string().max(300).nullable().optional(),
});
