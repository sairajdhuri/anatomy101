import { ArrowRight, Search } from 'lucide-react';
import type { SystemId } from '@/atlas/anatomy';
import './atlas-landing.css';

type Destination = 'systems' | 'study' | 'about' | 'search';
const STARTING_SYSTEMS = [
  { id: 'cardiac', name: 'Heart', detail: 'Chambers & valves' },
  { id: 'nervous', name: 'Nervous', detail: 'Brain, spinal cord & nerves' },
  { id: 'respiratory', name: 'Respiratory', detail: 'Lungs & airways' },
  { id: 'skeletal', name: 'Skeletal', detail: 'Bones & support' },
  { id: 'muscular', name: 'Muscular', detail: 'Movement & posture' },
] satisfies { id: SystemId; name: string; detail: string }[];

export default function AtlasLanding({ onOpen, onNavigate }: {
  onOpen: (system?: SystemId) => void;
  onNavigate: (destination: Destination) => void;
}) {
  return <div className="atlas-cover">
    <a className="cover-skip" href="#cover-main">Skip to content</a>
    <header className="cover-header">
      <a className="cover-brand" href="/" aria-label="Anatomy101 home" translate="no">
        <img src="/heart.webp?v=2" width="34" height="46" alt=""/>
        <span>Anatomy<span>101</span></span>
      </a>
      <nav aria-label="Main navigation">
        <button type="button" onClick={() => onNavigate('systems')}>Systems</button>
        <button type="button" onClick={() => onNavigate('study')}>Study tools</button>
        <button type="button" onClick={() => onNavigate('about')}>About</button>
        <button type="button" className="cover-search" onClick={() => onNavigate('search')} aria-label="Search anatomy"><Search size={21} aria-hidden="true"/></button>
      </nav>
    </header>
    <main id="cover-main" tabIndex={-1}>
      <section className="cover-hero" aria-labelledby="cover-title">
        <div className="cover-copy">
          <h1 id="cover-title" translate="no"><span>Anatomy</span><span>101</span></h1>
          <p className="cover-intro">Explore the human body in 3D. Separate its layers, inspect each structure, and turn your next revision session into active recall.</p>
          <div className="cover-actions">
            <button type="button" className="cover-primary" onClick={() => onOpen()}>Start learning <ArrowRight size={20} aria-hidden="true"/></button>
            <button type="button" className="cover-secondary" onClick={() => onNavigate('systems')}>Explore systems <ArrowRight size={18} aria-hidden="true"/></button>
          </div>
          <ul className="cover-facts" aria-label="Atlas features"><li>Free to explore</li><li>Male &amp; female composite models</li><li>Notes, bookmarks &amp; quizzes</li></ul>
        </div>
        <figure className="cover-art">
          <img src="/landing-illustration.webp" width="1254" height="1254" fetchPriority="high" alt=""/>
          <figcaption>Illustrative artwork. Explore the 3D models inside.</figcaption>
        </figure>
      </section>
      <nav className="cover-system-index" aria-label="Anatomy systems">
        {STARTING_SYSTEMS.map(system => <button type="button" key={system.id} onClick={() => onOpen(system.id)} aria-label={`Explore ${system.name.toLowerCase()} system`}>
          <img className="cover-system-art" src={`/system-illustrations/${system.id}.webp`} width="60" height="70" alt=""/>
          <span><strong>{system.name}</strong><small>{system.detail}</small></span>
          <ArrowRight size={20} aria-hidden="true"/>
        </button>)}
      </nav>
      <noscript><p className="cover-noscript">Enable JavaScript to explore the interactive atlas. You can still read the source and model coverage notes below.</p></noscript>
    </main>
    <footer className="cover-footer">
      <p>For educational revision. Model coverage varies.</p>
      <div><a href="/FEMALE-BLAST-MODEL-COVERAGE.md" target="_blank" rel="noreferrer">Female model limitations</a><a href="/ATTRIBUTION.md" target="_blank" rel="noreferrer">Sources &amp; attribution</a></div>
    </footer>
  </div>;
}
