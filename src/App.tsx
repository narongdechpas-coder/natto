import { useEffect, useState } from 'react';
import { useStore } from './state/store';
import { userById } from './state/selectors';
import { BottomNav, DemoRibbon, ErrorBoundary, SkeletonList, StateView, Toast } from './ui/common';
import { navigate, useRoute } from './ui/router';
import Login from './screens/Login';
import Dashboard from './screens/marketing/Dashboard';
import Recommendations from './screens/marketing/Recommendations';
import RecommendationDetail from './screens/marketing/RecommendationDetail';
import Scenario from './screens/marketing/Scenario';
import PartnerIntel from './screens/marketing/PartnerIntel';
import VisitForm from './screens/marketing/VisitForm';
import History from './screens/marketing/History';
import VisitDetail from './screens/marketing/VisitDetail';
import Profile from './screens/marketing/Profile';
import MyReport from './screens/marketing/MyReport';
import { MgmtShell } from './screens/mgmt/MgmtShell';
import TeamDashboard from './screens/mgmt/TeamDashboard';
import ExecDashboard from './screens/mgmt/ExecDashboard';
import MarketingDetail from './screens/mgmt/MarketingDetail';

export default function App() {
  const { session, data, toast } = useStore();
  const { path, parts, query } = useRoute();
  const [booting, setBooting] = useState(true);

  // Short simulated load so the loading state is visible in the demo.
  useEffect(() => { const t = setTimeout(() => setBooting(false), 450); return () => clearTimeout(t); }, []);
  useEffect(() => { if (!session.userId && path !== '/login') navigate('/login'); }, [session.userId, path]);

  if (!session.userId || path === '/login') {
    return <><DemoRibbon /><Login /><Toast msg={toast} /></>;
  }
  const user = userById(data, session.userId);

  const loading = <div className="page"><div className="skeleton" style={{ height: 140, marginBottom: 12 }} /><SkeletonList /></div>;
  const notFound = <StateView kind="empty" title="ไม่พบหน้านี้" action={<a className="btn primary" href="#/">กลับหน้าหลัก</a>} />;

  // Shared screens (scope-checked inside each screen)
  const shared = (): React.ReactNode | undefined => {
    switch (parts[0]) {
      case 'partner': return <PartnerIntel id={parts[1]} user={user} tab={query.get('tab')} />;
      case 'recs': return parts[1] ? <RecommendationDetail id={parts[1]} user={user} /> : undefined;
      case 'visits': return parts[1] ? <VisitDetail id={parts[1]} user={user} /> : <History user={user} />;
      case 'profile': return <Profile user={user} />;
      default: return undefined;
    }
  };

  if (user.role !== 'marketing') {
    let screen: React.ReactNode;
    if (booting) screen = loading;
    else if (!parts[0]) screen = user.role === 'manager' ? <TeamDashboard viewer={user} teamId={user.teamId!} /> : <ExecDashboard viewer={user} />;
    else if (parts[0] === 'org' && parts[1] === 'team') screen = user.role === 'executive'
      ? <TeamDashboard viewer={user} teamId={parts[2]} /> : <StateView kind="error" title="ไม่มีสิทธิ์เข้าถึง" text="หน้านี้สำหรับผู้บริหาร" />;
    else if (parts[0] === 'team') screen = <MarketingDetail viewer={user} userId={parts[1]} />;
    else screen = shared() ?? notFound;
    return (
      <>
        <DemoRibbon />
        <MgmtShell user={user} path={path}><ErrorBoundary>{screen}</ErrorBoundary></MgmtShell>
        <Toast msg={toast} />
      </>
    );
  }

  let screen: React.ReactNode;
  if (booting) {
    screen = loading;
  } else {
    switch (parts[0]) {
      case undefined: screen = <Dashboard user={user} />; break;
      case 'recs': screen = parts[1] ? <RecommendationDetail id={parts[1]} user={user} /> : <Recommendations user={user} />; break;
      case 'scenario': screen = <Scenario user={user} />; break;
      case 'visit': screen = <VisitForm partnerId={parts[2]} user={user} recId={query.get('rec')} planId={query.get('plan')} />; break;
      case 'report': screen = <MyReport user={user} />; break;
      default: screen = shared() ?? notFound;
    }
  }

  return (
    <>
      <DemoRibbon />
      <div className="mobile-shell">
        <ErrorBoundary>{screen}</ErrorBoundary>
        <BottomNav path={path} />
      </div>
      <Toast msg={toast} />
    </>
  );
}
