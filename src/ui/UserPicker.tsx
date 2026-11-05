// Demo user picker grouped by role (and by team for Marketing). Used on the login screen and the profile page.
import { Briefcase, Check, ChevronRight, Crown, Users } from 'lucide-react';
import type { Team, User } from '../domain/types';

interface Group { key: string; title: string; desc: string; tone: 'exec' | 'mgr' | 'mkt'; icon: typeof Users; users: User[] }

export function groupUsers(users: User[], teams: Team[]): Group[] {
  const groups: Group[] = [
    { key: 'exec', title: 'ผู้บริหาร', desc: 'เห็นภาพรวมทั้งองค์กร เจาะลงได้ทุกทีม', tone: 'exec', icon: Crown, users: users.filter((u) => u.role === 'executive') },
    { key: 'mgr', title: 'Manager', desc: 'เห็นเฉพาะทีมของตัวเอง', tone: 'mgr', icon: Users, users: users.filter((u) => u.role === 'manager') },
  ];
  for (const t of teams) {
    groups.push({
      key: `mkt-${t.id}`, title: `Marketing · ${t.name.replace('ทีม Marketing - ', 'ทีม')}`, desc: 'เห็นเฉพาะคู่ค้าที่ตัวเองดูแล', tone: 'mkt', icon: Briefcase,
      users: users.filter((u) => u.role === 'marketing' && u.teamId === t.id),
    });
  }
  return groups.filter((g) => g.users.length);
}

export function UserPicker({ users, teams, currentId, recommendedId, onPick }: {
  users: User[]; teams: Team[]; currentId?: string | null; recommendedId?: string; onPick: (u: User) => void;
}) {
  const teamName = (u: User) => teams.find((t) => t.id === u.teamId)?.name;
  return (
    <div className="user-groups">
      {groupUsers(users, teams).map((g) => {
        const I = g.icon;
        return (
          <section key={g.key} className={`user-group ${g.tone}`} aria-label={g.title}>
            <header>
              <span className="ug-icon"><I size={18} /></span>
              <div className="grow"><b>{g.title}</b><div className="xs">{g.desc}</div></div>
              <span className="ug-count">{g.users.length} คน</span>
            </header>
            {g.users.map((u) => {
              const current = u.id === currentId;
              return (
                <button key={u.id} className={`ug-row ${current ? 'current' : ''}`} onClick={() => onPick(u)} aria-current={current ? 'true' : undefined}>
                  <span className="ug-avatar" aria-hidden>{u.name.slice(0, 1)}</span>
                  <span className="grow">
                    <b>{u.name}</b>
                    {u.id === recommendedId && !current && <span className="badge medium" style={{ marginLeft: 6 }}>แนะนำสำหรับ demo</span>}
                    {current && <span className="badge good" style={{ marginLeft: 6 }}><Check size={12} /> กำลังใช้งาน</span>}
                    <div className="xs muted">{u.role === 'executive' ? 'ทั้งองค์กร' : teamName(u)}</div>
                  </span>
                  <ChevronRight size={18} className="muted" />
                </button>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
