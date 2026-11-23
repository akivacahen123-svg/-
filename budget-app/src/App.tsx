import React, { useEffect, useState } from 'react';
import { Icons } from './components/ui';
import { useStore } from './lib/store';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import ImportPage from './pages/Import';
import BudgetPage from './pages/Budget';
import CoursePage from './pages/Course';
import WealthPage from './pages/Wealth';
import SettingsPage from './pages/Settings';

export type Page = 'dashboard' | 'transactions' | 'import' | 'budget' | 'course' | 'wealth' | 'settings';

const NAV: { id: Page; label: string; short: string; icon: keyof typeof Icons }[] = [
  { id: 'dashboard', label: 'דשבורד', short: 'דשבורד', icon: 'dashboard' },
  { id: 'transactions', label: 'תנועות', short: 'תנועות', icon: 'list' },
  { id: 'import', label: 'הזנה וייבוא', short: 'הזנה', icon: 'upload' },
  { id: 'budget', label: 'בניית תקציב', short: 'תקציב', icon: 'budget' },
  { id: 'wealth', label: 'הון משפחתי', short: 'הון', icon: 'wealth' },
  { id: 'course', label: 'קורס ניהול כלכלי', short: 'קורס', icon: 'course' },
  { id: 'settings', label: 'הגדרות וגיבוי', short: 'הגדרות', icon: 'settings' },
];

function readHash(): Page {
  const h = window.location.hash.replace('#', '') as Page;
  return NAV.some((n) => n.id === h) ? h : 'dashboard';
}

export default function App() {
  const [page, setPage] = useState<Page>(readHash);
  const { data, saveError } = useStore();

  useEffect(() => {
    const on = () => setPage(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (p: Page) => {
    window.location.hash = p;
    setPage(p);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <img src="./icon.svg" alt="" />
          <div>
            הכיס המשפחתי
            <small>{data.familyName || 'ניהול תקציב חכם'}</small>
          </div>
        </div>
        {NAV.map((n) => {
          const I = Icons[n.icon];
          return (
            <button key={n.id} className={`nav-btn ${page === n.id ? 'active' : ''}`} onClick={() => go(n.id)}>
              <I /> {n.label}
            </button>
          );
        })}
        <div className="spacer" />
        <div className="privacy">🔒 כל הנתונים נשמרים רק בדפדפן הזה ולא נשלחים לשום שרת.</div>
      </aside>

      <main className="main">
        {saveError && <div className="note warn" style={{ marginBottom: 16 }}><span className="ic">!</span>{saveError}</div>}
        {page === 'dashboard' && <Dashboard go={go} />}
        {page === 'transactions' && <Transactions />}
        {page === 'import' && <ImportPage go={go} />}
        {page === 'budget' && <BudgetPage />}
        {page === 'wealth' && <WealthPage />}
        {page === 'course' && <CoursePage go={go} />}
        {page === 'settings' && <SettingsPage />}
      </main>

      <nav className="mobile-nav">
        {NAV.filter((n) => n.id !== 'settings').map((n) => {
          const I = Icons[n.icon];
          return (
            <button key={n.id} className={page === n.id ? 'active' : ''} onClick={() => go(n.id)}>
              <I />
              {n.short}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
