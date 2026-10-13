import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anatomy101 — Interactive Anatomy Atlas',
  description: 'Explore human anatomy in 3D, separate systems, save structures, and revise with active recall.',
  icons: { icon: '/icon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
