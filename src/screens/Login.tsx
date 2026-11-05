import { Briefcase, ChevronRight, Crown, Users } from 'lucide-react';
import type { User } from '../domain/types';
import { useStore } from '../state/store';
import { MASCOT } from '../ui/common';
import { navigate } from '../ui/router';

const ROLE_LABEL = { marketing: 'Marketing', manager: 'Manager', executive: 'ผู้บริหาร' } as const;

export default function Login() {
  const { data, login } = useStore();
  const enter = (u: User) => { login(u.id); navigate('/'); };
  const team = (u: User) => data.teams.find((t) => t.id === u.teamId)?.name ?? 'ทั้งองค์กร';
  const groups: { role: User['role']; icon: typeof Users }[] = [
    { role: 'marketing', icon: Briefcase }, { role: 'manager', icon: Users }, { role: 'executive', icon: Crown },
  ];
  return (
    <div className="login-wrap">
      <div style={{ textAlign: 'center' }}>
        <img src={MASCOT} alt="มาสคอตนัดโตะ" style={{ width: 132 }} />
        <div className="brand">นัด<span>โตะ</span> <span style={{ color: 'var(--navy)', fontSize: 18 }}>(NATTO)</span></div>
        <p className="muted" style={{ margin: '4px 0 18px' }}>ผู้ช่วยคิดว่า วันนี้คุณควรไปพบใคร</p>
      </div>
      <h2 style={{ fontSize: 17, color: 'var(--navy)', marginBottom: 4 }}>เลือกผู้ใช้สำหรับ demo</h2>
      <p className="small muted" style={{ marginTop: 0 }}>ระบบจำลองการเข้าสู่ระบบ แต่ละบทบาทเห็นข้อมูลตามสิทธิ์ของตัวเอง</p>
      {groups.map((g) => (
        <div key={g.role} className="section">
          <div className="section-title"><h2>{ROLE_LABEL[g.role]}</h2></div>
          {data.users.filter((u) => u.role === g.role).map((u) => {
            const I = g.icon;
            return (
              <button key={u.id} className="card role-card" onClick={() => enter(u)}>
                <span className="p-avatar"><I size={20} /></span>
                <span className="grow">
                  <b>{u.name}</b>{u.id === 'U-MKT1' && <span className="badge medium" style={{ marginLeft: 6 }}>แนะนำสำหรับ demo</span>}
                  <div className="small muted">{ROLE_LABEL[u.role]} · {team(u)}</div>
                </span>
                <ChevronRight size={18} className="muted" />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
