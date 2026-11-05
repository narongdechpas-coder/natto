import { Bell, Bot, CalendarDays, ClipboardList, Compass, Handshake, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { DATA_AS_OF } from '../../data/config';
import type { User } from '../../domain/types';
import { fmtMonth, fmtPp } from '../../domain/labels';
import { decisionFor, monthlyInsight, recsFor, scopePartners } from '../../state/selectors';
import { useStore } from '../../state/store';
import { AsOf, MASCOT, StateView } from '../../ui/common';
import { navigate } from '../../ui/router';
import { RecCard } from './shared';

export default function Dashboard({ user }: { user: User }) {
  const { data, today, showToast } = useStore();
  const partners = scopePartners(data, user);
  const ids = new Set(partners.map((p) => p.id));
  const recs = recsFor(data, ids);
  const month = today.slice(0, 7);
  const myVisits = data.visits.filter((v) => ids.has(v.partnerId));
  const planned = myVisits.filter((v) => v.status === 'planned' && v.date >= today).length;
  const visited = myVisits.filter((v) => v.status === 'visited' && v.date.startsWith(month)).length;
  const visitIds = new Set(myVisits.map((v) => v.id));
  const openFu = data.followUps.filter((f) => visitIds.has(f.visitId) && f.status !== 'done').length;
  const todo = recs.filter((r) => {
    const d = decisionFor(data, r.id)?.decision;
    return !d || d === 'prepare' || d === 'plan_contact';
  }).slice(0, 3);
  const insight = monthlyInsight(data, partners);

  const kpis = [
    { v: recs.length, l: 'คู่ค้าที่แนะนำ', icon: Target, to: '/recs' },
    { v: planned, l: 'นัดหมาย', icon: CalendarDays, to: '/visits?tab=planned' },
    { v: visited, l: `เข้าพบแล้ว (${fmtMonth(month).split(' ')[0]})`, icon: Handshake, to: '/visits' },
    { v: openFu, l: 'ต้องติดตาม', icon: ClipboardList, to: '/visits?tab=follow' },
  ];

  return (
    <>
      <div className="hero">
        <div className="row between">
          <div className="brand">นัด<span>โตะ</span></div>
          <button className="icon-btn" aria-label="การแจ้งเตือน" onClick={() => showToast('การแจ้งเตือนเป็นฟีเจอร์ในอนาคต')}><Bell size={18} /></button>
        </div>
        <h1 style={{ marginTop: 10 }}>สวัสดี, {user.name}</h1>
        <p className="small" style={{ margin: '2px 0 0', maxWidth: '62%', color: 'var(--ink-2)' }}>
          {recs.length ? `เดือนนี้นัดโตะพบคู่ค้าที่ควรพิจารณา ${recs.length} ราย` : 'เดือนนี้ยังไม่มีคู่ค้าที่ต้องพิจารณาเป็นพิเศษ'}
        </p>
        <img className="mascot" src={MASCOT} alt="" />
      </div>
      <div className="page">
        <div className="kpi-grid" style={{ marginTop: 4 }}>
          {kpis.map((k) => {
            const I = k.icon;
            return (
              <button key={k.l} className="kpi" onClick={() => navigate(k.to)}>
                <I size={20} /><span className="v num">{k.v}</span><span className="l">{k.l}</span>
              </button>
            );
          })}
        </div>

        <div className="section">
          <div className="section-title"><h2>คู่ค้าที่ควรพิจารณาเข้าพบ</h2><a href="#/recs">ดูทั้งหมด →</a></div>
          {todo.length ? todo.map((r) => <RecCard key={r.id} r={r} compact />) : (
            <div className="card"><StateView kind="empty" title="ไม่มีคู่ค้าที่ต้องพิจารณาเพิ่ม" text="คุณดำเนินการกับคำแนะนำของเดือนนี้ครบแล้ว" /></div>
          )}
          <div style={{ marginTop: 8 }}><AsOf date={DATA_AS_OF} label="คำนวณจากข้อมูลรายเดือน ณ" /></div>
        </div>

        <div className="section">
          <div className="section-title"><h2>Insight ประจำเดือน</h2></div>
          {insight ? (
            <div className="card row">
              <span className="p-avatar">{insight.pp < 0 ? <TrendingDown size={22} color="var(--red)" /> : <TrendingUp size={22} color="var(--green)" />}</span>
              <div className="grow small">
                <b>Renewal Rate รวมของ {insight.type} ที่คุณดูแล ({insight.n} ราย)</b>
                <div>{fmtMonth(data.months[data.months.length - 1])} เปลี่ยนไป <b className={insight.pp < 0 ? 'down' : 'up'}>{fmtPp(insight.pp)}</b> จากเดือนก่อน</div>
              </div>
            </div>
          ) : <div className="card small muted">ข้อมูลไม่พอสำหรับสรุป Insight เดือนนี้</div>}
          <a className="card p-card" href="#/scenario" style={{ marginTop: 10 }}>
            <span className="p-avatar"><Compass size={22} /></span>
            <div className="grow"><b>ค้นหาตามโจทย์ธุรกิจ</b><div className="small muted">เช่น เปิดตัวผลิตภัณฑ์ EV ควรไปพบใคร</div></div>
          </a>
        </div>

        <div className="section">
          <button className="cta-ai" onClick={() => showToast('ถามนัดโตะ (AI Assistant) จะเปิดให้ใช้เร็วๆ นี้')} aria-label="ถามนัดโตะ เร็วๆ นี้">
            <Bot size={26} />
            <span><b>ถามนัดโตะ (AI Assistant)</b><div className="xs" style={{ opacity: .85 }}>เช่น "วันนี้ควรโฟกัสคู่ค้าไหน?"</div></span>
            <span className="soon">เร็วๆ นี้</span>
          </button>
        </div>
      </div>
    </>
  );
}
