'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Bookmark, BookOpen, Check, ChevronRight, CircleHelp,
  Eye, EyeOff, Focus, Layers3, Maximize2, Menu, Minimize2, Pause, RotateCcw, RotateCw, Search, X } from 'lucide-react';
import { DEFAULT_VISIBLE, SYSTEMS, explanation, type Atlas, type Concept, type SceneState,
  type SystemId, type View } from '@/atlas/anatomy';
import { createQuiz, loadAtlas, searchConcepts, type Quiz } from '@/atlas/catalogue';
import { getStudyNote, STUDY_NOTES } from '@/atlas/study-notes';
import SkipLink from './skip-link';
import './atlas-workspace.css';

const AnatomyScene = dynamic(() => import('@/atlas/scene'), { ssr: false });
const ORGANS: SystemId[] = ['breast', 'cardiac', 'respiratory', 'digestive', 'urinary', 'endocrine', 'reproductive', 'lymphatic'];
const INITIAL: SceneState = {
  explode: 0, visible: ['skeletal', 'cardiac', 'respiratory', 'digestive', 'urinary'],
  selected: [], isolate: false, view: 'three-quarter', rotate: false, reset: 0,
};
const COMMON = ['heart', 'brain', 'liver', 'right lung', 'left kidney', 'stomach', 'pancreas', 'diaphragm'];
const STORAGE_KEY = 'human-atlas-study-v1';

function updateURL(changes: Record<string, string | null>) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) url.searchParams.delete(key); else url.searchParams.set(key, value);
  }
  const href = url.pathname + url.search + url.hash;
  if (href !== location.pathname + location.search + location.hash) window.history.replaceState(null, '', href);
}

export default function AtlasStudio() {
  const params = useSearchParams();
  const sex = params.get('body') === 'female' ? 'female' : 'male';
  const mode = params.get('mode') === 'revise' ? 'revise' : 'explore';
  const panel = params.get('panel');
  const query = params.get('q') || '';
  const tab = panel === 'structures' || panel === 'saved' ? panel : panel === 'systems' ? 'systems' : query ? 'structures' : 'systems';
  const about = params.get('about') === '1';
  const layers = params.get('systems');
  const visibleFromURL = useMemo<SystemId[]>(() => {
    const defaults: SystemId[] = sex === 'female' ? [...INITIAL.visible, 'breast', 'reproductive'] : INITIAL.visible;
    if (layers === null) return defaults;
    if (layers === '') return [];
    const valid = layers.split(',').filter((id): id is SystemId => SYSTEMS.some(system => system.id === id));
    return valid.length ? [...new Set(valid)] : defaults;
  }, [layers, sex]);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const coverageDialog = useRef<HTMLDialogElement>(null);
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [scene, setScene] = useState<SceneState>(() => ({ ...INITIAL, visible: visibleFromURL }));
  const [progress, setProgress] = useState(0);
  const [loadInfo, setLoadInfo] = useState({ loaded: 0, total: 0, bytes: 0 });
  const [focusMode, setFocusMode] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [remote, setRemote] = useState(false);
  const [chosen, setChosen] = useState<Concept | null>(null);
  const [mobilePanel, setMobilePanel] = useState(!!panel || !!query);
  const [saved, setSaved] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [detailTab, setDetailTab] = useState<'overview' | 'notes'>('overview');
  const search = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const inspector = useRef<HTMLElement>(null);

  function setTab(value: 'systems' | 'structures' | 'saved') { updateURL({ panel: value }); }
  function setQuery(value: string) { updateURL({ q: value || null }); }
  function setAbout(value: boolean) { updateURL({ about: value ? '1' : null }); }

  const focusSearch = useCallback(() => {
    setFocusMode(false); setMobilePanel(true); updateURL({ panel: 'structures' });
    requestAnimationFrame(() => search.current?.focus());
  }, []);

  useEffect(() => {
    setChosen(null); setQuiz(null); setAnswer(null); setScore({ correct: 0, total: 0 });
    setFocusMode(false); setCoverageOpen(sex === 'female');
  }, [sex]);

  useEffect(() => {
    setChosen(null); setQuiz(null); setAnswer(null);
    setScene(current => current.visible.join(',') === visibleFromURL.join(',') ? current
      : { ...current, visible: visibleFromURL, selected: [], isolate: false, rotate: false });
  }, [visibleFromURL]);

  useEffect(() => {
    if (!mobilePanel || tab !== 'structures' || about || coverageOpen) return;
    const frame = requestAnimationFrame(() => search.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [mobilePanel, tab, about, coverageOpen]);

  useEffect(() => {
    const compact = matchMedia('(max-width: 1000px)');
    const restorePanels = () => { if (compact.matches) setFocusMode(false); };
    compact.addEventListener('change', restorePanels);
    return () => compact.removeEventListener('change', restorePanels);
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    void import('@/atlas/scene').catch(() => {});
    setProgress(0); setLoadInfo({ loaded: 0, total: 0, bytes: 0 }); setError(''); setAtlas(null);
    loadAtlas(abort.signal, sex).then(result => {
      if (!abort.signal.aborted) { setAtlas(result.atlas); setRemote(result.remote); }
    }).catch(error => {
      if (!abort.signal.aborted) setError(error instanceof Error ? error.message : 'Could not load the anatomy.');
    });
    return () => abort.abort();
  }, [attempt, sex]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (Array.isArray(stored.saved)) setSaved(stored.saved.filter((id: unknown) => typeof id === 'string'));
      if (stored.notes && typeof stored.notes === 'object' && !Array.isArray(stored.notes)) {
        setNotes(Object.fromEntries(Object.entries(stored.notes).filter(([, value]) => typeof value === 'string')) as Record<string, string>);
      }
      setStorageReady(true);
    } catch { setStorageError('Saved study data could not be read. New notes will stay in this session.'); }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ saved, notes })); }
    catch { setStorageError('Changes could not be saved. Browser storage may be full or disabled.'); }
  }, [saved, notes, storageReady]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || dialog.current?.open || coverageDialog.current?.open) return;
      if (event.key === '/' && !(event.target instanceof HTMLInputElement)
        && !(event.target instanceof HTMLTextAreaElement) && !(event.target instanceof HTMLSelectElement) && !(event.target as HTMLElement)?.isContentEditable) {
        event.preventDefault(); focusSearch();
      }
      if (event.key === 'Escape') { setMobilePanel(false); setFocusMode(false); }
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [focusSearch]);

  useEffect(() => {
    if (about) dialog.current?.showModal(); else dialog.current?.close();
  }, [about]);

  useEffect(() => {
    if (coverageOpen) coverageDialog.current?.showModal(); else coverageDialog.current?.close();
  }, [coverageOpen]);

  function switchBody(next: 'male' | 'female') {
    if (next === sex) return;
    setAtlas(null); setProgress(0); setLoadInfo({ loaded: 0, total: 0, bytes: 0 }); setError('');
    updateURL({ body: next === 'female' ? 'female' : null, mode: null, systems: null, q: null });
    setScene({ ...INITIAL, visible: next === 'female' ? [...INITIAL.visible, 'breast', 'reproductive'] : INITIAL.visible });
  }

  const parts = useMemo(() => new Map(atlas?.parts.map(part => [part.id, part])), [atlas]);
  const counts = useMemo(() => Object.fromEntries(SYSTEMS.map(system =>
    [system.id, atlas?.parts.filter(part => part.system === system.id).length || 0])), [atlas]);
  const results = useMemo(() => searchConcepts(atlas?.concepts || [], query), [atlas, query]);
  const bookmarks = useMemo(() => saved.map(id => atlas?.concepts.find(concept => concept.id === id)
    || (atlas?.parts.find(part => part.conceptId === id)
      ? { id, name: atlas.parts.find(part => part.conceptId === id)!.name,
        elements: [atlas.parts.find(part => part.conceptId === id)!.id] } : null))
    .filter((concept): concept is Concept => !!concept), [atlas, saved]);
  const selectedParts = scene.selected.map(id => parts.get(id)).filter(part => !!part);
  const selected = selectedParts[0];
  const system = SYSTEMS.find(system => system.id === selected?.system);
  const note = chosen ? getStudyNote(chosen.name) : undefined;
  const visibleCount = atlas?.parts.filter(part => scene.isolate ? scene.selected.includes(part.id)
    : scene.visible.includes(part.system) || scene.selected.includes(part.id)).length || 0;
  const ready = !!atlas && progress === 100 && !error;
  const quizPoolSize = useMemo(() => new Set(atlas?.parts.filter(part => scene.visible.includes(part.system))
    .map(part => part.name)).size, [atlas, scene.visible]);
  const reveal = mode !== 'revise' || !quiz || answer !== null;
  const shortList = query ? results.slice(0, 60) : COMMON.map(name => atlas?.concepts
    .find(concept => concept.name.toLowerCase() === name)).filter((concept): concept is Concept => !!concept);

  function choose(concept: Concept) {
    setFocusMode(false);
    setChosen(concept); setDetailTab('overview'); setMobilePanel(false);
    setScene(current => ({ ...current, selected: concept.elements, isolate: false, rotate: false }));
  }

  function choosePart(id: string) {
    if (!reveal && quiz) return;
    const part = parts.get(id);
    if (part) choose({ id: part.conceptId, name: part.name, elements: [id] });
  }

  function reset() {
    setChosen(null); setQuiz(null); setAnswer(null); updateURL({ mode: null, systems: null });
    setScene(current => ({ ...INITIAL, visible: sex === 'female' ? [...INITIAL.visible, 'breast', 'reproductive'] : INITIAL.visible, reset: current.reset + 1 }));
  }

  function preset(visible: SystemId[]) {
    setChosen(null); setQuiz(null); setAnswer(null);
    updateURL({ systems: visible.join(',') });
    setScene(current => ({ ...current, visible, selected: [], isolate: false }));
  }

  function startQuiz() {
    if (!atlas || !ready) return;
    const next = createQuiz(atlas.parts, scene.visible, quiz?.answer.id);
    if (!next) { setQuiz(null); return; }
    setQuiz(next); setAnswer(null); setChosen({ id: next.answer.conceptId, name: next.answer.name, elements: [next.answer.id] });
    setScene(current => ({ ...current, selected: [next.answer.id], isolate: true, explode: 0, rotate: false, reset: current.reset + 1 }));
  }

  function submitAnswer(value: string) {
    if (!quiz || answer !== null) return;
    setAnswer(value);
    setScore(current => ({ correct: current.correct + Number(value === quiz.answer.name), total: current.total + 1 }));
  }

  function changeMode(next: 'explore' | 'revise') {
    setFocusMode(false); setMobilePanel(false);
    updateURL({ mode: next === 'revise' ? 'revise' : null }); setQuiz(null); setAnswer(null); setChosen(null);
    setScene(current => ({ ...current, selected: [], isolate: false, rotate: false }));
  }

  return <main className={`studio${focusMode ? ' studio-focus' : ''}`} data-ui="">
    <SkipLink className="skip-link" target="viewer">Skip to anatomy viewer</SkipLink>
    <header className="app-header">
      <Link prefetch={false} className="brand" href="/" aria-label="Anatomy101 home"><img className="studio-heart" src="/heart-100.webp" srcSet="/heart.webp 732w" sizes="35px" alt="" decoding="async"/><span>Anatomy<span className="brand-light">101</span><small>INTERACTIVE ATLAS</small></span></Link>
      <nav className="workspace-tabs" aria-label="Study mode">
        <button className={mode === 'explore' ? 'active' : ''} onClick={() => changeMode('explore')} aria-pressed={mode === 'explore'}><Layers3 size={16}/>Explore</button>
        <button className={mode === 'revise' ? 'active' : ''} onClick={() => changeMode('revise')} aria-pressed={mode === 'revise'}><BookOpen size={16}/>Revise</button>
      </nav>
      <div className="header-right"><button className="focus-toggle" aria-pressed={focusMode} onClick={() => setFocusMode(current => !current)}>{focusMode ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}<span>{focusMode ? 'Exit focus' : 'Focus view'}</span></button><button className="icon-button" onClick={() => setAbout(true)} aria-label="Atlas information"><CircleHelp size={20}/></button></div>
    </header>

    <div className="workspace">
      {mobilePanel && <button className="sidebar-backdrop" onClick={() => setMobilePanel(false)} aria-label="Close anatomy library"/>}
      <aside className={`library ${mobilePanel ? 'mobile-open' : ''}`} aria-label="Anatomy library" inert={focusMode} aria-hidden={focusMode}>
        <div className="library-intro"><div><span className="section-label">YOUR REFERENCE</span><h1>Anatomy library</h1></div><button className="icon-button mobile-only" onClick={() => setMobilePanel(false)} aria-label="Close library"><X size={18}/></button></div>
        <label className="search-field"><Search size={16}/><input ref={search} value={query} onChange={event => { setQuery(event.target.value); setTab('structures'); }} placeholder="Find a structure…" aria-label="Search anatomy"/><kbd>/</kbd></label>
        <div className="library-tabs" role="tablist" aria-label="Library sections">
          {(['systems', 'structures', 'saved'] as const).map(value => <button key={value} role="tab" aria-selected={tab === value} aria-controls="library-content" id={`tab-${value}`} onClick={() => setTab(value)}>{value === 'saved' ? <><Bookmark size={13}/>Saved{saved.length > 0 && <span>{saved.length}</span>}</> : value === 'systems' ? 'Systems' : 'Structures'}</button>)}
        </div>
        <div className="library-content" id="library-content" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === 'systems' && <>
            <div className="presets" aria-label="Layer presets"><button onClick={() => preset(DEFAULT_VISIBLE)}>{sex === 'female' ? 'All anatomy' : 'Full body'}</button><button onClick={() => preset(['skeletal'])}>Skeleton</button><button onClick={() => preset(ORGANS)}>Organs</button></div>
            <div className="list-heading"><span>ANATOMICAL SYSTEMS</span><button onClick={() => preset([])}>Hide all</button></div>
            <div className="system-list">{SYSTEMS.filter(item => sex === 'female' || item.id !== 'breast').map(item => <div className={`system-row ${scene.visible.includes(item.id) ? 'enabled' : ''}`} key={item.id}>
              <button className="system-name" onClick={() => preset([item.id])} title={`Show only ${item.name.toLowerCase()}`}><span className="system-dot" style={{ background: item.color }}/><span>{item.name}</span><small>{atlas ? counts[item.id].toLocaleString() : '—'}</small></button>
              <button className="visibility-switch" aria-label={`${scene.visible.includes(item.id) ? 'Hide' : 'Show'} ${item.name.toLowerCase()}`} aria-pressed={scene.visible.includes(item.id)} onClick={() => preset(scene.visible.includes(item.id)
                ? scene.visible.filter(id => id !== item.id) : [...scene.visible, item.id])}>{scene.visible.includes(item.id) ? <Eye size={15}/> : <EyeOff size={15}/>}</button>
            </div>)}</div>
            <p className="library-hint">Select a name to focus on one system. Use the eye to combine layers.<span>Extra layers load when you need them.</span></p>
          </>}
          {tab === 'structures' && <>
            <div className="list-heading"><span>{query ? `${results.length.toLocaleString()} MATCHES` : 'START EXPLORING'}</span>{query && <button onClick={() => setQuery('')}>Clear</button>}</div>
            <div className="structure-list">{shortList.map(concept => <button key={concept.id} onClick={() => { if (mode === 'revise') changeMode('explore'); choose(concept); }}><span>{concept.name}<small>{concept.elements.length} {concept.elements.length === 1 ? 'piece' : 'pieces'} · {concept.id}</small></span><ChevronRight size={15}/></button>)}</div>
            {query && !results.length && <p className="empty-copy">{atlas ? 'No structures found. Try a shorter name or source identifier.' : 'The catalogue is still loading.'}</p>}
            {query && results.length > 60 && <p className="library-hint">Showing 60 matches. Refine your search for smaller structures.</p>}
          </>}
          {tab === 'saved' && <>
            <div className="list-heading"><span>YOUR REVISION LIST</span><span>{bookmarks.length} structures</span></div>
            <div className="structure-list">{bookmarks.map(concept => <button key={concept.id} onClick={() => { changeMode('explore'); choose(concept); }}><Bookmark size={15}/><span>{concept.name}<small>{concept.id}</small></span><ChevronRight size={15}/></button>)}</div>
            {!bookmarks.length && <div className="library-empty"><Bookmark size={25}/><h3>Keep the important parts.</h3><p>Select a structure and save it to your revision list.</p></div>}
          </>}
        </div>
        <div className="library-footer"><span className="tiny-status"/><span>{atlas ? `${atlas.parts.length.toLocaleString()} modeled structures` : 'Loading anatomy catalogue'}</span><ArrowUpRight size={13}/></div>
      </aside>

      <section className="viewer-panel" aria-label="Interactive anatomy">
        <div className="viewer-toolbar"><div><button className="icon-button mobile-only" onClick={() => setMobilePanel(true)} aria-label="Open anatomy library"><Menu size={18}/></button><span className="viewer-title">{scene.isolate ? 'Structure view' : scene.explode > .8 ? 'Anatomical inventory' : 'Anatomy in 3D'}</span><span className="toolbar-divider"/><select className="body-select" aria-label="Reference body" value={sex} onChange={event => switchBody(event.target.value as 'male' | 'female')}><option value="male">Adult male</option><option value="female">Female composite</option></select></div><span className="mesh-count"><i/>{visibleCount.toLocaleString()} visible</span></div>
        {sex === 'female' && <div className="coverage-banner" role="status"><span>Composite illustration: adapted anatomy and schematic structures.</span><button onClick={() => setCoverageOpen(true)}>View limitations</button></div>}
        <div className="viewport" id="viewer" ref={viewport} tabIndex={-1}>
          {atlas && <AnatomyScene atlas={atlas} state={{ ...scene, hideLabels: !reveal }} onSelect={choosePart} onProgress={(value: number, info: typeof loadInfo) => { setProgress(value); setLoadInfo(info); }} onError={(message: string) => setError(message)}/>}
          <div className="stage-caption" aria-hidden="true"><span>ANATOMY / {sex === 'female' ? '02' : '01'}</span><strong>{scene.isolate && chosen && reveal ? chosen.name : scene.explode > .8 ? 'A different perspective.' : 'Beneath the surface.'}</strong></div>
          <div className="orientation" aria-hidden="true"><span>S</span><span>L</span><i/><span>R</span><span>I</span></div>
          <div className="camera-controls" aria-label="Camera controls">
            {(['three-quarter', 'front', 'side', 'back'] as View[]).map((view, index) => <button key={view} className={scene.view === view ? 'active' : ''} disabled={scene.explode > .8 && view !== 'front'} aria-pressed={scene.view === view} aria-label={`${view} view`} title={`${view} view`} onClick={() => setScene(current => ({ ...current, view, rotate: false, reset: current.reset + 1 }))}>{['¾', 'F', 'S', 'B'][index]}</button>)}
            <span/>
            <button disabled={scene.explode >= .4 || scene.isolate} onClick={() => setScene(current => ({ ...current, rotate: !current.rotate }))} aria-label={scene.rotate ? 'Pause rotation' : 'Auto rotate'} title="Auto rotate">{scene.rotate ? <Pause size={16}/> : <RotateCw size={16}/>}</button>
            <button onClick={() => setScene(current => ({ ...current, reset: current.reset + 1 }))} aria-label="Fit model to view" title="Fit model"><Maximize2 size={15}/></button>
          </div>
          {!error && progress < 100 && <div className={`loading-state${loadInfo.loaded ? ' is-streaming' : ''}`} role="status"><div className="loading-orbit" aria-hidden="true"><Focus size={28}/></div><h2>{loadInfo.loaded ? 'Adding your layers' : atlas ? 'Bringing anatomy into view' : 'Opening your atlas'}</h2><p>{atlas ? <><strong>{progress}%</strong> · {loadInfo.loaded ? 'You can already rotate and explore.' : 'Loading your visible systems first.'}</> : 'Loading the anatomy catalogue'}</p><div className="loading-track" role="progressbar" aria-label="Anatomy layers" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }}/></div><small>{loadInfo.bytes ? `${(loadInfo.bytes / 1_000_000).toFixed(1)} MB for these layers. Other systems load on demand.` : 'Complete anatomical detail, one layer at a time.'}</small></div>}
          {error && <div className="loading-state error-state" role="alert"><CircleHelp size={28}/><h2>Anatomy unavailable</h2><p>{error}</p><small>Check your connection and try again. Your saved structures and notes are kept in this browser.</small><button className="primary-button" onClick={() => { reset(); setAttempt(current => current + 1); }}>Retry download<RotateCcw size={15}/></button></div>}
          {ready && !visibleCount && <div className="loading-state"><Layers3 size={28}/><h2>No layers visible</h2><p>Select a system from the anatomy library.</p><button className="primary-button" onClick={() => preset(DEFAULT_VISIBLE)}>Show anatomy<ArrowRight size={16}/></button></div>}
          {chosen && reveal && <button className="selection-peek" onClick={() => inspector.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })}><span><small>SELECTED STRUCTURE</small>{chosen.name}</span><span>View details <ArrowRight size={15}/></span></button>}
        </div>
        <div className="explode-dock">
          <div className="explode-heading"><Layers3 size={18}/><div><label htmlFor="explode">Separate anatomy</label><span>See how the pieces fit together</span></div></div>
          <div className="explode-slider"><div className="explode-presets">{([['Assembled', 0], ['Layers', .45], ['Inventory', 1]] as const).map(([name, value]) => <button key={name} aria-pressed={Math.abs(scene.explode - value) < .01} disabled={!!quiz && answer === null} onClick={() => setScene(current => ({ ...current, explode: value, rotate: false, isolate: false, view: value > .8 ? 'front' : current.view }))}>{name}</button>)}<output htmlFor="explode">{Math.round(scene.explode * 100)}%</output></div><input id="explode" type="range" min="0" max="100" step="1" value={scene.explode * 100} disabled={!!quiz && answer === null} onChange={event => { const amount = Number(event.target.value) / 100; setScene(current => ({ ...current, explode: amount, rotate: false, isolate: false, view: amount > .8 ? 'front' : current.view })); }}/></div>
          <button className="reset-button" onClick={reset}><RotateCcw size={16}/><span>Reset</span></button>
        </div>
        <div className="viewer-footer"><span>Drag to {scene.explode > .8 ? 'pan' : 'rotate'}<b>·</b>Scroll to zoom<b>·</b>Click to inspect</span><span>Keyboard: ← → / + −</span></div>
      </section>

      <aside className="inspector" aria-label="Structure information" ref={inspector} inert={focusMode} aria-hidden={focusMode}>
        <div className="inspector-heading"><span className="section-label">{mode === 'revise' ? 'ACTIVE RECALL' : 'STRUCTURE INSPECTOR'}</span><span className="inspector-number">{mode === 'revise' ? '02' : '01'}</span></div>
        {mode === 'revise' && <div className="revision-panel">
          <div className="revision-score"><BookOpen size={18}/><span>Identification practice</span><strong>{score.correct}/{score.total}</strong></div>
          {!quiz ? <><h2>Know it when you see it.</h2><p>Identify isolated structures from your visible systems. Answers stay hidden until you choose.</p><button className="primary-button" disabled={!ready || quizPoolSize < 2} onClick={startQuiz}>Start practice<ArrowRight size={17}/></button>{quizPoolSize < 2 && ready && <p className="muted">Show systems with at least two distinct named structures.</p>}</> : <>
            <span className="question-label">QUESTION {score.total + (answer === null ? 1 : 0)}</span><h2>Which structure is this?</h2><p>Rotate the isolated model. Select its anatomical name.</p>
            <div className="quiz-choices">{quiz.choices.map((choice, index) => <button key={choice} disabled={answer !== null} className={answer !== null ? choice === quiz.answer.name ? 'correct' : choice === answer ? 'incorrect' : '' : ''} onClick={() => submitAnswer(choice)}><span>{index + 1}</span>{choice}{answer !== null && choice === quiz.answer.name && <Check size={16}/>}</button>)}</div>
            {answer !== null && <div className={`quiz-feedback ${answer === quiz.answer.name ? 'success' : ''}`} role="status"><strong>{answer === quiz.answer.name ? 'Correct.' : 'Keep this one for revision.'}</strong><p>{quiz.answer.name}</p><button className="primary-button" onClick={startQuiz}>Next structure<ArrowRight size={16}/></button></div>}
          </>}
        </div>}
        {chosen && reveal && selected ? <div className="detail-content">
          <div className="structure-system"><i style={{ background: system?.color }}/>{system?.name}</div>
          <div className="structure-heading"><h2>{chosen.name}</h2><button className={`icon-button bookmark-button ${saved.includes(chosen.id) ? 'saved' : ''}`} aria-label={saved.includes(chosen.id) ? 'Remove bookmark' : 'Save structure'} aria-pressed={saved.includes(chosen.id)} onClick={() => setSaved(current => current.includes(chosen.id) ? current.filter(id => id !== chosen.id) : [...current, chosen.id])}><Bookmark size={20} fill={saved.includes(chosen.id) ? 'currentColor' : 'none'}/></button></div>
          {sex === 'female' && <p className="provenance-note">{(['adapted', 'female-reference', 'schematic'] as const).filter(kind => selectedParts.some(part => part.provenance === kind)).map(kind => ({ adapted: 'Adapted male reference', 'female-reference': 'Fitted female reference', schematic: 'Schematic ? approximate teaching geometry' }[kind])).join(' ? ')}. <a href="/FEMALE-BLAST-ATTRIBUTION.md" target="_blank" rel="noreferrer">Sources and modifications</a></p>}
          <div className="structure-metadata"><span>{chosen.id}</span><span>{selectedParts.length} {selectedParts.length === 1 ? 'mesh' : 'meshes'}</span></div>
          <div className="detail-tabs" role="tablist" aria-label="Structure details"><button role="tab" aria-selected={detailTab === 'overview'} onClick={() => setDetailTab('overview')}>Overview</button><button role="tab" aria-selected={detailTab === 'notes'} onClick={() => setDetailTab('notes')}>My notes{notes[chosen.id] && <i/>}</button></div>
          {detailTab === 'overview' ? <>
            <p className="structure-description">{note?.function || explanation(chosen.name, selected.system)}</p>
            {note ? <div className="anatomy-facts"><div><h3>Location & relations</h3><p>{note.location}</p></div><div><h3>Blood supply</h3><p>{note.supply}</p></div><div><h3>Innervation</h3><p>{note.innervation}</p></div><div className="recall-note"><BookOpen size={17}/><div><h3>Revision checkpoint</h3><p>{note.recall}</p></div></div><a className="reference-link" href={note.url} target="_blank" rel="noreferrer">{note.reference}<ArrowUpRight size={14}/></a></div> : <div className="context-note"><BookOpen size={16}/><p>System context shown. Detailed notes have not been authored for this structure.<a href={`https://www.ncbi.nlm.nih.gov/books/?term=${encodeURIComponent(chosen.name + ' anatomy')}`} target="_blank" rel="noreferrer">Find anatomical references<ArrowUpRight size={13}/></a></p></div>}
            {selectedParts.length > 1 && <details className="mesh-members"><summary>Included structures <span>{selectedParts.length}</span></summary><div>{selectedParts.slice(0, 60).map(part => <button key={part.id} onClick={() => choosePart(part.id)}>{part.name}<ChevronRight size={13}/></button>)}{selectedParts.length > 60 && <small>{selectedParts.length - 60} more meshes. Search a smaller structure to inspect them.</small>}</div></details>}
          </> : <div className="personal-notes"><label htmlFor="study-note">Your revision notes</label><textarea id="study-note" placeholder="Add landmarks, relations, or a recall prompt…" value={notes[chosen.id] || ''} onChange={event => setNotes(current => ({ ...current, [chosen.id]: event.target.value }))}/><p>{storageError || 'Saved on this browser. Keep personal study notes here.'}</p></div>}
          <div className="detail-actions"><button className="primary-button" onClick={() => setScene(current => ({ ...current, isolate: !current.isolate, explode: 0, rotate: false }))}><Focus size={17}/>{scene.isolate ? 'Show surrounding anatomy' : 'Isolate structure'}<ArrowRight size={16}/></button><button className="text-button" onClick={() => { setChosen(null); setScene(current => ({ ...current, selected: [], isolate: false })); }}>Clear selection</button></div>
        </div> : mode === 'explore' && <div className="inspector-empty"><div className="empty-icon"><Focus size={30} strokeWidth={1.2}/></div><h2>Every part has a story.</h2><p>Select a structure on the model, or find one in the library.</p><div className="interaction-guide"><span><span>01</span>Click to inspect</span><span><span>02</span>Isolate for a closer look</span><span><span>03</span>Save, study, and revise</span></div><button className="outline-button" onClick={focusSearch}><Search size={16}/>Find a structure<ArrowRight size={15}/></button></div>}
        {mode === 'explore' && !chosen && <div className="study-start"><span className="section-label">A GOOD PLACE TO START</span><div>{STUDY_NOTES.slice(0, 4).map(item => <button key={item.title} disabled={!atlas} onClick={() => { const concept = atlas?.concepts.find(concept => item.names.includes(concept.name.toLowerCase())); if (concept) choose(concept); }}><span>{item.title}</span><ChevronRight size={14}/></button>)}</div></div>}
        <div className="inspector-footer"><span>Reference anatomy. Individual variation applies.</span><button onClick={() => setAbout(true)}>About this atlas<ArrowUpRight size={12}/></button><small className="creator-credit"><span>Designed &amp;</span>{' '}<span>developed by</span>{' '}<span>Sai for J</span></small></div>
      </aside>
    </div>
    {storageError && <div className="storage-notice" role="status">{storageError}<button className="icon-button" onClick={() => setStorageError('')} aria-label="Dismiss storage message"><X size={14}/></button></div>}
    <dialog ref={coverageDialog} className="about-dialog coverage-dialog" aria-labelledby="female-coverage-title" onCancel={() => setCoverageOpen(false)} onClose={() => setCoverageOpen(false)}>
      <h2 id="female-coverage-title">Female model: composite illustration</h2>
      <p>This model from Female Anatomy Blast combines 2,195 reshaped male-reference meshes, 76 fitted female-reference meshes, and 82 authored schematic pieces. It is not a scan of a woman or a clinically validated female atlas.</p>
      <ul><li>Body shape, muscle attachments, sex-specific skeletal features, and alignment between sources need specialist review.</li><li>Some genital structures, pelvic nerves and vessels, and other small structures are approximate teaching schematics, labeled in the inspector.</li><li>A complete skin envelope, fine neurovascular branches, complete lymphatic drainage, microscopic anatomy, and physiological variation are not represented.</li></ul>
      <p>Use this illustration alongside established anatomy references for revision. Visual detail does not establish anatomical accuracy. Do not use it for diagnosis, surgical planning, or anatomical measurements.</p>
      <a className="reference-link" href="https://github.com/ThaddeusMercy/female-anatomy-blast" target="_blank" rel="noreferrer">Female Anatomy Blast source<ArrowUpRight size={15}/></a>
      <button className="primary-button" onClick={() => setCoverageOpen(false)}>Continue to female atlas</button>
    </dialog>
    <dialog ref={dialog} className="about-dialog" onCancel={() => setAbout(false)} onClose={() => setAbout(false)}>
      <div className="dialog-header"><span className="section-label">ABOUT THIS ATLAS</span><button className="icon-button" onClick={() => setAbout(false)} aria-label="Close atlas information"><X size={20}/></button></div>
      <h2>Human anatomy, made explorable.</h2><p>Explore anatomical structures, review system relationships, and practice identification.</p>
      <div className="source-stats"><span><strong>{atlas?.parts.length.toLocaleString() || '0'}</strong>individual meshes</span><span><strong>{atlas?.concepts.length.toLocaleString() || '0'}</strong>named concepts</span></div>
      <h3>Study content</h3><p>Organ notes are brief educational summaries with linked references. Structures without authored notes show system context. This app is for learning and revision, not diagnosis or surgical planning.</p>
      <p className="muted">Geometry: {remote ? 'online model files' : 'local model files'}. Bookmarks and notes stay in this browser.</p>
      <p>{sex === 'female' ? 'Female composite: Mercy Thaddeus / Female Anatomy Blast, adapted BodyParts3D and HRA geometry plus authored schematics, CC BY 4.0. Not clinically validated.' : 'Male geometry: BodyParts3D, Database Center for Life Science, CC BY 4.0.'}</p>
      <a className="reference-link" href={sex === 'female' ? 'https://github.com/ThaddeusMercy/female-anatomy-blast' : 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html'} target="_blank" rel="noreferrer">Original anatomy dataset<ArrowUpRight size={15}/></a>
    </dialog>
  </main>;
}
