import React, { useEffect, useState } from 'react';
import { ConfirmProvider, DesignCtx, Icons, type Design } from './components/ui';
import { useStore } from './lib/store';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import ImportPage from './pages/Import';
import BudgetPage from './pages/Budget';
import CoursePage from './pages/Course';
import WealthPage from './pages/Wealth';
import SettingsPage from './pages/Settings';

export type Page = 'dashboard' | 'transactions' | 'import' | 'budget' | 'course' | 'wealth' | 'backup';

const NAV: { id: Page; label: string; short: string; icon: keyof typeof Icons }[] = [
  { id: 'dashboard', label: 'דשבורד', short: 'בית', icon: 'dashboard' },
  { id: 'transactions', label: 'תנועות', short: 'תנועות', icon: 'list' },
  { id: 'import', label: 'הזנה וייבוא', short: 'הזנה', icon: 'upload' },
  { id: 'budget', label: 'בניית תקציב', short: 'תקציב', icon: 'budget' },
  { id: 'wealth', label: 'הון משפחתי', short: 'הון', icon: 'wealth' },
  { id: 'course', label: 'קורס ניהול כלכלי', short: 'קורס', icon: 'course' },
  { id: 'backup', label: 'גיבוי והגדרות', short: 'גיבוי', icon: 'settings' },
];

function readHash(): Page {
  const h = window.location.hash.replace('#', '') as Page;
  return NAV.some((n) => n.id === h) ? h : 'dashboard';
}

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="bm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0b6b63" />
          <stop offset="1" stopColor="#3b6fd8" />
        </linearGradient>
      </defs>
      <path d="M24 2c11 0 22 7 22 20s-9 24-22 24C11 46 2 38 2 25S13 2 24 2z" fill="url(#bm)" />
      <path d="M15 21h18v12a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3z" fill="#fff" />
      <path d="M19 21l3-6h4l3 6" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="24" cy="28" r="3.4" fill="#ee5f3a" />
    </svg>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>(readHash);
  const design: Design = 'vivid';
  const { data, saveError, clearDemo } = useStore();

  useEffect(() => {
    const on = () => setPage(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (p: Page) => {
    try { window.location.hash = p; } catch { /* some embeds block hash writes */ }
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const activeIdx = NAV.findIndex((n) => n.id === page);

  return (
    <DesignCtx.Provider value={{ design, setDesign: () => {} }}>
    <ConfirmProvider>
      <div className="ambient" aria-hidden="true" />
      <div className="app">
        <aside className="side">
          <div className="brand">
            <BrandMark />
            <div>
              <b>הכיס המשפחתי</b>
              <small>{data.familyName || 'ניהול תקציב חכם'}</small>
            </div>
          </div>
          <nav className="nav" aria-label="ניווט ראשי">
            <div className="nav-pill" style={{ transform: `translateY(${activeIdx * 48}px)` }} />
            {NAV.map((n) => {
              const I = Icons[n.icon];
              return (
                <button key={n.id} className={`nav-btn ${page === n.id ? 'active' : ''}`} onClick={() => go(n.id)} aria-current={page === n.id ? 'page' : undefined}>
                  <I /> {n.label}
                </button>
              );
            })}
          </nav>
          <div className="spacer" />
          <div className="privacy"><Icons.lock /> <span>הנתונים נשמרים רק בדפדפן הזה ולא נשלחים לשום שרת.</span></div>
        </aside>

        <main className="main">
          {data.isDemo && (
            <div className="demo-bar">
              <span><b>אלה נתוני דוגמה</b> של משפחה בדויה, כדי שתוכלו לראות איך הכול עובד. הייבוא או ההזנה הראשונים שלכם יחליפו אותם.</span>
              <span className="row">
                <button className="btn sm primary" onClick={() => go('import')}>ייבוא הנתונים שלי</button>
                <button className="btn sm ghost" onClick={clearDemo}>התחלה נקייה</button>
              </span>
            </div>
          )}
          {saveError && <div className="note warn" style={{ marginBottom: 16 }}><span className="ic">!</span>{saveError}</div>}
          <div className="page" key={page}>
            {page === 'dashboard' && <Dashboard go={go} />}
            {page === 'transactions' && <Transactions />}
            {page === 'import' && <ImportPage go={go} />}
            {page === 'budget' && <BudgetPage />}
            {page === 'wealth' && <WealthPage />}
            {page === 'course' && <CoursePage go={go} />}
            {page === 'backup' && <SettingsPage />}
          </div>
        </main>

        <nav className="mobile-nav" aria-label="ניווט">
          {NAV.filter((n) => n.id !== 'backup' && n.id !== 'wealth').map((n) => {
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
    </ConfirmProvider>
    </DesignCtx.Provider>
  );
}
