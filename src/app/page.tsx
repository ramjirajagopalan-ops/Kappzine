import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getTheme } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const albums = await prisma.album.findMany({
    where: { published: true },
    orderBy: { updatedAt: 'desc' },
    include: { pages: { select: { id: true, imageUrl: true, order: true }, orderBy: { order: 'asc' } } },
  });

  return (
    <div className="mx-auto min-h-[100dvh] max-w-5xl px-6 py-16">
      <div className="mb-14 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-brass">Kappzine</p>
          <h1 className="font-display mt-2 text-3xl text-stone-100">Wedding &amp; Family Flipbooks</h1>
        </div>
        <Link
          href="/admin"
          className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-wider text-stone-300 transition-colors hover:border-brass hover:text-brass"
        >
          Admin
        </Link>
      </div>

      {albums.length === 0 ? (
        <p className="text-stone-500">No albums published yet. Head to the admin dashboard to create one.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {albums.map((album) => {
            const theme = getTheme(album.theme);
            const thumb = album.coverImageUrl || album.pages[0]?.imageUrl || null;
            return (
              <Link
                key={album.id}
                href={`/album/${album.slug}`}
                className="group overflow-hidden rounded-lg border border-white/10 transition-transform hover:-translate-y-1"
                style={{ background: theme.bg }}
              >
                <div
                  className="flex aspect-[3/4] items-center justify-center bg-cover bg-center"
                  style={
                    thumb
                      ? { backgroundImage: `url(${thumb})` }
                      : { background: `linear-gradient(160deg, ${theme.accent}55, ${theme.bg})` }
                  }
                >
                  {!thumb && <span className="font-display px-4 text-center text-lg text-white/90">{album.title}</span>}
                </div>
                <div className="p-4">
                  <p className="font-display text-stone-100">{album.coupleNames || album.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-stone-500">
                    {album.pages.length} pages{album.passwordHash ? ' · protected' : ''}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
