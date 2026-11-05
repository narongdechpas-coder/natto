import type { User } from '../domain/types';
import { useStore } from '../state/store';
import { MASCOT } from '../ui/common';
import { navigate } from '../ui/router';
import { UserPicker } from '../ui/UserPicker';

export default function Login() {
  const { data, login } = useStore();
  const enter = (u: User) => { login(u.id); navigate('/'); };
  return (
    <div className="login-wrap">
      <div style={{ textAlign: 'center' }}>
        <img src={MASCOT} alt="มาสคอตนัดโตะ" style={{ width: 132 }} />
        <div className="brand">นัด<span>โตะ</span> <span style={{ color: 'var(--navy)', fontSize: 18 }}>(NATTO)</span></div>
        <p className="muted" style={{ margin: '4px 0 18px' }}>ผู้ช่วยคิดว่า วันนี้คุณควรไปพบใคร</p>
      </div>
      <h2 style={{ fontSize: 17, color: 'var(--navy)', marginBottom: 4 }}>เลือกผู้ใช้สำหรับ demo</h2>
      <p className="small muted" style={{ marginTop: 0 }}>ระบบจำลองการเข้าสู่ระบบ แต่ละบทบาทเห็นข้อมูลตามสิทธิ์ของตัวเอง</p>
      <UserPicker users={data.users} teams={data.teams} recommendedId="U-MKT1" onPick={enter} />
    </div>
  );
}
