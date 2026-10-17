import { ArrowRight, Search } from 'lucide-react';
import Link from 'next/link';
import SkipLink from './skip-link';
import type { SystemId } from '@/atlas/anatomy';
import './atlas-landing.css';

const STARTING_SYSTEMS = [
  { id: 'cardiac', name: 'Heart', detail: 'Chambers & valves' },
  { id: 'nervous', name: 'Nervous', detail: 'Brain, spinal cord & nerves' },
  { id: 'respiratory', name: 'Respiratory', detail: 'Lungs & airways' },
  { id: 'skeletal', name: 'Skeletal', detail: 'Bones & support' },
  { id: 'muscular', name: 'Muscular', detail: 'Movement & posture' },
] satisfies { id: SystemId; name: string; detail: string }[];

export default function AtlasLanding() {
  return <div className="atlas-cover">
    <SkipLink className="cover-skip" target="cover-main">Skip to content</SkipLink>
    <header className="cover-header">
      <a className="cover-brand" href="/" aria-label="Anatomy101 home" translate="no">
        <img src="/heart.webp?v=2" width="34" height="46" alt=""/>
        <span>Anatomy<span>101</span></span>
      </a>
      <nav aria-label="Main navigation">
        <Link prefetch={false} href="/atlas/?panel=systems">Systems</Link>
        <Link prefetch={false} href="/atlas/?mode=revise">Study tools</Link>
        <Link prefetch={false} href="/atlas/?about=1">About</Link>
        <Link prefetch={false} href="/atlas/?panel=structures" className="cover-search" aria-label="Search anatomy"><Search size={21} aria-hidden="true"/></Link>
      </nav>
    </header>
    <main id="cover-main" tabIndex={-1}>
      <section className="cover-hero" aria-labelledby="cover-title">
        <div className="cover-copy">
          <h1 id="cover-title" translate="no"><span>Anatomy</span><span>101</span></h1>
          <p className="cover-intro">Explore the human body in 3D. Separate its layers, inspect each structure, and turn your next revision session into active recall.</p>
          <div className="cover-actions">
            <Link prefetch={false} className="cover-primary" href="/atlas/">Start learning <ArrowRight size={20} aria-hidden="true"/></Link>
            <Link prefetch={false} className="cover-secondary" href="/atlas/?panel=systems">Explore systems <ArrowRight size={18} aria-hidden="true"/></Link>
          </div>
          <ul className="cover-facts" aria-label="Atlas features"><li>Free to explore</li><li>Male &amp; female composite models</li><li>Notes, bookmarks &amp; quizzes</li></ul>
        </div>
        <figure className="cover-art">
          <img src="/landing-illustration.webp" width="1254" height="1254" fetchPriority="high" alt=""/>
        </figure>
      </section>
      <nav className="cover-system-index" aria-label="Anatomy systems">
        {STARTING_SYSTEMS.map(system => <Link prefetch={false} key={system.id} href={`/atlas/?systems=${system.id}`} aria-label={`Explore ${system.name.toLowerCase()} system`}>
          <img className="cover-system-art" src={`/system-illustrations/${system.id}.webp`} width="60" height="70" alt=""/>
          <span><strong>{system.name}</strong><small>{system.detail}</small></span>
          <ArrowRight size={20} aria-hidden="true"/>
        </Link>)}
      </nav>
      <noscript><p className="cover-noscript">Enable JavaScript to explore the interactive atlas.</p></noscript>
    </main>
    <footer className="cover-footer">
      <p className="creator-credit">Designed &amp; developed by Sai for J</p>
    </footer>
  </div>;
}
