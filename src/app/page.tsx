import type { Metadata } from 'next';
import AtlasLanding from '@/components/atlas-landing';
import LandingIntro from '@/components/landing-intro';

export const metadata: Metadata = { title: 'Anatomy101 | Explore human anatomy' };

export default function Page() {
  return <LandingIntro><AtlasLanding /></LandingIntro>;
}
