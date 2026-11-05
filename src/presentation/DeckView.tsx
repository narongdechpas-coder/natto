// Shared slide viewer for both decks.
// - Desktop/landscape: 1280×720 canvas scaled to fit; keys ← → Space, N notes, F fullscreen, swipe on touch.
// - Phone/portrait: "reading mode" — slides stack vertically; animations play when a slide scrolls into view.
// - Booth mode (?booth=1 or the ▶ button): auto-advances and loops; any interaction pauses it, and it
//   resumes after a period of no interaction.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

export interface Slide {
  id: string;
  kicker: string;
  title: string;
  demo?: boolean;
  cover?: boolean;
  /** Seconds this slide stays up in booth mode (default 10). */
  duration?: number;
  body: ReactNode;
  notes: string;
}

const RESUME_AFTER_MS = 45_000;

export function DeckView({ slides, footer }: { slides: Slide[]; footer: [string, string] }) {
  const readIndex = () => {
    const n = Number(window.location.hash.replace('#', ''));
    return Number.isInteger(n) && n >= 1 && n <= slides.length ? n - 1 : 0;
  };
  const boothParam = new URLSearchParams(window.location.search).has('booth');
  const [i, setI] = useState(readIndex);
  const [visit, setVisit] = useState(0); // bump to replay animations when a slide is shown again
  const [notes, setNotes] = useState(false);
  const [reading, setReading] = useState(false);
  const [scale, setScale] = useState(1);
  const [booth, setBooth] = useState(boothParam);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);
  const resumeTimer = useRef<number | undefined>(undefined);
  const readingRef = useRef<HTMLElement>(null);

  const go = useCallback((n: number, loop = false) => {
    const k = loop ? (n + slides.length) % slides.length : Math.max(0, Math.min(slides.length - 1, n));
    setI(k);
    setVisit((v) => v + 1);
    history.replaceState(null, '', `${window.location.search}#${k + 1}`);
  }, [slides.length]);

  // Layout mode + scale
  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth, h = window.innerHeight;
      setReading(w < 900 || h > w);
      setScale(Math.min(w / 1280, (h - 8) / 720));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Typed URL hash (#5) jumps to that slide
  useEffect(() => {
    const on = () => { setI(readIndex()); setVisit((v) => v + 1); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Any interaction pauses booth autoplay, which resumes after a quiet period
  const touchActivity = useCallback(() => {
    if (!booth) return;
    setPaused(true);
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), RESUME_AFTER_MS);
  }, [booth]);
  useEffect(() => () => window.clearTimeout(resumeTimer.current), []);

  // Booth autoplay
  useEffect(() => {
    if (!booth || paused || reading) return;
    const t = window.setTimeout(() => go(i + 1, true), (slides[i].duration ?? 10) * 1000);
    return () => window.clearTimeout(t);
  }, [booth, paused, reading, i, visit, go, slides]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (reading) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return; // typing in the ROI calculator
      touchActivity();
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(i + 1); }
      else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(i - 1); }
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(slides.length - 1);
      else if (e.key.toLowerCase() === 'n') setNotes((x) => !x);
      else if (e.key.toLowerCase() === 'b') { setBooth((x) => !x); setPaused(false); }
      else if (e.key.toLowerCase() === 'f') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, go, reading, slides.length, touchActivity]);

  // Reading mode: play each slide's animations when it scrolls into view
  useEffect(() => {
    if (!reading || !readingRef.current) return;
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) en.target.classList.add('play');
    }, { threshold: 0.25 });
    readingRef.current.querySelectorAll('section.slide').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [reading, slides]);

  const render = (s: Slide, n: number, play: boolean, key: string) => s.cover ? (
    <section className={`slide cover ${play ? 'play' : ''}`} key={key} aria-label={`สไลด์ ${n + 1}: ${s.title}`}>{s.body}</section>
  ) : (
    <section className={`slide ${play ? 'play' : ''}`} key={key} aria-label={`สไลด์ ${n + 1}: ${s.title}`}>
      {s.demo && <span className="tag-demo">DEMO DATA · ข้อมูลจำลอง</span>}
      <div className="kicker"><span className="num">{n + 1}/{slides.length}</span>{s.kicker}</div>
      <h1 className="title">{s.title}</h1>
      {s.body}
      <div className="footer"><span>{footer[0]}</span><span>{footer[1]}</span></div>
    </section>
  );

  if (reading) {
    return <main className="reading" ref={readingRef}>{slides.map((s, n) => render(s, n, false, s.id))}</main>;
  }
  const s = slides[i];
  return (
    <div onPointerDown={touchActivity} onWheel={touchActivity}>
      <div className="progress" style={{ width: `${((i + 1) / slides.length) * 100}%` }} />
      <div className="viewport"
        onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1)); touch.current = null; }}>
        <div className="stage" style={{ transform: `scale(${scale})` }}>{render(s, i, true, `${s.id}-${visit}`)}</div>
      </div>
      <nav className="controls" aria-label="ควบคุมสไลด์">
        <button onClick={() => go(i - 1)} aria-label="สไลด์ก่อนหน้า" disabled={i === 0}>←</button>
        <span>{i + 1} / {slides.length}</span>
        <button onClick={() => go(i + 1)} aria-label="สไลด์ถัดไป" disabled={i === slides.length - 1}>→</button>
        <button onClick={() => setNotes((x) => !x)} aria-pressed={notes}>โน้ต (N)</button>
        <button onClick={() => { setBooth((x) => !x); setPaused(false); }} aria-pressed={booth} title="เล่นวนอัตโนมัติสำหรับจอที่บูธ (B)">
          {booth ? (paused ? '⏸ บูธ (พักชั่วคราว)' : '▶ โหมดบูธ') : 'โหมดบูธ (B)'}
        </button>
        <button onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())}>เต็มจอ (F)</button>
      </nav>
      {notes && <aside className="notes" aria-label="โน้ตผู้นำเสนอ"><h4>โน้ตผู้นำเสนอ · สไลด์ {i + 1}</h4>{s.notes}</aside>}
    </div>
  );
}
