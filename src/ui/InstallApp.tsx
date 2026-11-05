import { Download, PlusSquare, Share } from 'lucide-react';
import { useState } from 'react';
import { useInstall } from '../pwa/install';
import { Sheet } from './common';

/**
 * "Install app" control.
 * - Chrome / Edge / Android: opens the browser's native install dialog.
 * - iOS Safari: shows the manual steps (Share → Add to Home Screen).
 * - Other browsers: shows general guidance. Hidden when already running as an installed app.
 */
export function InstallApp({ variant = 'secondary', block }: { variant?: 'primary' | 'secondary' | 'ghost'; block?: boolean }) {
  const ins = useInstall();
  const [help, setHelp] = useState(false);
  if (ins.installed) return null;
  const onClick = async () => {
    if (ins.canPrompt) await ins.prompt();
    else setHelp(true);
  };
  return (
    <>
      <button type="button" className={`btn ${variant} ${block ? 'block' : ''}`} onClick={onClick}>
        <Download size={18} /> ติดตั้งแอปลงมือถือ
      </button>
      <Sheet open={help} onClose={() => setHelp(false)} title="ติดตั้งนัดโตะลงมือถือ">
        {ins.ios ? (
          <ol className="small" style={{ paddingLeft: 20, margin: '0 0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>เปิดหน้านี้ด้วย <b>Safari</b></li>
            <li>แตะปุ่ม <b>แชร์</b> <Share size={15} style={{ verticalAlign: -2 }} /> ที่แถบด้านล่าง</li>
            <li>เลือก <b>เพิ่มไปยังหน้าจอโฮม</b> <PlusSquare size={15} style={{ verticalAlign: -2 }} /></li>
            <li>แตะ <b>เพิ่ม</b> ไอคอนนัดโตะจะอยู่บนหน้าจอโฮม</li>
          </ol>
        ) : (
          <ol className="small" style={{ paddingLeft: 20, margin: '0 0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>เปิดหน้านี้ด้วย <b>Chrome</b> หรือ <b>Edge</b></li>
            <li>แตะเมนู <b>⋮</b> มุมขวาบน</li>
            <li>เลือก <b>ติดตั้งแอป</b> หรือ <b>เพิ่มลงในหน้าจอหลัก</b></li>
          </ol>
        )}
        <p className="xs muted">ติดตั้งแล้วเปิดได้จากไอคอนเหมือนแอปทั่วไป แบบเต็มจอ และเปิดดูได้แม้ออฟไลน์หลังจากเคยเปิดครั้งแรกแล้ว · ข้อมูลใน demo เป็นข้อมูลจำลอง</p>
        <button className="btn primary block" onClick={() => setHelp(false)}>เข้าใจแล้ว</button>
      </Sheet>
    </>
  );
}
