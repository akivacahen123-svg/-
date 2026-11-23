import React, { useState } from 'react';
import type { Page } from '../App';
import { COURSE, TIPS, type Lesson } from '../content/course';
import { Carousel } from '../components/ui';
import { useStore } from '../lib/store';

const MODULE_TINTS: [string, string][] = [
  ['var(--tint-teal)', 'var(--income)'],
  ['var(--tint-coral)', 'var(--expense)'],
  ['var(--tint-violet)', 'var(--saving)'],
  ['var(--tint-butter)', '#d99a12'],
  ['var(--accent-soft)', 'var(--accent)'],
];

export default function CoursePage({ go }: { go: (p: Page) => void }) {
  const { data, setData } = useStore();
  const all = COURSE.flatMap((m) => m.lessons);
  const firstOpen = all.find((l) => !data.courseDone.includes(l.id)) ?? all[0];
  const [active, setActive] = useState<string>(firstOpen.id);
  const lesson = all.find((l) => l.id === active)!;
  const mod = COURSE.find((m) => m.lessons.some((l) => l.id === active))!;
  const done = new Set(data.courseDone);
  const pct = Math.round((done.size / all.length) * 100);

  const markDone = (id: string, v: boolean) =>
    setData((d) => ({ ...d, courseDone: v ? [...new Set([...d.courseDone, id])] : d.courseDone.filter((x) => x !== id) }));
  const next = () => {
    markDone(lesson.id, true);
    const i = all.findIndex((l) => l.id === lesson.id);
    if (i < all.length - 1) {
      setActive(all[i + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">לומדים תוך כדי</div>
          <h1>קורס ניהול כלכלי למשפחה</h1>
          <p>{all.length} שיעורים קצרים, מהבסיס ועד חיסכון לטווח ארוך. כל שיעור מסתיים בצעד מעשי באפליקציה.</p>
        </div>
        <div style={{ minWidth: 200 }}>
          <div className="small muted" style={{ marginBottom: 4 }}>התקדמות: {done.size}/{all.length} ({pct}%)</div>
          <div className="prog"><div style={{ width: `${pct}%`, background: 'var(--saving)' }} /></div>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <Carousel label="פרקי הקורס" slide="minmax(220px, 260px)" autoplay={0}>
          {COURSE.map((m, mi) => {
            const n = m.lessons.filter((l) => done.has(l.id)).length;
            const palette = MODULE_TINTS[mi % MODULE_TINTS.length];
            return (
              <button key={m.id} className={`module-card ${m.id === mod.id ? 'on' : ''}`} style={{ background: palette[0] }}
                onClick={() => setActive((m.lessons.find((l) => !done.has(l.id)) ?? m.lessons[0]).id)}>
                <div className="mshape" style={{ background: palette[1] }} />
                <span className="mnum" style={{ color: palette[1] }}>{mi + 1}</span>
                <b>{m.title}</b>
                <span className="small" style={{ color: 'var(--text-2)' }}>{m.lessons.length} שיעורים</span>
                <div className="mprog">
                  <div className="prog"><div style={{ width: `${(n / m.lessons.length) * 100}%`, background: palette[1] }} /></div>
                  {n}/{m.lessons.length}
                </div>
              </button>
            );
          })}
        </Carousel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
        <div className="grid course-grid">
          <article className="card lesson-body" key={lesson.id} style={{ animation: 'rise .6s var(--ease) both' }}>
            <div className="small muted">{mod.title} · {lesson.minutes} דקות קריאה</div>
            <h2 style={{ fontSize: 22, margin: '4px 0 14px' }}>{lesson.title}</h2>
            <LessonBlocks lesson={lesson} />
            {lesson.quiz && <Quiz key={lesson.id} quiz={lesson.quiz} />}
            {lesson.action && (
              <div className="note info" style={{ marginBottom: 14 }}>
                <span className="ic">→</span>
                <span><b>צעד מעשי: </b>{lesson.action.text} <button className="btn sm" onClick={() => go(lesson.action!.page)}>פתיחה</button></span>
              </div>
            )}
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <label className="row small" style={{ gap: 6 }}>
                <input type="checkbox" checked={done.has(lesson.id)} onChange={(e) => markDone(lesson.id, e.target.checked)} /> סיימתי את השיעור
              </label>
              <button className="btn primary" onClick={next}>סיום והמשך לשיעור הבא ←</button>
            </div>
          </article>

          <div className="stack" style={{ gap: 16 }}>
          <div className="card">
            <h2>טיפים קצרים</h2>
            <Carousel label="טיפים" autoplay={5000}>
              {TIPS.map((t, i) => (
                <div key={i} className="slide-card tip"><div className="corner" /><span className="tag">טיפ {i + 1} מתוך {TIPS.length}</span><p>{t}</p></div>
              ))}
            </Carousel>
          </div>
          <nav className="card" aria-label="תוכן הקורס">
            {COURSE.map((m, mi) => (
              <div className="module" key={m.id}>
                <h3>{mi + 1}. {m.title}</h3>
                {m.lessons.map((l) => (
                  <button key={l.id} className={`lesson-item ${l.id === active ? 'active' : ''}`} onClick={() => setActive(l.id)}>
                    <span className={`check ${done.has(l.id) ? 'done' : ''}`}>{done.has(l.id) ? '✓' : ''}</span>
                    <span className="small">{l.title}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
          </div>
        </div>
      </div>
    </>
  );
}

function LessonBlocks({ lesson }: { lesson: Lesson }) {
  return (
    <>
      {lesson.blocks.map((b, i) => {
        if (b.t === 'p') return <p key={i}>{b.text}</p>;
        if (b.t === 'list') return <ul key={i}>{b.items.map((x, j) => <li key={j}>{x}</li>)}</ul>;
        if (b.t === 'tip') return <div key={i} className="tipbox"><b>💡 טיפ: </b>{b.text}</div>;
        return <div key={i} className="example"><b>{b.title}: </b>{b.text}</div>;
      })}
    </>
  );
}

function Quiz({ quiz }: { quiz: NonNullable<Lesson['quiz']> }) {
  const [pick, setPick] = useState<number | null>(null);
  return (
    <div className="quiz example">
      <b>שאלה לבדיקה: </b>{quiz.q}
      <div style={{ marginTop: 10 }}>
        {quiz.options.map((o, i) => (
          <button key={i} className={`btn opt ${pick != null && i === quiz.answer ? 'right' : ''} ${pick === i && i !== quiz.answer ? 'wrong' : ''}`} onClick={() => setPick(i)}>
            {o}
          </button>
        ))}
      </div>
      {pick != null && <p className="small" style={{ margin: '6px 0 0' }}>{pick === quiz.answer ? '✓ נכון! ' : 'לא בדיוק. '}{quiz.why}</p>}
    </div>
  );
}
