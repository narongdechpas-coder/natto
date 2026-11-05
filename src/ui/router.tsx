// Minimal hash router (no dependency) — works on static hosting without server rewrites.
import { useEffect, useState } from 'react';

const read = () => (window.location.hash.replace(/^#/, '') || '/').split('?');

export function useRoute() {
  const [r, setR] = useState(read);
  useEffect(() => {
    const on = () => { setR(read()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const [path, qs = ''] = r;
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs) };
}

export const navigate = (to: string) => { window.location.hash = to; };
export const back = (fallback = '/') => {
  if (window.history.length > 1) window.history.back();
  else navigate(fallback);
};
