#!/usr/bin/env python3
"""
בונה את כל דפי האתר מתוך מקור נתונים אחד (הקובץ הזה).

הרצה:  python3 build.py
התוצאה: index.html, curriculum.html ו-lessons/lesson-01.html ... lesson-22.html

כדי לשנות טקסט, מחיר או שיעור — משנים כאן ומריצים שוב.
"""
from html import escape
from pathlib import Path

ROOT = Path(__file__).parent

# ------------------------------------------------------------------
# הגדרות כלליות
# ------------------------------------------------------------------
COURSE = "לא לצאת פראייר בפרסום"
AUTHOR = "עקיבא כהן"
YEARS = 7
PRICE = 500
# לאן מוביל כפתור הרכישה (קישור לדף תשלום). כרגע מוביל לטופס ההשארת פרטים.
PURCHASE_URL = "index.html#lead"

# ------------------------------------------------------------------
# אייקונים (קו, בסגנון דף הנחיתה)
# ------------------------------------------------------------------
ICONS = {
    "compass": '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    "users": '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.4 3.5 5.2"/>',
    "layers": '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    "chart": '<path d="M4 18V9m5 9V5m5 13v-7m5 7V3"/><path d="M3 21h18"/>',
    "plug": '<path d="M9 3v5M15 3v5"/><path d="M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v4"/>',
    "gauge": '<path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 14 4-5"/><circle cx="12" cy="14" r="1.2"/>',
    "briefcase": '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
    "spark": '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    "handshake": '<path d="m3 12 4-4 5 2 5-2 4 4-7 7z"/><path d="m10 13 2 2"/>',
    "rocket": '<path d="M5 15c-1 1-1.5 3.5-1.5 5.5 2 0 4.5-.5 5.5-1.5"/><path d="M9 15 6 12c2-6 7-9 14-9 0 7-3 12-9 14z"/><circle cx="14.5" cy="9.5" r="1.5"/>',
    "alert": '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
    "doc": '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    "question": '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.5"/>',
    "money": '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>',
    "check": '<path d="M4 6h16v12H4z"/><path d="m8 12 3 3 5-6"/>',
    "tag": '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
    "table": '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
    "flag": '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    "play": '<path d="M4 6h16v12H4z"/><path d="m10 9 5 3-5 3z"/>',
    "chev": '<path d="m6 9 6 6 6-6"/>',
}


def icon(name, cls="icon"):
    return (f'<div class="{cls}"><svg viewBox="0 0 24 24" aria-hidden="true">'
            f'{ICONS[name]}</svg></div>')


# ------------------------------------------------------------------
# מבנה הקורס: 6 שלבים, 22 שיעורים
# ------------------------------------------------------------------
STAGES = [
    {
        "name": "יסודות",
        "icon": "compass",
        "summary": "מה זה קמפיין, מה רוצים להשיג, איך קוראים את המספרים וכמה כסף צריך.",
        "lessons": [
            ("מה זה בכלל קמפיין?", "לפני שנוגעים בפייסבוק או בגוגל, צריך להבין מה אנחנו בכלל בונים. קמפיין הוא מערכת של החלטות שמחברת בין מטרה עסקית לבין אדם אמיתי."),
            ("מטרות, יעדים ו-KPI", "לומדים להחליט מה אנחנו רוצים להשיג, איך מנסחים יעד מספרי, ואיך יודעים אם קמפיין מצליח באמת."),
            ("המספרים של קמפיין", "CPM, CPC, CTR, CPL, CPA, CVR ו-ROAS — לא רק פירוש המילים, אלא איך מחשבים, קוראים ומאבחנים."),
            ("תקציב וכלכלת קמפיין", "כמה כסף צריך לשים, מהו מחיר ליד מקסימלי, מתי להגדיל תקציב ומתי לעצור."),
        ],
    },
    {
        "name": "קהל ותוכן",
        "icon": "users",
        "summary": "למי מדברים, מה אומרים לו, ואיך הופכים את זה לתוכן ולקריאייטיב שעובדים.",
        "lessons": [
            ("קהל יעד ומסרים", "איך מפסיקים לפרסם ל״כולם״ ובונים מסר שאדם מסוים באמת רוצה לעצור בשבילו."),
            ("תוכן, כתבות ומדמי תוכן", "איך הופכים מידע למודעה, פוסט, כתבה או דף נחיתה שמובילים את הקורא לפעולה."),
            ("SEO ותוכן שמוצאים בגוגל", "איך לכתוב תוכן שגם אדם מבין וגם מנוע חיפוש יכול להבין ולסווג."),
            ("קריאייטיב, באנרים וסרטונים", "מה מעצב צריך לקבל, כמה גרסאות להכין, איך בודקים קריאייטיב ולמה באנר יפה לא בהכרח מוכר."),
        ],
    },
    {
        "name": "פלטפורמות",
        "icon": "layers",
        "summary": "רק עכשיו נכנסים למערכות: הקמת קמפיין אמיתי ב-Meta ובגוגל, צעד אחר צעד.",
        "lessons": [
            ("Meta — פייסבוק ואינסטגרם מאפס", "הקמת קמפיין אמיתי ב-Meta: מבנה, מטרה, קהל, תקציב, מודעה, תיוג ובדיקה לפני פרסום."),
            ("Google Ads מאפס", "הקמת קמפיין חיפוש בגוגל: מילות מפתח, קבוצות מודעות, מודעות, תקציב, המרות ומילות מפתח שליליות."),
        ],
    },
    {
        "name": "מדידה",
        "icon": "chart",
        "summary": "מאיפה הגיע כל גולש ומה הוא עשה אחרי הקליק.",
        "lessons": [
            ("UTM ותיוגים נכונים", "איך לגרום לכל כניסה לאתר לשאת איתה מידע ברור על מקור התנועה, הקמפיין והמודעה."),
            ("Google Analytics — מה קורה אחרי הקליק", "הקמת מדידה, אירועים, אירועי מפתח, בדיקה בזמן אמת וקריאת מקורות תנועה."),
        ],
    },
    {
        "name": "מערכות",
        "icon": "plug",
        "summary": "מחברים הכול: API, אוטומציות, CRM ודשבורד אחד שמראה את התמונה המלאה.",
        "lessons": [
            ("API וחיבור בין מערכות — מאפס", "מה באמת קורה כשמערכת אחת שולחת מידע לאחרת, ואיך בונים חיבור בלי להיבהל ממילים כמו JSON ו-Webhooks."),
            ("אוטומציות ורובוטים", "איך בונים מסלול שבו ליד נכנס, נרשם, נשלחת הודעה, איש המכירות מקבל משימה והמערכת ממשיכה לעבוד."),
            ("CRM ואיכות לידים", "איך מנהלים לידים, מודדים איכות, מחברים מכירות חזרה לפרסום ומגלים אם הבעיה היא במדיה או במכירות."),
            ("דשבורדים", "איך להפוך נתונים מפוזרים למסך אחד שבעל העסק יכול להבין תוך דקה."),
        ],
    },
    {
        "name": "ניהול ושליטה",
        "icon": "gauge",
        "summary": "דוחות, אבחון תקלות, ניהול שוטף, AI — ופרויקט גמר שמחבר הכול.",
        "lessons": [
            ("דוחות: מספרים שהופכים להחלטות", "איך כותבים דוח שאומר לא רק מה קרה, אלא מה צריך לעשות מחר בבוקר."),
            ("אבחון קמפיין — למצוא את התקלה", "מתרגלים שרשרת תקלות: אין חשיפות, אין קליקים, אין לידים, אין מכירות, או שהמערכות מציגות מספרים שונים."),
            ("ניהול שוטף ואופטימיזציה", "מה בודקים כל יום, כל שבוע וכל חודש; מתי נוגעים ומתי דווקא לא נוגעים."),
            ("AI ככלי עבודה של איש פרסום", "מחקר, מסרים, תוכן, ניתוח דוחות, רעיונות לקריאייטיב, אוטומציות וכתיבת בריפים — עם תהליך עבודה שלא מסתמך על קסמים."),
            ("פרויקט גמר — מקמפיין למערכת שלמה", "לוקחים עסק אמיתי ומרכיבים עבורו מערכת מלאה: יעד, קהל, מסר, קריאייטיב, מדידה, CRM, אוטומציה ודוח."),
            ("צ׳ק־ליסט למפרסם — לפני שעולה קמפיין", "בדיקת QA מלאה: באנרים, לינקים, תיוגים, כתבות, מדמי תוכן, דפי נחיתה, API, CRM, Analytics, דשבורד ולידים."),
        ],
    },
]

# רשימה שטוחה של שיעורים עם מספור רץ
LESSONS = []
for si, stage in enumerate(STAGES):
    for title, desc in stage["lessons"]:
        n = len(LESSONS) + 1
        LESSONS.append({"n": n, "num": f"{n:02d}", "title": title, "desc": desc,
                        "stage": si, "file": f"lesson-{n:02d}.html"})
assert len(LESSONS) == 22, len(LESSONS)

AUDIENCE = [
    ("briefcase", "בעל עסק", "שמוציא כסף על פרסום ורוצה לדעת מה הוא מקבל."),
    ("spark", "מתחיל מוחלט", "מי שלא יודע מה זה CPC, UTM או API — ומתחיל מאפס."),
    ("handshake", "מי שעובד עם איש מקצוע", "רוצה להבין את הדוחות ולדעת מה לבקש."),
    ("rocket", "מי שמנהל בעצמו", "רוצה לבנות קמפיינים, למדוד ולשפר."),
]

PAINS = [
    ("money", "התקציב נגמר, התוצאות לא", "הכסף יוצא כל חודש, ואף אחד לא באמת מסביר לאן הוא הלך ולמה."),
    ("doc", "דוח מלא במספרים", "מקבלים דוח עם CTR, CPM ו-ROAS — ועדיין לא יודעים אם הקמפיין הצליח."),
    ("question", "לא יודעים מה לשאול", "קשה לבדוק עבודה מקצועית כשלא מבינים מה קורה מאחורי הקמפיין."),
]

TOOLS = [
    ("doc", "בריף", "מה לתת למעצב ולאיש המדיה"),
    ("check", "צ׳ק־ליסט QA", "בדיקה לפני שעולים לאוויר"),
    ("tag", "טבלת UTM", "תיוג אחיד לכל קישור"),
    ("table", "טבלת בקרה", "מעקב שוטף אחרי הקמפיין"),
    ("chart", "דוח חודשי", "מספרים שהופכים להחלטות"),
    ("alert", "אבחון קמפיין", "למצוא איפה זה נתקע"),
    ("gauge", "דשבורד", "כל התמונה במסך אחד"),
    ("flag", "פרויקט גמר", "מערכת מלאה לעסק אמיתי"),
]

FAQ = [
    ("אני מתחיל מאפס. הקורס מתאים לי?",
     "כן. הקורס בנוי בדיוק בשבילך — מתחילים מהשאלה מה זה בכלל קמפיין, ורק אחרי שהיסודות ברורים נכנסים למערכות כמו Meta וגוגל."),
    ("אני לא רוצה לנהל קמפיינים בעצמי. למה לי הקורס?",
     "המטרה היא לא להפוך אותך לאיש מדיה, אלא שתבין מספיק כדי לשאול את השאלות הנכונות, לבדוק את העבודה שנעשית עבורך, לזהות בעיות ולהיות בשליטה על הכסף והנתונים שלך."),
    ("כמה שיעורים יש ובאיזה סדר?",
     f"22 שיעורים בששה שלבים: יסודות, קהל ותוכן, פלטפורמות, מדידה, מערכות, וניהול ושליטה. את התוכנית המלאה אפשר לראות בעמוד תוכנית הלימודים."),
    ("יש חומרי עבודה?",
     "כן. מצורפת ערכת כלים: בריף, צ׳ק־ליסט QA, טבלת UTM, טבלת בקרה, דוח חודשי, אבחון קמפיין, דשבורד ופרויקט גמר."),
    ("כמה עולה הקורס?",
     f"{PRICE} ₪, תשלום אחד."),
]

# ------------------------------------------------------------------
# רכיבים משותפים
# ------------------------------------------------------------------

def head(title, desc, prefix=""):
    return f'''<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(title)}</title>
  <meta name="description" content="{escape(desc)}">
  <meta property="og:title" content="{escape(title)}">
  <meta property="og:description" content="{escape(desc)}">
  <meta property="og:image" content="{prefix}assets/img/hero-sm.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Hebrew:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{prefix}assets/css/style.css">
</head>
<body>
'''


def header(active, prefix=""):
    def link(href, label, key):
        cur = ' aria-current="page"' if key == active else ""
        return f'<a href="{prefix}{href}"{cur}>{label}</a>'
    return f'''<header class="site-header">
  <div class="container">
    <a class="logo" href="{prefix}index.html"><span class="logo-mark">✓</span>{COURSE}</a>
    <button class="nav-toggle" aria-label="תפריט" aria-expanded="false" aria-controls="nav"><span></span></button>
    <nav class="nav" id="nav">
      {link("index.html", "הקורס", "home")}
      {link("curriculum.html", "תוכנית הלימודים", "curriculum")}
      {link("index.html#about", "קצת עליי", "about")}
      {link("index.html#faq", "שאלות נפוצות", "faq")}
      <a class="btn btn-primary" href="{prefix}{PURCHASE_URL}">רכישת הקורס · ₪{PRICE}</a>
    </nav>
  </div>
</header>
'''


def footer(prefix=""):
    return f'''<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <a class="logo" href="{prefix}index.html"><span class="logo-mark">✓</span>{COURSE}</a>
      <nav class="footer-links">
        <a href="{prefix}curriculum.html">תוכנית הלימודים</a>
        <a href="{prefix}index.html#about">קצת עליי</a>
        <a href="{prefix}index.html#lead">צ׳ק ליסט חינמי</a>
        <a href="{prefix}index.html#faq">שאלות נפוצות</a>
      </nav>
    </div>
    <div class="copyright">© 2026 {AUTHOR} · {COURSE}</div>
  </div>
</footer>
<script src="{prefix}assets/js/main.js"></script>
</body>
</html>
'''


def module_list(open_first=True, prefix=""):
    out = []
    for si, stage in enumerate(STAGES):
        lessons = [l for l in LESSONS if l["stage"] == si]
        items = "\n".join(
            f'''          <li><a class="lesson" href="{prefix}lessons/{l["file"]}"><span class="lesson-num">{l["num"]}</span>'''
            f'''<div><h4>{escape(l["title"])}</h4><p>{escape(l["desc"])}</p></div></a></li>'''
            for l in lessons)
        first, last = lessons[0]["num"], lessons[-1]["num"]
        rng = first if first == last else f"{first}–{last}"
        out.append(f'''      <details class="module card"{" open" if (open_first and si == 0) else ""}>
        <summary>
          <span class="module-num">{si + 1}</span>
          <div class="module-title"><h3>{stage["name"]}</h3><p>{stage["summary"]}</p></div>
          <span class="module-meta"><span class="count-label">{len(lessons)} שיעורים · {rng}</span>
            <span class="chev"><svg viewBox="0 0 24 24">{ICONS["chev"]}</svg></span></span>
        </summary>
        <ol class="lessons">
{items}
        </ol>
      </details>''')
    return "\n".join(out)


def lead_section():
    return f'''<section class="section section-soft" id="lead">
  <div class="container lead-wrap">
    <div class="lead-copy">
      <span class="tag tag-teal">חינם</span>
      <h2 style="margin-top:14px">צ׳ק־ליסט למפרסם — לפני שעולה קמפיין</h2>
      <p>השאירו פרטים וקבלו את הצ׳ק־ליסט החינמי ואת כל הפרטים על הקורס. רשימה ברורה שעוברים עליה לפני העלייה לאוויר.</p>
      <ul class="lead-list">
        <li><i class="check">✓</i>מטרה, קהל ומסר</li>
        <li><i class="check">✓</i>באנרים, לינקים ותיוגי UTM</li>
        <li><i class="check">✓</i>דף נחיתה, Analytics, CRM ולידים</li>
      </ul>
    </div>
    <aside class="lead-panel">
      <h3>רוצים את הצ׳ק ליסט ואת כל הפרטים על הקורס?</h3>
      <p>מלאו פרטים וקבלו גישה לצ׳ק ליסט החינמי ולמידע נוסף על הקורס.</p>
      <div class="lead-mini">
        <svg viewBox="0 0 24 24">{ICONS["play"]}</svg>
        <div><strong>22 שיעורים מסודרים</strong><span>מהמודעה ועד המכירה</span></div>
      </div>
      <form class="lead-form" method="post">
        <label class="sr-only" for="lead-name">שם מלא</label>
        <input id="lead-name" name="name" type="text" autocomplete="name" placeholder="שם מלא" required>
        <label class="sr-only" for="lead-phone">טלפון</label>
        <input id="lead-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="טלפון" required>
        <label class="sr-only" for="lead-email">אימייל</label>
        <input id="lead-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="אימייל" required>
        <button class="btn btn-primary btn-block" type="submit">שלחו לי את הצ׳ק ליסט ואת פרטי הקורס</button>
      </form>
      <div class="lead-note">הפרטים נשמרים לצורך שליחת החומרים בלבד.</div>
    </aside>
  </div>
</section>
'''


# ------------------------------------------------------------------
# עמוד הבית
# ------------------------------------------------------------------

def build_index():
    pains = "\n".join(f'''      <article class="pain card">{icon(i)}<h3>{t}</h3><p>{d}</p></article>''' for i, t, d in PAINS)
    audience = "\n".join(f'''      <article class="audience card">{icon(i)}<h3>{t}</h3><p>{d}</p></article>''' for i, t, d in AUDIENCE)
    steps = "\n".join(
        f'''      <div class="step"><span class="n">{si + 1:02d}</span><h3>{s["name"]}</h3><p>{s["summary"]}</p>'''
        f'''<span class="count">{len(s["lessons"])} שיעורים</span></div>'''
        for si, s in enumerate(STAGES))
    tools = "\n".join(
        f'''      <div class="tool card">{icon(i, "icon" + (" icon-teal" if k % 2 else ""))}<div><h3>{t}</h3><p>{d}</p></div></div>'''
        for k, (i, t, d) in enumerate(TOOLS))
    faq = "\n".join(f'''    <details class="card"><summary>{q}</summary><p>{a}</p></details>''' for q, a in FAQ)

    html = head(f"{COURSE} — קורס דיגיטלי מעשי",
                "קורס דיגיטלי מעשי ב-22 שיעורים: להבין מה איש הפרסום עושה, מה קורה מאחורי הקמפיין, ואיך לנהל את כל המערכת — מהמודעה ועד המכירה.")
    html += header("home")
    html += f'''
<main>
<section class="hero">
  <div class="container hero-inner">
    <div class="hero-copy">
      <span class="tag tag-solid">קורס דיגיטלי מעשי · 22 שיעורים</span>
      <h1 style="margin-top:22px">אל תצאו פראיירים.
        <span class="accent">תבינו מה איש הפרסום עושה, ומה באמת קורה מאחורי הקמפיין</span></h1>
      <p class="hero-intro">איך לנהל את כל המערכת — מהמודעה ועד המכירה. בלי להפוך לאיש מדיה, אבל עם מספיק הבנה כדי לשאול את השאלות הנכונות ולהיות בשליטה על הכסף שלכם.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="{PURCHASE_URL}">להצטרפות לקורס · ₪{PRICE}</a>
        <a class="btn btn-ghost" href="curriculum.html">לתוכנית הלימודים</a>
      </div>
      <div class="hero-stats">
        <div class="stat"><strong>22</strong><span>שיעורים</span></div>
        <div class="stat"><strong>6</strong><span>שלבי למידה</span></div>
        <div class="stat"><strong>8</strong><span>קבצי עבודה</span></div>
        <div class="stat"><strong>{YEARS}</strong><span>שנות ניסיון במדיה</span></div>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head">
      <h2>מכירים את זה?</h2>
      <p>לפעמים בעל העסק מקבל דוח מלא במספרים, ועדיין לא באמת יודע מה קרה עם הכסף שלו.</p>
    </div>
    <div class="pain-grid">
{pains}
    </div>
    <div class="pain-answer">
      <p>הקורס הזה בנוי בדיוק בשביל הנקודה הזאת: <span>להבין מספיק כדי להיות בשליטה.</span></p>
      <a class="btn btn-primary" href="curriculum.html">מה לומדים בקורס?</a>
    </div>
  </div>
</section>

<section class="section section-soft">
  <div class="container board-grid">
    <div>
      <div class="section-head" style="margin-bottom:28px">
        <h2>למי הקורס מיועד?</h2>
      </div>
      <div class="audience-grid audience-grid-2">
{audience}
      </div>
      <div class="benefit-strip">
        <span><i class="check">✓</i>22 שיעורים מסודרים</span>
        <span><i class="check">✓</i>הסברים פשוטים וישימים</span>
        <span><i class="check">✓</i>כלים וקבצי עבודה</span>
      </div>
    </div>
    <div class="products">
      <article class="product card">
        <div class="product-visual course-visual" aria-hidden="true">
          <div class="course-window">
            <div class="window-top"><span></span><span></span><span></span></div>
            <div class="course-screen"><div class="play"></div><div class="course-bars"><i></i><i></i><i></i><i></i><i></i></div></div>
          </div>
          <div class="visual-badge teal start">22 שיעורים</div>
        </div>
        <div class="product-copy">
          <span class="tag tag-teal">הקורס המלא · ₪{PRICE}</span>
          <h3>מהמודעה ועד המכירה</h3>
          <p>יסודות, קהל ותוכן, Meta וגוגל, מדידה, API, אוטומציות, CRM, דשבורדים ופרויקט גמר.</p>
          <a class="link" href="{PURCHASE_URL}">להצטרפות ←</a>
        </div>
      </article>
      <article class="product card">
        <div class="product-visual checklist-visual" aria-hidden="true">
          <div class="check-sheet">
            <div class="sheet-dots"><span></span><span></span><span></span></div>
            <div class="sheet-title">צ׳ק־ליסט</div>
            <div class="sheet-sub">לפני שעולה קמפיין</div>
            <div class="sheet-lines"><i></i><i></i><i></i><i></i></div>
          </div>
          <div class="visual-badge">חינם</div>
        </div>
        <div class="product-copy">
          <span class="tag">צ׳ק ליסט חינמי</span>
          <h3>בדיקה לפני שעולים לאוויר</h3>
          <p>רשימה ברורה שעוברים עליה לפני כל קמפיין — כדי לא לגלות את התקלה אחרי שהתקציב כבר נשרף.</p>
          <a class="link" href="#lead">לקבלת הצ׳ק ליסט ←</a>
        </div>
      </article>
    </div>
  </div>
</section>

<section class="section" id="how">
  <div class="container">
    <div class="section-head">
      <span class="tag">כך לומדים</span>
      <h2>לא קופצים ישר ל-Facebook Ads</h2>
      <p>קודם מבינים מהו קמפיין, מטרות ומספרים. אחר כך קהל, מסר ותוכן — ורק אז נכנסים ל-Meta ולגוגל. אחרי שהקמפיין קיים לומדים למדוד, לחבר מערכות ולנהל.</p>
    </div>
    <div class="flow">
{steps}
    </div>
  </div>
</section>

<section class="section section-soft" id="curriculum">
  <div class="container">
    <div class="section-head">
      <h2>22 שיעורים — מסודרים כמו קורס אמיתי</h2>
      <p>לחצו על שלב כדי לראות את השיעורים שבו.</p>
    </div>
    <div class="modules">
{module_list()}
    </div>
    <div class="center-cta"><a class="btn btn-outline" href="curriculum.html">לתוכנית הלימודים המלאה</a></div>
  </div>
</section>

<section class="section" id="about">
  <div class="container about">
    <div class="about-card">
      <div class="avatar">ע</div>
      <h3>{AUTHOR}</h3>
      <p>מדיה ודיגיטל</p>
      <span class="big" dir="ltr">{YEARS}+</span>
      <p>שנות ניסיון</p>
    </div>
    <div class="about-copy">
      <span class="tag">קצת עליי</span>
      <h2 style="margin-top:14px">אני {AUTHOR}</h2>
      <p>אני עוסק במדיה ובדיגיטל כבר {YEARS} שנים. במהלך השנים יצא לי לראות מקרוב איך קמפיינים נבנים, איך תקציבים מתבזבזים, ואיך לפעמים בעל העסק מקבל דוח מלא במספרים ועדיין לא באמת יודע מה קרה עם הכסף שלו.</p>
      <div class="quote">בניתי את הקורס הזה כדי לא להפוך אותך לאיש מדיה, אלא לגרום לך להבין מספיק כדי לשאול את השאלות הנכונות, לבדוק עבודה מקצועית, לזהות בעיות ולהיות בשליטה על הכסף והנתונים שלך.</div>
    </div>
  </div>
</section>

<section class="section section-soft" id="tools">
  <div class="container">
    <div class="section-head">
      <span class="tag tag-teal">קבצי עבודה</span>
      <h2>ערכת כלים שנשארת איתכם</h2>
      <p>לא רק שיעורים — גם קבצים מוכנים לעבודה אמיתית עם כל קמפיין.</p>
    </div>
    <div class="tools-grid">
{tools}
    </div>
  </div>
</section>

<section class="section" id="price">
  <div class="container pricing">
    <div class="section-head" style="text-align:right;margin:0">
      <h2>להיות בשליטה על הכסף והנתונים שלכם</h2>
      <p>22 שיעורים, ששה שלבים וערכת כלים מלאה — מהשאלה ״מה זה קמפיין?״ ועד מערכת שלמה שעובדת.</p>
    </div>
    <div class="price-card">
      <span class="tag">{COURSE}</span>
      <div class="price">₪{PRICE}<small>תשלום אחד</small></div>
      <ul class="price-list">
        <li><i class="check">✓</i>22 שיעורים בששה שלבים</li>
        <li><i class="check">✓</i>Meta, Google Ads, UTM ו-Analytics</li>
        <li><i class="check">✓</i>API, אוטומציות, CRM ודשבורדים</li>
        <li><i class="check">✓</i>8 קבצי עבודה ופרויקט גמר</li>
      </ul>
      <a class="btn btn-primary btn-block" href="{PURCHASE_URL}">לרכישת הקורס</a>
    </div>
  </div>
</section>

{lead_section()}
<section class="section" id="faq">
  <div class="container">
    <div class="section-head"><h2>שאלות נפוצות</h2></div>
    <div class="faq">
{faq}
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="container">
    <div class="cta-band">
      <h2>אל תצאו פראיירים.</h2>
      <p>לפני שמעלים עוד קמפיין — מבינים מה באמת צריך לעשות.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="{PURCHASE_URL}">להצטרפות לקורס · ₪{PRICE}</a>
        <a class="btn btn-ghost" href="#lead">לצ׳ק ליסט החינמי</a>
      </div>
    </div>
  </div>
</section>
</main>
'''
    html += footer()
    (ROOT / "index.html").write_text(html, encoding="utf-8")


# ------------------------------------------------------------------
# תוכנית הלימודים
# ------------------------------------------------------------------

def build_curriculum():
    html = head(f"תוכנית הלימודים — {COURSE}", "22 שיעורים בששה שלבים: יסודות, קהל ותוכן, פלטפורמות, מדידה, מערכות, וניהול ושליטה.")
    html += header("curriculum")
    html += f'''
<main>
<section class="hero page-hero">
  <div class="container hero-inner">
    <div class="hero-copy">
      <nav class="breadcrumbs"><a href="index.html">הקורס</a><span>/</span><span>תוכנית הלימודים</span></nav>
      <h1>תוכנית הלימודים</h1>
      <p class="hero-intro">22 שיעורים בששה שלבים. כל שלב נבנה על הקודם — כך שכשמגיעים למערכות, כבר מבינים מה עושים בהן ולמה.</p>
    </div>
  </div>
</section>
<section class="section">
  <div class="container">
    <div class="modules">
{module_list(open_first=False).replace("<details class=\"module card\">", "<details class=\"module card\" open>")}
    </div>
  </div>
</section>
{lead_section()}
</main>
'''
    html += footer()
    (ROOT / "curriculum.html").write_text(html, encoding="utf-8")


# ------------------------------------------------------------------
# עמודי שיעור
# ------------------------------------------------------------------

def build_lessons():
    out = ROOT / "lessons"
    out.mkdir(exist_ok=True)
    for i, l in enumerate(LESSONS):
        stage = STAGES[l["stage"]]
        side = []
        for si, s in enumerate(STAGES):
            side.append(f'<li class="stage">{si + 1}. {s["name"]}</li>')
            for x in LESSONS:
                if x["stage"] == si:
                    cur = ' aria-current="page"' if x is l else ""
                    side.append(f'<li><a href="{x["file"]}"{cur}><b>{x["num"]}</b>{escape(x["title"])}</a></li>')
        prev_l = LESSONS[i - 1] if i > 0 else None
        next_l = LESSONS[i + 1] if i < len(LESSONS) - 1 else None
        nav = ""
        if next_l:
            nav += f'<a class="btn btn-primary" href="{next_l["file"]}"><span>השיעור הבא</span>{next_l["num"]}. {escape(next_l["title"])}</a>'
        if prev_l:
            nav += f'<a class="btn btn-outline" href="{prev_l["file"]}"><span>השיעור הקודם</span>{prev_l["num"]}. {escape(prev_l["title"])}</a>'

        html = head(f'{l["num"]}. {l["title"]} — {COURSE}', l["desc"], prefix="../")
        html += header("curriculum", prefix="../")
        html += f'''
<main>
<section class="hero page-hero">
  <div class="container hero-inner">
    <div class="hero-copy">
      <nav class="breadcrumbs"><a href="../curriculum.html">תוכנית הלימודים</a><span>/</span><span>שלב {l["stage"] + 1}: {stage["name"]}</span></nav>
      <span class="tag tag-solid">שיעור {l["num"]} מתוך 22</span>
      <h1 style="margin-top:16px">{escape(l["title"])}</h1>
      <p class="hero-intro">{escape(l["desc"])}</p>
    </div>
  </div>
</section>
<section class="section">
  <div class="container lesson-layout">
    <div>
      <article class="lesson-body card">
        <h2>על השיעור</h2>
        <p>{escape(l["desc"])}</p>
        <!-- כאן נכנס תוכן השיעור: סרטון, טקסט, תרגילים וקבצים -->
        <div class="content-slot"><strong>תוכן השיעור</strong>כאן ייכנסו הסרטון, ההסברים והתרגילים של השיעור.</div>
      </article>
      <div class="lesson-nav">{nav}</div>
    </div>
    <aside class="side card">
      <h3>כל השיעורים</h3>
      <ol>
        {"".join(side)}
      </ol>
    </aside>
  </div>
</section>
</main>
'''
        html += footer(prefix="../")
        (out / l["file"]).write_text(html, encoding="utf-8")


if __name__ == "__main__":
    build_index()
    build_curriculum()
    build_lessons()
    print("נבנו: index.html, curriculum.html ו-22 עמודי שיעור")
