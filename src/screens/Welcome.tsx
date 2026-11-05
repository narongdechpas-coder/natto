import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { MASCOTS } from '../ui/common';
import { InstallApp } from '../ui/InstallApp';

export const WELCOME_KEY = 'natto-welcome-seen';

/**
 * Welcome screen shown once per app launch (browser session).
 * Sequence: mascot pops in → app name rises → swoosh draws → tagline → slogan → buttons.
 * Animations respect prefers-reduced-motion (see styles.css).
 */
export default function Welcome({ onDone }: { onDone: () => void }) {
  const done = () => {
    try { sessionStorage.setItem(WELCOME_KEY, '1'); } catch { /* ignore */ }
    onDone();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === 'Escape') done(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <main className="welcome" aria-label="ยินดีต้อนรับสู่นัดโตะ">
      <div className="welcome-beans" aria-hidden>
        {Array.from({ length: 9 }, (_, i) => <span key={i} style={{ ['--i' as string]: i }} />)}
      </div>
      <button className="welcome-skip" onClick={done}>ข้าม</button>
      <div className="welcome-inner">
        <div className="welcome-mascot-wrap">
          <div className="welcome-halo" aria-hidden />
          <img className="welcome-mascot" src={MASCOTS.default} alt="มาสคอตนัดโตะ" />
        </div>
        <h1 className="welcome-name" aria-label="นัดโตะ">
          {['นัด', 'โตะ'].map((w, i) => <span key={w} className={`w${i}`} style={{ animationDelay: `${0.75 + i * 0.18}s` }}>{w}</span>)}
        </h1>
        <div className="welcome-swoosh" aria-hidden />
        <p className="welcome-tagline">ผู้ช่วยคิดว่า <b>วันนี้คุณควรไปพบใคร</b></p>
        <p className="welcome-slogan">หนึ่งนัด หนึ่งเมล็ด หนึ่งก้าวของการเติบโต</p>
        <div className="welcome-actions">
          <button className="btn primary block" onClick={done} autoFocus>เริ่มต้นใช้งาน <ArrowRight size={18} /></button>
          <InstallApp variant="ghost" block />
          <p className="xs muted" style={{ margin: 0 }}>DEMO · ข้อมูลทั้งหมดเป็นข้อมูลจำลอง</p>
        </div>
      </div>
      <div className="welcome-wave" aria-hidden />
    </main>
  );
}
