'use client';

import { useEffect, useState, type ReactNode } from 'react';
import './landing-intro.css';

export default function LandingIntro({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<'loading' | 'leaving' | 'ready'>('loading');

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setPhase('leaving'), 2400);
    const finishTimer = window.setTimeout(() => setPhase('ready'), 3000);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(finishTimer);
    };
  }, []);

  return <div className="landing-intro" data-phase={phase}>
    {phase !== 'ready' && <div className="landing-intro-screen" role="status" aria-label="Opening your anatomy atlas">
      <img className="landing-intro-heart" src="/heart.webp?v=2" width="100" height="136" alt=""/>
      <p className="landing-intro-name" translate="no">Anatomy101</p>
      <div className="landing-intro-trace" aria-hidden="true"><div className="landing-intro-trace-reveal">
        <svg viewBox="0 0 320 64" fill="none">
          <path d="M0 34H64L75 27L86 34H112L123 44L138 8L151 56L164 27L176 34H211L226 22L241 34H320"/>
        </svg>
      </div></div>
      <p className="landing-intro-caption">Opening your anatomy atlas…</p>
    </div>}
    <div className="landing-intro-content" inert={phase === 'leaving'}>{children}</div>
    <noscript><style>{`.landing-intro[data-phase="loading"]{height:auto;overflow:visible}.landing-intro[data-phase="loading"]>.landing-intro-content{visibility:visible;opacity:1}.landing-intro-screen{display:none}`}</style></noscript>
  </div>;
}
