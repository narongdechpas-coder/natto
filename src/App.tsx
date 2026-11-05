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
import ManagementPlaceholder from './screens/ManagementPlaceholder';

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

  let screen: React.ReactNode;
  if (booting) {
    screen = <div className="page"><div className="skeleton" style={{ height: 140, marginBottom: 12 }} /><SkeletonList /></div>;
  } else if (user.role !== 'marketing' && !['profile'].includes(parts[0] ?? '') && !(parts[0] === 'partner' || parts[0] === 'visits')) {
    screen = <ManagementPlaceholder user={user} />;
  } else {
    switch (parts[0]) {
      case undefined: screen = <Dashboard user={user} />; break;
      case 'recs': screen = parts[1] ? <RecommendationDetail id={parts[1]} user={user} /> : <Recommendations user={user} />; break;
      case 'scenario': screen = <Scenario user={user} />; break;
      case 'partner': screen = <PartnerIntel id={parts[1]} user={user} tab={query.get('tab')} />; break;
      case 'visit': screen = <VisitForm partnerId={parts[2]} user={user} recId={query.get('rec')} planId={query.get('plan')} />; break;
      case 'visits': screen = parts[1] ? <VisitDetail id={parts[1]} user={user} /> : <History user={user} />; break;
      case 'report': screen = <MyReport user={user} />; break;
      case 'profile': screen = <Profile user={user} />; break;
      default: screen = <StateView kind="empty" title="ไม่พบหน้านี้" action={<a className="btn primary" href="#/">กลับหน้าหลัก</a>} />;
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
