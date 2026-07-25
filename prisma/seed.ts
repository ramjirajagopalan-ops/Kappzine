import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'seed-alex-priya');

async function placeholder(label: string, colorA: string, colorB: string, filename: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${colorA}"/>
        <stop offset="100%" stop-color="${colorB}"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="1600" fill="url(#g)"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
      font-family="Georgia, 'Iowan Old Style', serif" font-size="72" fill="rgba(255,255,255,0.85)">${label}</text>
  </svg>`;
  const buffer = await sharp(Buffer.from(svg)).webp({ quality: 86 }).toBuffer();
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/seed-alex-priya/${filename}`;
}

async function main() {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const existing = await prisma.album.findUnique({ where: { slug: 'alex-and-priya' } });
  if (existing) {
    console.log('Seed album already exists, skipping.');
    return;
  }

  const pagesSpec: { label: string; a: string; b: string; caption?: string; hard?: boolean; isCover?: boolean }[] = [
    { label: 'Front Cover', a: '#5c1f2a', b: '#2a0f14', caption: 'Alex & Priya — June 14, 2026', hard: true, isCover: true },
    { label: 'Page 1', a: '#4a3c2e', b: '#2b241c', caption: 'Getting Ready' },
    { label: 'Page 2', a: '#3e4a3a', b: '#242c22', caption: 'The Ceremony' },
    { label: 'Page 3', a: '#3a4550', b: '#232a30', caption: 'The Vows' },
    { label: 'Page 4', a: '#4d3a2e', b: '#2c221b', caption: 'Family Portraits' },
    { label: 'Page 5', a: '#4a3242', b: '#2a1c26', caption: 'The Reception' },
    { label: 'Page 6', a: '#33474a', b: '#1e2a2c', caption: 'Toasts & Speeches' },
    { label: 'Page 7', a: '#4a4030', b: '#2b251c', caption: 'Dinner' },
    { label: 'Page 8', a: '#3e3a4d', b: '#23212c', caption: 'First Dance' },
    { label: 'Back Cover', a: '#5c1f2a', b: '#2a0f14', caption: 'Thank You For Celebrating With Us', hard: true, isCover: true },
  ];

  const album = await prisma.album.create({
    data: {
      title: "Alex & Priya's Wedding",
      slug: 'alex-and-priya',
      coupleNames: 'Alex & Priya',
      description: 'Our wedding day, June 14 2026.',
      theme: 'classic-brass',
      hardCovers: true,
      pageMode: 'single',
      soundEnabled: true,
      aspectRatio: '3:4',
      published: true,
    },
  });

  for (let i = 0; i < pagesSpec.length; i++) {
    const spec = pagesSpec[i];
    const imageUrl = await placeholder(spec.label, spec.a, spec.b, `page-${i}.webp`);
    await prisma.page.create({
      data: {
        albumId: album.id,
        order: i,
        imageUrl,
        caption: spec.caption,
        isCover: Boolean(spec.isCover),
        density: spec.hard ? 'hard' : 'soft',
      },
    });
  }

  const firstPage = await prisma.page.findFirst({ where: { albumId: album.id, order: 1 } });
  if (firstPage) {
    await prisma.overlay.create({
      data: {
        pageId: firstPage.id,
        type: 'link',
        x: 60,
        y: 65,
        width: 30,
        height: 20,
        url: 'https://example.com',
        label: 'Sample link hotspot',
      },
    });
  }

  console.log('Seeded album: alex-and-priya');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
