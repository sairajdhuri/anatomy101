import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'Anatomy101 — Interactive Anatomy Atlas',
  description: 'Explore human anatomy in 3D, separate systems, save structures, and revise with active recall.',
  icons: {
    icon: { url: '/heart.webp?v=2', type: 'image/webp' },
    apple: '/heart-touch-icon.png?v=2',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={dmSans.variable}><body>{children}</body></html>;
}
