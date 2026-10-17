import type { Metadata } from 'next';
import AtlasLanding from '@/components/atlas-landing';

export const metadata: Metadata = { title: 'Anatomy101 | Explore human anatomy' };

export default function Page() {
  return <AtlasLanding />;
}
