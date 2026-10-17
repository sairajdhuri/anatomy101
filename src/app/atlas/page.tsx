import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import AtlasStudio from '@/components/atlas-studio';

export const metadata: Metadata = { title: 'Interactive Atlas | Anatomy101' };

export default function AtlasPage() {
  return <Suspense fallback={<main className="atlas-opening" role="status"><p>Opening your anatomy atlas…</p><noscript><p>Enable JavaScript to use the interactive 3D atlas.</p></noscript><Link prefetch={false} href="/">Back to home</Link></main>}><AtlasStudio /></Suspense>;
}
