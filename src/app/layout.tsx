import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kappzine — Wedding & Family Flipbooks',
  description: 'Self-hosted flipbook albums for weddings and family memories.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#171512] text-stone-200 antialiased">{children}</body>
    </html>
  );
}
