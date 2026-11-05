import { LogOut, RotateCcw, UserRound } from 'lucide-react';
import { useState } from 'react';
import { DATA_AS_OF } from '../../data/config';
import type { User } from '../../domain/types';
import { fmtDate } from '../../domain/labels';
import { useStore } from '../../state/store';
import { Note, PageHeader, Sheet } from '../../ui/common';
import { navigate } from '../../ui/router';

const ROLE = { marketing: 'Marketing', manager: 'Manager', executive: 'ผู้บริหาร' } as const;

export default function Profile({ user }: { user: User }) {
  const { data, today, login, logout, reset } = useStore();
  const [confirm, setConfirm] = useState(false);
  const team = data.teams.find((t) => t.id === user.teamId);
  return (
    <>
      <PageHeader title="โปรไฟล์" backTo="/" />
      <div className="page">
        <div className="card row">
          <span className="p-avatar"><UserRound size={24} /></span>
          <div className="grow"><b style={{ fontSize: 17 }}>{user.name}</b><div className="small muted">{ROLE[user.role]} · {team?.name ?? 'ทั้งองค์กร'}</div></div>
        </div>

        <div className="section">
          <div className="section-title"><h2>สลับบทบาท (demo)</h2></div>
          <div className="stack">
            {data.users.map((u) => (
              <button key={u.id} className={`option ${u.id === user.id ? 'active' : ''}`} onClick={() => { login(u.id); navigate('/'); }}>
                <b>{u.name}</b><span className="small muted">{ROLE[u.role]}{u.teamId ? ` · ${data.teams.find((t) => t.id === u.teamId)!.name}` : ''}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="section stack">
          <Note>ข้อมูลรายเดือน ณ {fmtDate(DATA_AS_OF)} · วันที่ใน demo คือ {fmtDate(today)} · ข้อมูลทั้งหมดเป็นข้อมูลจำลอง</Note>
          <button className="btn danger block" onClick={() => setConfirm(true)}><RotateCcw size={18} /> รีเซ็ตข้อมูล demo</button>
          <button className="btn secondary block" onClick={() => { logout(); navigate('/login'); }}><LogOut size={18} /> ออกจากระบบ</button>
        </div>
      </div>
      <Sheet open={confirm} onClose={() => setConfirm(false)} title="รีเซ็ตข้อมูล demo?">
        <p className="small">การตัดสินใจ การเข้าพบ Feedback และงานติดตามที่บันทึกระหว่าง demo จะถูกลบ ข้อมูลจำลองตั้งต้นยังอยู่ครบ</p>
        <div className="row">
          <button className="btn secondary grow" onClick={() => setConfirm(false)}>ยกเลิก</button>
          <button className="btn primary grow" onClick={() => { reset(); setConfirm(false); navigate('/'); }}>รีเซ็ต</button>
        </div>
      </Sheet>
    </>
  );
}
