'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, ArrowUpRight, Bookmark, BookOpen, Check, ChevronRight, CircleHelp,
  Eye, EyeOff, Focus, Layers3, Maximize2, Menu, Pause, RotateCcw, RotateCw, Search, X } from 'lucide-react';
import { DEFAULT_VISIBLE, SYSTEMS, explanation, type Atlas, type Concept, type SceneState,
  type SystemId, type View } from '@/atlas/anatomy';
import { createQuiz, loadAtlas, searchConcepts, type Quiz } from '@/atlas/catalogue';
import { getStudyNote, STUDY_NOTES } from '@/atlas/study-notes';

const AnatomyScene = dynamic(() => import('@/atlas/scene'), { ssr: false });
const ORGANS: SystemId[] = ['cardiac', 'respiratory', 'digestive', 'urinary', 'endocrine', 'reproductive', 'lymphatic'];
const INITIAL: SceneState = {
  explode: 0, visible: ['skeletal', 'cardiac', 'respiratory', 'digestive', 'urinary', 'nervous', 'arterial', 'venous'],
  selected: [], isolate: false, view: 'three-quarter', rotate: false, reset: 0,
};
const COMMON = ['heart', 'brain', 'liver', 'right lung', 'left kidney', 'stomach', 'pancreas', 'diaphragm'];
const STORAGE_KEY = 'human-atlas-study-v1';

export default function AtlasStudio() {
  const [started, setStarted] = useState(false);
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [scene, setScene] = useState<SceneState>(INITIAL);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [remote, setRemote] = useState(false);
  const [chosen, setChosen] = useState<Concept | null>(null);
  const [tab, setTab] = useState<'systems' | 'structures' | 'saved'>('systems');
  const [query, setQuery] = useState('');
  const [mobilePanel, setMobilePanel] = useState(false);
  const [about, setAbout] = useState(false);
  const [mode, setMode] = useState<'explore' | 'revise'>('explore');
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

  useEffect(() => {
    if (!started) return;
    const abort = new AbortController();
    setProgress(0); setError(''); setAtlas(null);
    loadAtlas(abort.signal).then(result => {
      if (!abort.signal.aborted) { setAtlas(result.atlas); setRemote(result.remote); }
    }).catch(error => {
      if (!abort.signal.aborted) setError(error instanceof Error ? error.message : 'Could not load the anatomy.');
    });
    return () => abort.abort();
  }, [attempt, started]);

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
      if (event.key === '/' && !(event.target instanceof HTMLInputElement)
        && !(event.target instanceof HTMLTextAreaElement) && !(event.target as HTMLElement)?.isContentEditable) {
        event.preventDefault(); setMobilePanel(true); search.current?.focus();
      }
      if (event.key === 'Escape') setMobilePanel(false);
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, []);

  useEffect(() => {
    if (about) dialog.current?.showModal(); else dialog.current?.close();
  }, [about]);

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
  const ready = progress === 100 && !error;
  const quizPoolSize = useMemo(() => new Set(atlas?.parts.filter(part => scene.visible.includes(part.system))
    .map(part => part.name)).size, [atlas, scene.visible]);
  const reveal = mode !== 'revise' || !quiz || answer !== null;
  const shortList = query ? results.slice(0, 60) : COMMON.map(name => atlas?.concepts
    .find(concept => concept.name.toLowerCase() === name)).filter((concept): concept is Concept => !!concept);

  function choose(concept: Concept) {
    setChosen(concept); setDetailTab('overview'); setMobilePanel(false);
    setScene(current => ({ ...current, selected: concept.elements, isolate: false, rotate: false }));
  }

  function choosePart(id: string) {
    if (!reveal && quiz) return;
    const part = parts.get(id);
    if (part) choose({ id: part.conceptId, name: part.name, elements: [id] });
  }

  function reset() {
    setChosen(null); setQuiz(null); setAnswer(null); setMode('explore');
    setScene(current => ({ ...INITIAL, reset: current.reset + 1 }));
  }

  function preset(visible: SystemId[]) {
    setChosen(null); setQuiz(null); setAnswer(null);
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
    setMode(next); setQuiz(null); setAnswer(null); setChosen(null);
    setScene(current => ({ ...current, selected: [], isolate: false, rotate: false }));
  }

  function openAtlas(system?: SystemId) {
    if (system) setScene(current => ({ ...current, visible: [system], selected: [], isolate: false, explode: 0 }));
    setStarted(true);
    window.scrollTo(0, 0);
  }

  if (!started) return <main className="landing">
    <header className="landing-header">
      <a className="landing-brand" href="#top" aria-label="Anatomy101 home"><img src="/heart.jpg" alt=""/><span>Anatomy<span>101</span></span></a>
      <nav aria-label="Main navigation"><a href="#explore">Explore</a><a href="#systems">Systems</a><a href="#study">Study tools</a></nav>
      <button className="landing-nav-cta" onClick={() => openAtlas()}>Start learning <ArrowRight size={16}/></button>
    </header>
    <section className="landing-hero" id="top">
      <div className="hero-copy"><h1><span><i>Explore</i></span><span><i>anatomy</i></span></h1><p className="hero-deck">A detailed 3D atlas for medical study. Explore systems, separate structures, and build recall through hands-on revision.</p><div className="hero-actions"><button className="landing-primary" onClick={() => openAtlas()}>Start exploring <ArrowRight size={17}/></button><a className="landing-secondary" href="#systems">Browse systems</a></div><p className="hero-note">Rotate · isolate · inspect · revise</p></div>
      <div className="hero-plates"><div className="hero-artwork"><img className="hero-poster" src="/hero.webp" width={1672} height={941} fetchPriority="high" alt="The Human Body, Anatomy101: engraved anatomical illustrations of the brain, torso, hand, and rib cage"/></div><button className="landing-primary hero-art-cta" onClick={() => openAtlas()}>Start exploring <ArrowRight size={17}/></button></div>
    </section>
    <section className="landing-proof" id="explore" aria-label="Atlas capabilities">
      <div><strong>Explore in 3D</strong><span>Rotate the model and inspect named structures.</span></div>
      <div><strong>Separate systems</strong><span>Show layers together or isolate one view.</span></div>
      <div><strong>Revise actively</strong><span>Save structures, write notes, and test recall.</span></div>
    </section>
    <section className="systems-section" id="systems">
      <div className="section-intro"><h2>Learn how the parts connect.</h2><span>Choose a layer to open the 3D atlas with that system in view.</span></div>
      <div className="system-board">{SYSTEMS.map((item, index) => <button className="system-entry" key={item.id} onClick={() => openAtlas(item.id)}><span className="system-entry-art"><img loading="lazy" decoding="async" src={index % 3 === 0 ? '/skull.jpg' : index % 3 === 1 ? '/rib.jpg' : '/brain.jpg'} alt=""/></span><span className="system-entry-copy"><strong>{item.name}</strong><small>{item.description}</small></span><ArrowRight size={19}/></button>)}</div>
    </section>
    <section className="study-section" id="study"><div className="study-image"><img loading="lazy" decoding="async" src="/Anatomy101.jpg" alt="Anatomical reference plate with brain and hand illustrations"/></div><div className="study-copy"><h2>Make anatomy active.</h2><p>Click a structure to inspect it. Pull layers apart to see their relationships. Save important parts and return to them with your own notes and identification practice.</p><ol><li><span>Explore</span>Rotate and search the model.</li><li><span>Focus</span>Isolate structures or combine systems.</li><li><span>Remember</span>Bookmark, annotate, and quiz yourself.</li></ol><button className="landing-primary" onClick={() => openAtlas()}>Open the atlas <ArrowRight size={17}/></button></div></section>
    <footer className="landing-footer"><a className="landing-brand" href="#top"><img src="/heart.jpg" alt=""/><span>Anatomy<span>101</span></span></a><span>Designed &amp; developed by Sai for J</span><a href="#top">Back to top ↑</a></footer>
  </main>;

  return <main className="studio" data-ui="">
    <a className="skip-link" href="#viewer">Skip to anatomy viewer</a>
    <header className="app-header">
      <button className="brand" onClick={() => { setStarted(false); setMode('explore'); setQuiz(null); }} aria-label="Anatomy101 home"><img className="studio-heart" src="/heart.jpg" alt=""/><span>Anatomy<span className="brand-light">101</span><small>INTERACTIVE ATLAS</small></span></button>
      <nav className="workspace-tabs" aria-label="Study mode">
        <button className={mode === 'explore' ? 'active' : ''} onClick={() => changeMode('explore')} aria-pressed={mode === 'explore'}><Layers3 size={16}/>Explore</button>
        <button className={mode === 'revise' ? 'active' : ''} onClick={() => changeMode('revise')} aria-pressed={mode === 'revise'}><BookOpen size={16}/>Revise</button>
      </nav>
      <div className="header-right"><button className="icon-button" onClick={() => setAbout(true)} aria-label="Atlas information"><CircleHelp size={20}/></button></div>
    </header>

    <div className="workspace">
      {mobilePanel && <button className="sidebar-backdrop" onClick={() => setMobilePanel(false)} aria-label="Close anatomy library"/>}
      <aside className={`library ${mobilePanel ? 'mobile-open' : ''}`} aria-label="Anatomy library">
        <div className="library-intro"><div><span className="section-label">YOUR REFERENCE</span><h1>Anatomy library</h1></div><button className="icon-button mobile-only" onClick={() => setMobilePanel(false)} aria-label="Close library"><X size={18}/></button></div>
        <label className="search-field"><Search size={16}/><input ref={search} value={query} onChange={event => { setQuery(event.target.value); setTab('structures'); }} placeholder="Find a structure…" aria-label="Search anatomy"/><kbd>/</kbd></label>
        <div className="library-tabs" role="tablist" aria-label="Library sections">
          {(['systems', 'structures', 'saved'] as const).map(value => <button key={value} role="tab" aria-selected={tab === value} aria-controls="library-content" id={`tab-${value}`} onClick={() => setTab(value)}>{value === 'saved' ? <><Bookmark size={13}/>Saved{saved.length > 0 && <span>{saved.length}</span>}</> : value === 'systems' ? 'Systems' : 'Structures'}</button>)}
        </div>
        <div className="library-content" id="library-content" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === 'systems' && <>
            <div className="presets" aria-label="Layer presets"><button onClick={() => preset(DEFAULT_VISIBLE)}>Full body</button><button onClick={() => preset(['skeletal'])}>Skeleton</button><button onClick={() => preset(ORGANS)}>Organs</button></div>
            <div className="list-heading"><span>ANATOMICAL SYSTEMS</span><button onClick={() => preset([])}>Hide all</button></div>
            <div className="system-list">{SYSTEMS.map(item => <div className={`system-row ${scene.visible.includes(item.id) ? 'enabled' : ''}`} key={item.id}>
              <button className="system-name" onClick={() => preset([item.id])} title={`Show only ${item.name.toLowerCase()}`}><span className="system-dot" style={{ background: item.color }}/><span>{item.name}</span><small>{atlas ? counts[item.id].toLocaleString() : '—'}</small></button>
              <button className="visibility-switch" aria-label={`${scene.visible.includes(item.id) ? 'Hide' : 'Show'} ${item.name.toLowerCase()}`} aria-pressed={scene.visible.includes(item.id)} onClick={() => {
                setChosen(null); setQuiz(null); setAnswer(null);
                setScene(current => ({ ...current, selected: [], isolate: false, visible: current.visible.includes(item.id)
                  ? current.visible.filter(id => id !== item.id) : [...current.visible, item.id] }));
              }}>{scene.visible.includes(item.id) ? <Eye size={15}/> : <EyeOff size={15}/>}</button>
            </div>)}</div>
            <p className="library-hint">Select a name to show one system. Use the eye to combine layers.</p>
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
        <div className="viewer-toolbar"><div><button className="icon-button mobile-only" onClick={() => setMobilePanel(true)} aria-label="Open anatomy library"><Menu size={18}/></button><span className="viewer-title">{scene.isolate ? 'Structure view' : scene.explode > .8 ? 'Anatomical inventory' : 'Whole-body view'}</span><span className="toolbar-divider"/><span className="viewer-subtitle">Adult male</span></div><span className="mesh-count">{visibleCount.toLocaleString()} visible</span></div>
        <div className="viewport" id="viewer" ref={viewport} tabIndex={-1}>
          {atlas && <AnatomyScene atlas={atlas} state={scene} onSelect={choosePart} onProgress={(value: number) => setProgress(value)} onError={(message: string) => setError(message)}/>}
          <div className="orientation" aria-hidden="true"><span>S</span><span>L</span><i/><span>R</span><span>I</span></div>
          <div className="camera-controls" aria-label="Camera controls">
            {(['three-quarter', 'front', 'side', 'back'] as View[]).map((view, index) => <button key={view} className={scene.view === view ? 'active' : ''} disabled={scene.explode > .8 && view !== 'front'} aria-pressed={scene.view === view} aria-label={`${view} view`} title={`${view} view`} onClick={() => setScene(current => ({ ...current, view, rotate: false, reset: current.reset + 1 }))}>{['¾', 'F', 'S', 'B'][index]}</button>)}
            <span/>
            <button disabled={scene.explode >= .4 || scene.isolate} onClick={() => setScene(current => ({ ...current, rotate: !current.rotate }))} aria-label={scene.rotate ? 'Pause rotation' : 'Auto rotate'} title="Auto rotate">{scene.rotate ? <Pause size={16}/> : <RotateCw size={16}/>}</button>
            <button onClick={() => setScene(current => ({ ...current, reset: current.reset + 1 }))} aria-label="Fit model to view" title="Fit model"><Maximize2 size={15}/></button>
          </div>
          {!error && progress < 100 && <div className="loading-state" role="status"><h2>{atlas ? 'Preparing the anatomy' : 'Opening your atlas'}</h2><p>{atlas ? <><strong>{progress}%</strong> · Loading detailed geometry</> : 'Loading the anatomy catalogue'}</p><div className="loading-track"><i style={{ width: `${progress}%` }}/></div><small>First load includes about 33 MB of geometry.</small></div>}
          {error && <div className="loading-state error-state" role="alert"><CircleHelp size={28}/><h2>Anatomy unavailable</h2><p>{error}</p><small>Check your connection. You can also run <code>npm run models:download</code> to install local model files.</small><button className="primary-button" onClick={() => { setQuiz(null); setChosen(null); setScene(INITIAL); setAttempt(current => current + 1); }}>Retry download<RotateCcw size={15}/></button></div>}
          {ready && !visibleCount && <div className="loading-state"><Layers3 size={28}/><h2>No layers visible</h2><p>Select a system from the anatomy library.</p><button className="primary-button" onClick={() => preset(DEFAULT_VISIBLE)}>Show anatomy<ArrowRight size={16}/></button></div>}
        </div>
        <div className="explode-dock">
          <div className="explode-heading"><Layers3 size={18}/><div><label htmlFor="explode">Separate anatomy</label><span>See how the pieces fit together</span></div></div>
          <div className="explode-slider"><div><span>Assembled</span><output htmlFor="explode">{Math.round(scene.explode * 100)}%</output><span>Separated</span></div><input id="explode" type="range" min="0" max="100" step="1" value={scene.explode * 100} disabled={!!quiz && answer === null} onChange={event => { const amount = Number(event.target.value) / 100; setScene(current => ({ ...current, explode: amount, rotate: false, isolate: false, view: amount > .8 ? 'front' : current.view })); }}/></div>
          <button className="reset-button" onClick={reset}><RotateCcw size={16}/><span>Reset</span></button>
        </div>
        <div className="viewer-footer"><span>Drag to {scene.explode > .8 ? 'pan' : 'rotate'}<b>·</b>Scroll to zoom<b>·</b>Click to inspect</span><span>Keyboard: ← → / + −</span></div>
      </section>

      <aside className="inspector" aria-label="Structure information">
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
          <div className="structure-metadata"><span>{chosen.id}</span><span>{selectedParts.length} {selectedParts.length === 1 ? 'mesh' : 'meshes'}</span></div>
          <div className="detail-tabs" role="tablist" aria-label="Structure details"><button role="tab" aria-selected={detailTab === 'overview'} onClick={() => setDetailTab('overview')}>Overview</button><button role="tab" aria-selected={detailTab === 'notes'} onClick={() => setDetailTab('notes')}>My notes{notes[chosen.id] && <i/>}</button></div>
          {detailTab === 'overview' ? <>
            <p className="structure-description">{note?.function || explanation(chosen.name, selected.system)}</p>
            {note ? <div className="anatomy-facts"><div><h3>Location & relations</h3><p>{note.location}</p></div><div><h3>Blood supply</h3><p>{note.supply}</p></div><div><h3>Innervation</h3><p>{note.innervation}</p></div><div className="recall-note"><BookOpen size={17}/><div><h3>Revision checkpoint</h3><p>{note.recall}</p></div></div><a className="reference-link" href={note.url} target="_blank" rel="noreferrer">{note.reference}<ArrowUpRight size={14}/></a></div> : <div className="context-note"><BookOpen size={16}/><p>System context shown. Detailed notes have not been authored for this structure.<a href={`https://www.ncbi.nlm.nih.gov/books/?term=${encodeURIComponent(chosen.name + ' anatomy')}`} target="_blank" rel="noreferrer">Find anatomical references<ArrowUpRight size={13}/></a></p></div>}
            {selectedParts.length > 1 && <details className="mesh-members"><summary>Included structures <span>{selectedParts.length}</span></summary><div>{selectedParts.slice(0, 60).map(part => <button key={part.id} onClick={() => choosePart(part.id)}>{part.name}<ChevronRight size={13}/></button>)}{selectedParts.length > 60 && <small>{selectedParts.length - 60} more meshes. Search a smaller structure to inspect them.</small>}</div></details>}
          </> : <div className="personal-notes"><label htmlFor="study-note">Your revision notes</label><textarea id="study-note" placeholder="Add landmarks, relations, or a recall prompt…" value={notes[chosen.id] || ''} onChange={event => setNotes(current => ({ ...current, [chosen.id]: event.target.value }))}/><p>{storageError || 'Saved on this browser. Keep personal study notes here.'}</p></div>}
          <div className="detail-actions"><button className="primary-button" onClick={() => setScene(current => ({ ...current, isolate: !current.isolate, explode: 0, rotate: false }))}><Focus size={17}/>{scene.isolate ? 'Show surrounding anatomy' : 'Isolate structure'}<ArrowRight size={16}/></button><button className="text-button" onClick={() => { setChosen(null); setScene(current => ({ ...current, selected: [], isolate: false })); }}>Clear selection</button></div>
        </div> : mode === 'explore' && <div className="inspector-empty"><div className="empty-icon"><Focus size={30} strokeWidth={1.2}/></div><h2>Every part has a story.</h2><p>Select a structure on the model, or find one in the library.</p><div className="interaction-guide"><span><span>01</span>Click to inspect</span><span><span>02</span>Isolate for a closer look</span><span><span>03</span>Save, study, and revise</span></div><button className="outline-button" onClick={() => { setTab('structures'); setMobilePanel(true); search.current?.focus(); }}><Search size={16}/>Find a structure<ArrowRight size={15}/></button></div>}
        {mode === 'explore' && !chosen && <div className="study-start"><span className="section-label">A GOOD PLACE TO START</span><div>{STUDY_NOTES.slice(0, 4).map(item => <button key={item.title} disabled={!atlas} onClick={() => { const concept = atlas?.concepts.find(concept => item.names.includes(concept.name.toLowerCase())); if (concept) choose(concept); }}><span>{item.title}</span><ChevronRight size={14}/></button>)}</div></div>}
        <div className="inspector-footer"><span>Reference anatomy. Individual variation applies.</span><button onClick={() => setAbout(true)}>About this atlas<ArrowUpRight size={12}/></button><small className="creator-credit">Designed &amp; developed by Sai for J</small></div>
      </aside>
    </div>
    {storageError && <div className="storage-notice" role="status">{storageError}<button className="icon-button" onClick={() => setStorageError('')} aria-label="Dismiss storage message"><X size={14}/></button></div>}
    <dialog ref={dialog} className="about-dialog" onCancel={() => setAbout(false)} onClose={() => setAbout(false)}>
      <div className="dialog-header"><span className="section-label">ABOUT THIS ATLAS</span><button className="icon-button" onClick={() => setAbout(false)} aria-label="Close atlas information"><X size={20}/></button></div>
      <h2>Human anatomy, made explorable.</h2><p>Explore anatomical structures, review system relationships, and practice identification.</p>
      <div className="source-stats"><span><strong>{atlas?.parts.length.toLocaleString() || '2,234'}</strong>individual meshes</span><span><strong>{atlas?.concepts.length.toLocaleString() || '3,432'}</strong>named concepts</span></div>
      <h3>Study content</h3><p>Organ notes are brief educational summaries with linked references. Structures without authored notes show system context. This app is for learning and revision, not diagnosis or surgical planning.</p>
      <p className="muted">Geometry: {remote ? 'online model files' : 'local model files'}. Bookmarks and notes stay in this browser.</p>
      <a className="reference-link" href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html" target="_blank" rel="noreferrer">Original anatomy dataset<ArrowUpRight size={15}/></a>
    </dialog>
  </main>;
}
