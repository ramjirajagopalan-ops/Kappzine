import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { toAlbumDTO } from '@/lib/dto';
import { albumCookieName, verifyAlbumUnlockToken } from '@/lib/auth';
import PasswordGate from '@/components/PasswordGate';
import AlbumViewer from '@/components/AlbumViewer';

export const dynamic = 'force-dynamic';

export default async function PublicAlbumPage({ params }: { params: { slug: string } }) {
  const album = await prisma.album.findUnique({
    where: { slug: params.slug },
    include: { pages: { include: { overlays: true }, orderBy: { order: 'asc' } } },
  });

  if (!album || !album.published) notFound();

  if (album.passwordHash) {
    const token = cookies().get(albumCookieName(album.id))?.value;
    const unlocked = await verifyAlbumUnlockToken(token, album.id);
    if (!unlocked) {
      return <PasswordGate slug={album.slug} title={album.title} />;
    }
  }

  return <AlbumViewer album={toAlbumDTO(album)} />;
}
