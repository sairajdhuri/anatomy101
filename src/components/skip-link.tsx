'use client';

import type { ReactNode } from 'react';

export default function SkipLink({ target, className, children }: { target: string; className: string; children: ReactNode }) {
  return <a className={className} href={`#${target}`} onClick={event => {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const content = document.getElementById(target);
    if (!content) return;
    event.preventDefault();
    const url = new URL(window.location.href); url.hash = target;
    // Keep router history intact while moving keyboard focus directly to the content.
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    content.focus({ preventScroll: true });
    content.scrollIntoView({ block: 'start', behavior: 'instant' });
  }}>{children}</a>;
}
