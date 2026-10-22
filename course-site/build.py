#!/usr/bin/env python3
"""
בונה את כל דפי האתר ממקור נתונים אחד.

הרצה:  python3 build.py

מקורות:
  build.py              — הגדרות, מבנה הקורס, עמוד הבית ותבניות
  content/part1-3.py    — התוכן המלא של 22 השיעורים
  content/extras.py     — הצ׳ק־ליסט החינמי, צ׳ק־ליסט QA ומילון המונחים
"""
import re
from html import escape
from pathlib import Path

from content import part1, part2, part3
from content.extras import FREE_CHECKLIST, QA_CHECKLIST, GLOSSARY

ROOT = Path(__file__).parent

# ------------------------------------------------------------------
# הגדרות כלליות — לשנות כאן
# ------------------------------------------------------------------
COURSE = "לא לצאת פראייר בפרסום"
AUTHOR = "עקיבא כהן"
YEARS = 7
PRICE = 500
# קישור לדף התשלום (סליקה). כל עוד ריק — כפתור התשלום מוביל לטופס השארת פרטים.
PAYMENT_URL = ""

CONTENT = {**part1.LESSONS, **part2.LESSONS, **part3.LESSONS}

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
    "calc": '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
    "book": '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
    "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
}


def svg(name):
    return f'<svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[name]}</svg>'


def icon(name, cls="icon"):
    return f'<div class="{cls}">{svg(name)}</div>'


# ------------------------------------------------------------------
# מבנה הקורס: 6 שלבים, 22 שיעורים
# ------------------------------------------------------------------
STAGES = [
    ("יסודות", "compass", "מה זה קמפיין, מה רוצים להשיג, איך קוראים את המספרים וכמה כסף צריך.", [
        ("מה זה בכלל קמפיין?", "לפני שנוגעים בפייסבוק או בגוגל, צריך להבין מה אנחנו בכלל בונים. קמפיין הוא מערכת של החלטות שמחברת בין מטרה עסקית לבין אדם אמיתי."),
        ("מטרות, יעדים ו-KPI", "לומדים להחליט מה אנחנו רוצים להשיג, איך מנסחים יעד מספרי, ואיך יודעים אם קמפיין מצליח באמת."),
        ("המספרים של קמפיין", "CPM, CPC, CTR, CPL, CPA, CVR ו-ROAS — לא רק פירוש המילים, אלא איך מחשבים, קוראים ומאבחנים."),
        ("תקציב וכלכלת קמפיין", "כמה כסף צריך לשים, מהו מחיר ליד מקסימלי, מתי להגדיל תקציב ומתי לעצור."),
    ]),
    ("קהל ותוכן", "users", "למי מדברים, מה אומרים לו, ואיך הופכים את זה לתוכן ולקריאייטיב שעובדים.", [
        ("קהל יעד ומסרים", "איך מפסיקים לפרסם ל״כולם״ ובונים מסר שאדם מסוים באמת רוצה לעצור בשבילו."),
        ("תוכן, כתבות ומדמי תוכן", "איך הופכים מידע למודעה, פוסט, כתבה או דף נחיתה שמובילים את הקורא לפעולה."),
        ("SEO ותוכן שמוצאים בגוגל", "איך לכתוב תוכן שגם אדם מבין וגם מנוע חיפוש יכול להבין ולסווג."),
        ("קריאייטיב, באנרים וסרטונים", "מה מעצב צריך לקבל, כמה גרסאות להכין, איך בודקים קריאייטיב ולמה באנר יפה לא בהכרח מוכר."),
    ]),
    ("פלטפורמות", "layers", "רק עכשיו נכנסים למערכות: הקמת קמפיין אמיתי ב-Meta ובגוגל, צעד אחר צעד.", [
        ("Meta — פייסבוק ואינסטגרם מאפס", "הקמת קמפיין אמיתי ב-Meta: מבנה, מטרה, קהל, תקציב, מודעה, תיוג ובדיקה לפני פרסום."),
        ("Google Ads מאפס", "הקמת קמפיין חיפוש בגוגל: מילות מפתח, קבוצות מודעות, מודעות, תקציב, המרות ומילות מפתח שליליות."),
    ]),
    ("מדידה", "chart", "מאיפה הגיע כל גולש ומה הוא עשה אחרי הקליק.", [
        ("UTM ותיוגים נכונים", "איך לגרום לכל כניסה לאתר לשאת איתה מידע ברור על מקור התנועה, הקמפיין והמודעה."),
        ("Google Analytics — מה קורה אחרי הקליק", "הקמת מדידה, אירועים, אירועי מפתח, בדיקה בזמן אמת וקריאת מקורות תנועה."),
    ]),
    ("מערכות", "plug", "מחברים הכול: API, אוטומציות, CRM ודשבורד אחד שמראה את התמונה המלאה.", [
        ("API וחיבור בין מערכות — מאפס", "מה באמת קורה כשמערכת אחת שולחת מידע לאחרת, ואיך בונים חיבור בלי להיבהל ממילים כמו JSON ו-Webhooks."),
        ("אוטומציות ורובוטים", "איך בונים מסלול שבו ליד נכנס, נרשם, נשלחת הודעה, איש המכירות מקבל משימה והמערכת ממשיכה לעבוד."),
        ("CRM ואיכות לידים", "איך מנהלים לידים, מודדים איכות, מחברים מכירות חזרה לפרסום ומגלים אם הבעיה היא במדיה או במכירות."),
        ("דשבורדים", "איך להפוך נתונים מפוזרים למסך אחד שבעל העסק יכול להבין תוך דקה."),
    ]),
    ("ניהול ושליטה", "gauge", "דוחות, אבחון תקלות, ניהול שוטף, AI — ופרויקט גמר שמחבר הכול.", [
        ("דוחות: מספרים שהופכים להחלטות", "איך כותבים דוח שאומר לא רק מה קרה, אלא מה צריך לעשות מחר בבוקר."),
        ("אבחון קמפיין — למצוא את התקלה", "מתרגלים שרשרת תקלות: אין חשיפות, אין קליקים, אין לידים, אין מכירות, או שהמערכות מציגות מספרים שונים."),
        ("ניהול שוטף ואופטימיזציה", "מה בודקים כל יום, כל שבוע וכל חודש; מתי נוגעים ומתי דווקא לא נוגעים."),
        ("AI ככלי עבודה של איש פרסום", "מחקר, מסרים, תוכן, ניתוח דוחות, רעיונות לקריאייטיב, אוטומציות וכתיבת בריפים — עם תהליך עבודה שלא מסתמך על קסמים."),
        ("פרויקט גמר — מקמפיין למערכת שלמה", "לוקחים עסק אמיתי ומרכיבים עבורו מערכת מלאה: יעד, קהל, מסר, קריאייטיב, מדידה, CRM, אוטומציה ודוח."),
        ("צ׳ק־ליסט למפרסם — לפני שעולה קמפיין", "בדיקת QA מלאה: באנרים, לינקים, תיוגים, כתבות, מדמי תוכן, דפי נחיתה, API, CRM, Analytics, דשבורד ולידים."),
    ]),
]

LESSONS = []
for si, (_, _, _, items) in enumerate(STAGES):
    for title, desc in items:
        n = len(LESSONS) + 1
        LESSONS.append({"n": n, "num": f"{n:02d}", "title": title, "desc": desc, "stage": si,
                        "file": f"lesson-{n:02d}.html", **CONTENT[n]})
assert len(LESSONS) == 22
TOTAL_MIN = sum(l["minutes"] for l in LESSONS)
HOURS = f"{round(TOTAL_MIN / 60, 1):g}"

# ------------------------------------------------------------------
# ערכת הכלים
# ------------------------------------------------------------------
TOOLS = [
    ("brief", "מחולל בריף", "doc", "בריף קריאייטיב בשש שורות — מוכן לשליחה למעצב.", [5, 8]),
    ("budget", "מחשבון תקציב ויעדים", "calc", "מהיעד העסקי ללידים, לתקציב ולמחיר ליד מקסימלי.", [2, 4]),
    ("utm", "מחולל UTM", "tag", "קישורים מתויגים נכון, בלי שגיאות, עם היסטוריה.", [11]),
    ("control", "טבלת בקרה שבועית", "table", "כל המדדים מחושבים אוטומטית, עם סימון חריגות.", [3, 19]),
    ("diagnosis", "אבחון קמפיין", "alert", "מזינים מספרים — ומקבלים איפה זה נתקע ומה לבדוק.", [18]),
    ("dashboard", "דשבורד", "gauge", "תמונת מצב במסך אחד: יעד, משפך וערוצים.", [16]),
    ("report", "מחולל דוח חודשי", "chart", "דוח בעמוד אחד: מספרים, תובנות והחלטות.", [17]),
    ("qa", "צ׳ק־ליסט QA", "check", "45 בדיקות לפני כל השקה, בתשעה תחומים.", [22]),
    ("project", "פרויקט גמר", "flag", "תבנית מודרכת לבניית מערכת שיווק שלמה.", [21]),
]
TOOL_BY_NAME = {"בריף": "brief", "דוח חודשי": "report", "טבלת בקרה": "control", "מחולל UTM": "utm",
                "דשבורד": "dashboard", "אבחון קמפיין": "diagnosis", "פרויקט גמר": "project",
                "צ׳ק־ליסט QA": "qa"}

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

LESSON_FORMAT = [
    ("clock", "קצר וממוקד", f"כל שיעור {min(l['minutes'] for l in LESSONS)}–{max(l['minutes'] for l in LESSONS)} דקות קריאה, מטרה אחת."),
    ("spark", "השורה התחתונה קודם", "העיקר מופיע בהתחלה — הפרטים אחריו."),
    ("users", "דוגמה מהשטח", "מקרה אמיתי עם מספרים."),
    ("alert", "פראייר מול מקצוען", "הטעויות הנפוצות — ומה עושים במקומן."),
    ("check", "משימה למחר בבוקר", "3 צעדים שמיישמים מיד בעסק."),
    ("question", "בדיקה עצמית", "3 שאלות עם הסבר, לוודא שזה נקלט."),
]

FAQ = [
    ("אני מתחיל מאפס. הקורס מתאים לי?",
     "כן. הקורס בנוי בדיוק בשבילך — מתחילים מהשאלה מה זה בכלל קמפיין, ורק אחרי שהיסודות ברורים נכנסים למערכות כמו Meta וגוגל."),
    ("אני לא רוצה לנהל קמפיינים בעצמי. למה לי הקורס?",
     "המטרה היא לא להפוך אותך לאיש מדיה, אלא שתבין מספיק כדי לשאול את השאלות הנכונות, לבדוק את העבודה שנעשית עבורך, לזהות בעיות ולהיות בשליטה על הכסף והנתונים שלך."),
    ("כמה זמן לוקח הקורס?",
     f"22 שיעורים קצרים — בסך הכול כ-{HOURS} שעות קריאה, ועוד זמן ליישום המשימות. אפשר לעבור שיעור ביום ולסיים תוך חודש, או בקצב שלך."),
    ("מה ההבדל בין הצ׳ק ליסט החינמי לקורס?",
     "הצ׳ק ליסט עוזר לא לטעות לפני השקה — 20 בדיקות. הקורס מלמד למה כל בדיקה חשובה, איך לבנות את כל המערכת, ואיך לאבחן ולשפר כשמשהו לא עובד."),
    ("יש חומרי עבודה?",
     "כן. ערכת כלים שעובדת ישירות בדפדפן: מחולל בריף, מחשבון תקציב, מחולל UTM, טבלת בקרה, אבחון קמפיין, דשבורד, מחולל דוח חודשי, צ׳ק־ליסט QA ותבנית פרויקט גמר."),
    ("כמה עולה הקורס?",
     f"{PRICE} ₪, תשלום אחד."),
]

# ------------------------------------------------------------------
# המרת התחביר הקצר של התוכן ל-HTML
# ------------------------------------------------------------------

def inline(s):
    s = escape(s, quote=False)
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)


def md(text):
    out, para, ul, table = [], [], [], []

    def flush():
        if para:
            out.append(f"<p>{inline(' '.join(para))}</p>")
            para.clear()
        if ul:
            out.append("<ul>" + "".join(f"<li>{inline(x)}</li>" for x in ul) + "</ul>")
            ul.clear()
        if table:
            head_row, *rows = table
            out.append('<div class="table-wrap"><table class="data"><thead><tr>' +
                       "".join(f"<th>{inline(c)}</th>" for c in head_row) + "</tr></thead><tbody>" +
                       "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rows) +
                       "</tbody></table></div>")
            table.clear()

    for raw in text.strip().split("\n"):
        line = raw.strip()
        if not line:
            flush()
        elif line.startswith("- "):
            if para or table:
                flush()
            ul.append(line[2:])
        elif line.startswith("|"):
            if para or ul:
                flush()
            table.append([c.strip() for c in line.strip("|").split("|")])
        elif line.startswith("= "):
            flush()
            out.append(f'<div class="formula" dir="auto">{inline(line[2:])}</div>')
        elif line.startswith("! "):
            flush()
            out.append(f'<div class="tip"><b>טיפ</b>{inline(line[2:])}</div>')
        else:
            if ul or table:
                flush()
            para.append(line)
    flush()
    return "\n".join(out)


# ------------------------------------------------------------------
# רכיבים משותפים
# ------------------------------------------------------------------

def head(title, desc, prefix="", body_attr=""):
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
<body{body_attr}>
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
      {link("toolkit.html", "ערכת כלים", "toolkit")}
      {link("checklist.html", "צ׳ק ליסט חינמי", "checklist")}
      <a class="btn btn-primary" href="{prefix}purchase.html">רכישת הקורס · ₪{PRICE}</a>
    </nav>
  </div>
</header>
'''


def footer(prefix="", scripts=()):
    extra = "".join(f'\n<script src="{prefix}{s}"></script>' for s in scripts)
    return f'''<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <a class="logo" href="{prefix}index.html"><span class="logo-mark">✓</span>{COURSE}</a>
      <nav class="footer-links">
        <a href="{prefix}curriculum.html">תוכנית הלימודים</a>
        <a href="{prefix}toolkit.html">ערכת כלים</a>
        <a href="{prefix}checklist.html">צ׳ק ליסט חינמי</a>
        <a href="{prefix}glossary.html">מילון מונחים</a>
        <a href="{prefix}index.html#about">קצת עליי</a>
        <a href="{prefix}index.html#faq">שאלות נפוצות</a>
      </nav>
    </div>
    <div class="copyright">© 2026 {AUTHOR} · {COURSE}</div>
  </div>
</footer>
<script src="{prefix}assets/js/main.js"></script>{extra}
</body>
</html>
'''


def page_hero(title, intro, crumbs=(), tag="", prefix=""):
    bc = ""
    if crumbs:
        parts = [f'<a href="{prefix}{h}">{t}</a>' if h else f"<span>{t}</span>" for t, h in crumbs]
        bc = '<nav class="breadcrumbs">' + "<span>/</span>".join(parts) + "</nav>"
    tg = f'<span class="tag tag-solid">{tag}</span>' if tag else ""
    return f'''<section class="hero page-hero">
  <div class="container hero-inner">
    <div class="hero-copy">
      {bc}{tg}
      <h1{' style="margin-top:16px"' if tag else ''}>{title}</h1>
      <p class="hero-intro">{intro}</p>
    </div>
  </div>
</section>
'''


def module_list(prefix="", open_all=False, open_first=True):
    out = []
    for si, (name, ic, summary, _) in enumerate(STAGES):
        lessons = [l for l in LESSONS if l["stage"] == si]
        items = "\n".join(
            f'''          <li><a class="lesson" data-lesson="{l["n"]}" href="{prefix}lessons/{l["file"]}"><span class="lesson-num">{l["num"]}</span>'''
            f'''<div><h4>{escape(l["title"])}</h4><p>{escape(l["desc"])}</p></div><span class="lesson-min">{l["minutes"]} דק׳</span></a></li>'''
            for l in lessons)
        first, last = lessons[0]["num"], lessons[-1]["num"]
        is_open = open_all or (open_first and si == 0)
        out.append(f'''      <details class="module card"{" open" if is_open else ""}>
        <summary>
          <span class="module-num">{si + 1}</span>
          <div class="module-title"><h3>{name}</h3><p>{summary}</p></div>
          <span class="module-meta"><span class="count-label">{len(lessons)} שיעורים · {first}–{last}</span>
            <span class="chev">{svg("chev")}</span></span>
        </summary>
        <ol class="lessons">
{items}
        </ol>
      </details>''')
    return "\n".join(out)


def lead_section(prefix=""):
    return f'''<section class="section section-soft" id="lead">
  <div class="container lead-wrap">
    <div class="lead-copy">
      <span class="tag tag-teal">חינם</span>
      <h2 style="margin-top:14px">20 פעולות לפני שמעלים קמפיין</h2>
      <p>השאירו פרטים וקבלו את הצ׳ק ליסט החינמי למפרסמים ואת כל הפרטים על הקורס. רשימה ברורה שעוברים עליה לפני העלייה לאוויר — כדי לא לגלות את התקלה אחרי שהתקציב כבר נשרף.</p>
      <ul class="lead-list">
        <li><i class="check">✓</i>מטרה, מספרים ותקציב</li>
        <li><i class="check">✓</i>קהל, מסר, קריאייטיב ודף נחיתה</li>
        <li><i class="check">✓</i>UTM, מדידה וליד בדיקה מקצה לקצה</li>
      </ul>
      <a class="btn btn-outline" href="{prefix}checklist.html" style="margin-top:22px">לצפייה בצ׳ק ליסט</a>
    </div>
    <aside class="lead-panel">
      <h3>רוצים את הצ׳ק ליסט ואת כל הפרטים על הקורס?</h3>
      <p>מלאו פרטים וקבלו גישה לצ׳ק ליסט החינמי ולמידע נוסף על הקורס.</p>
      <div class="lead-mini">
        {svg("play")}
        <div><strong>22 שיעורים + 9 כלי עבודה</strong><span>מהמודעה ועד המכירה</span></div>
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


def price_card(prefix=""):
    return f'''<div class="price-card">
      <span class="tag">{COURSE}</span>
      <div class="price">₪{PRICE}<small>תשלום אחד</small></div>
      <ul class="price-list">
        <li><i class="check">✓</i>22 שיעורים קצרים בששה שלבים</li>
        <li><i class="check">✓</i>Meta, Google Ads, UTM ו-Analytics</li>
        <li><i class="check">✓</i>API, אוטומציות, CRM ודשבורדים</li>
        <li><i class="check">✓</i>9 כלי עבודה + פרויקט גמר</li>
        <li><i class="check">✓</i>משימה ובוחן בכל שיעור</li>
      </ul>
      <a class="btn btn-primary btn-block" href="{prefix}purchase.html">לרכישת הקורס</a>
    </div>'''


def write(path, html):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(html, encoding="utf-8")


# ------------------------------------------------------------------
# עמוד הבית
# ------------------------------------------------------------------

def build_index():
    pains = "\n".join(f'      <article class="pain card">{icon(i)}<h3>{t}</h3><p>{d}</p></article>' for i, t, d in PAINS)
    audience = "\n".join(f'      <article class="audience card">{icon(i)}<h3>{t}</h3><p>{d}</p></article>' for i, t, d in AUDIENCE)
    steps = "\n".join(
        f'      <div class="step"><span class="n">{si + 1:02d}</span><h3>{name}</h3><p>{summary}</p>'
        f'<span class="count">{len(items)} שיעורים</span></div>'
        for si, (name, _, summary, items) in enumerate(STAGES))
    fmt_cards = "\n".join(
        f'      <div class="format card">{icon(i, "icon" + (" icon-teal" if k % 2 else ""))}<div><h3>{t}</h3><p>{d}</p></div></div>'
        for k, (i, t, d) in enumerate(LESSON_FORMAT))
    tools = "\n".join(
        f'      <a class="tool card" href="tools/{slug}.html">{icon(ic, "icon" + (" icon-teal" if k % 2 else ""))}<div><h3>{name}</h3><p>{desc}</p></div></a>'
        for k, (slug, name, ic, desc, _) in enumerate(TOOLS))
    faq = "\n".join(f'    <details class="card"><summary>{q}</summary><p>{a}</p></details>' for q, a in FAQ)

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
        <a class="btn btn-primary" href="purchase.html">להצטרפות לקורס · ₪{PRICE}</a>
        <a class="btn btn-ghost" href="checklist.html">לצ׳ק ליסט החינמי</a>
      </div>
      <div class="hero-stats">
        <div class="stat"><strong>22</strong><span>שיעורים קצרים</span></div>
        <div class="stat"><strong>9</strong><span>כלי עבודה</span></div>
        <div class="stat"><strong dir="ltr">~{HOURS}</strong><span>שעות סה״כ</span></div>
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
        <span><i class="check">✓</i>9 כלי עבודה</span>
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
          <a class="link" href="purchase.html">להצטרפות ←</a>
        </div>
      </article>
      <article class="product card">
        <div class="product-visual checklist-visual" aria-hidden="true">
          <div class="check-sheet">
            <div class="sheet-dots"><span></span><span></span><span></span></div>
            <div class="sheet-title">20 פעולות</div>
            <div class="sheet-sub">לפני שמעלים קמפיין</div>
            <div class="sheet-lines"><i></i><i></i><i></i><i></i></div>
          </div>
          <div class="visual-badge">חינם</div>
        </div>
        <div class="product-copy">
          <span class="tag">צ׳ק ליסט חינמי</span>
          <h3>20 פעולות לפני קמפיין</h3>
          <p>רשימה ברורה שעוברים עליה לפני העלייה לאוויר — מטרה, קהל, קריאייטיב, תקציב ומדידה.</p>
          <a class="link" href="checklist.html">לצ׳ק ליסט ←</a>
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

<section class="section section-soft">
  <div class="container">
    <div class="section-head">
      <span class="tag tag-teal">מבנה כל שיעור</span>
      <h2>תמציתי. מדויק. ליישום מחר בבוקר.</h2>
      <p>כל שיעור בנוי סביב מטרה אחת, ונגמר בצעדים שעושים בעסק — לא בעוד תיאוריה.</p>
    </div>
    <div class="format-grid">
{fmt_cards}
    </div>
  </div>
</section>

<section class="section" id="curriculum">
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

<section class="section section-soft" id="tools">
  <div class="container">
    <div class="section-head">
      <span class="tag tag-teal">ערכת כלים</span>
      <h2>9 כלים שעובדים — לא רק קבצים</h2>
      <p>מחשבונים, מחוללים וצ׳ק־ליסטים שעובדים ישירות בדפדפן, שומרים את מה שהזנתם, ומוכנים להדפסה.</p>
    </div>
    <div class="tools-grid tools-grid-3">
{tools}
    </div>
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

<section class="section section-soft" id="price">
  <div class="container pricing">
    <div class="section-head" style="text-align:right;margin:0">
      <h2>להיות בשליטה על הכסף והנתונים שלכם</h2>
      <p>22 שיעורים, ששה שלבים ו-9 כלי עבודה — מהשאלה ״מה זה קמפיין?״ ועד מערכת שלמה שעובדת.</p>
    </div>
    {price_card()}
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
        <a class="btn btn-primary" href="purchase.html">להצטרפות לקורס · ₪{PRICE}</a>
        <a class="btn btn-ghost" href="checklist.html">לצ׳ק ליסט החינמי</a>
      </div>
    </div>
  </div>
</section>
</main>
'''
    html += footer()
    write("index.html", html)


# ------------------------------------------------------------------
# תוכנית הלימודים
# ------------------------------------------------------------------

def build_curriculum():
    html = head(f"תוכנית הלימודים — {COURSE}", "22 שיעורים בששה שלבים: יסודות, קהל ותוכן, פלטפורמות, מדידה, מערכות, וניהול ושליטה.")
    html += header("curriculum")
    html += "\n<main>\n" + page_hero(
        "תוכנית הלימודים",
        f"22 שיעורים בששה שלבים, כ-{HOURS} שעות בסך הכול. כל שלב נבנה על הקודם — כך שכשמגיעים למערכות, כבר מבינים מה עושים בהן ולמה.",
        crumbs=[("הקורס", "index.html"), ("תוכנית הלימודים", None)])
    html += f'''<section class="section">
  <div class="container">
    <div class="course-progress card">
      <div><strong>ההתקדמות שלך</strong><span><b data-course-progress>0</b> מתוך 22 שיעורים הושלמו</span></div>
      <div class="progress-bar"><i data-course-bar></i></div>
      <a class="btn btn-primary" href="lessons/lesson-01.html">להתחיל מהשיעור הראשון</a>
    </div>
    <div class="modules">
{module_list(open_all=True)}
    </div>
  </div>
</section>
<section class="section section-soft">
  <div class="container">
    <div class="split-cta">
      <a class="card split-item" href="toolkit.html">{icon("calc")}<div><h3>ערכת הכלים</h3><p>9 כלים שמלווים את השיעורים.</p></div></a>
      <a class="card split-item" href="glossary.html">{icon("book", "icon icon-teal")}<div><h3>מילון מונחים</h3><p>כל המושגים במקום אחד, עם קישור לשיעור.</p></div></a>
    </div>
  </div>
</section>
</main>
'''
    html += footer()
    write("curriculum.html", html)


# ------------------------------------------------------------------
# עמודי שיעור
# ------------------------------------------------------------------

def build_lessons():
    for i, l in enumerate(LESSONS):
        stage_name = STAGES[l["stage"]][0]
        side = []
        for si, stage in enumerate(STAGES):
            side.append(f'<li class="stage">{si + 1}. {stage[0]}</li>')
            for x in LESSONS:
                if x["stage"] == si:
                    cur = ' aria-current="page"' if x is l else ""
                    side.append(f'<li><a data-lesson="{x["n"]}" href="{x["file"]}"{cur}><b>{x["num"]}</b>{escape(x["title"])}</a></li>')
        prev_l = LESSONS[i - 1] if i > 0 else None
        next_l = LESSONS[i + 1] if i < len(LESSONS) - 1 else None
        if next_l:
            nav = f'<a class="btn btn-primary" href="{next_l["file"]}"><span>השיעור הבא</span>{next_l["num"]}. {escape(next_l["title"])}</a>'
        else:
            nav = '<a class="btn btn-primary" href="../tools/project.html"><span>סיימתם את הקורס</span>לפרויקט הגמר</a>'
        if prev_l:
            nav += f'<a class="btn btn-outline" href="{prev_l["file"]}"><span>השיעור הקודם</span>{prev_l["num"]}. {escape(prev_l["title"])}</a>'

        outcomes = "".join(f"<li>{inline(o)}</li>" for o in l["outcomes"])
        sections = "\n".join(f'<section class="l-sec"><h2>{inline(h)}</h2>{md(body)}</section>' for h, body in l["sections"])
        ex_title, ex_body = l["example"]
        mistakes = "".join(f'<tr><td>{inline(a)}</td><td>{inline(b)}</td></tr>' for a, b in l["mistakes"])
        tasks = "".join(f'<li><label class="task"><input type="checkbox"><span>{inline(t)}</span></label></li>' for t in l["tasks"])
        quiz = ""
        for qi, (q, opts, ans, why) in enumerate(l["quiz"]):
            o = "".join(f'<button type="button" class="quiz-opt">{inline(x)}</button>' for x in opts)
            quiz += (f'<div class="quiz-q" data-answer="{ans}"><p class="q"><b>{qi + 1}.</b> {inline(q)}</p>'
                     f'<div class="quiz-opts">{o}</div><p class="quiz-why" hidden>{inline(why)}</p></div>')
        tool_box = ""
        if l.get("tool"):
            slug = TOOL_BY_NAME[l["tool"]]
            t = next(t for t in TOOLS if t[0] == slug)
            tool_box = (f'<a class="tool-link card" href="../tools/{slug}.html">{icon(t[2], "icon icon-teal")}'
                        f'<div><span class="tag tag-teal">כלי עבודה לשיעור</span><h3>{t[1]}</h3><p>{t[3]}</p></div></a>')

        html = head(f'{l["num"]}. {l["title"]} — {COURSE}', l["desc"], prefix="../")
        html += header("curriculum", prefix="../")
        html += f'''
<main data-current-lesson="{l["n"]}">
<section class="hero page-hero">
  <div class="container hero-inner">
    <div class="hero-copy">
      <nav class="breadcrumbs"><a href="../curriculum.html">תוכנית הלימודים</a><span>/</span><span>שלב {l["stage"] + 1}: {stage_name}</span></nav>
      <div class="lesson-tags"><span class="tag tag-solid">שיעור {l["num"]} מתוך 22</span><span class="tag tag-ghost">{svg("clock")} {l["minutes"]} דק׳ קריאה</span></div>
      <h1 style="margin-top:16px">{escape(l["title"])}</h1>
      <p class="hero-intro">{inline(l["goal"])}</p>
    </div>
  </div>
</section>
<section class="section lesson-section">
  <div class="container lesson-layout">
    <div class="lesson-main">
      <div class="l-top">
        <div class="outcomes card"><h3>בסוף השיעור תדעו</h3><ul class="checks">{outcomes}</ul></div>
        <div class="core"><span>השורה התחתונה</span><p>{inline(l["core"])}</p></div>
      </div>
      <article class="lesson-body card">
{sections}
        <section class="l-sec example"><span class="tag tag-teal">דוגמה מהשטח</span><h2>{inline(ex_title)}</h2>{md(ex_body)}</section>
        <section class="l-sec"><h2>פראייר מול מקצוען</h2>
          <div class="table-wrap"><table class="data vs"><thead><tr><th>✕ פראייר</th><th>✓ מקצוען</th></tr></thead><tbody>{mistakes}</tbody></table></div>
        </section>
      </article>
      <section class="tasks card"><span class="tag">משימה למחר בבוקר</span><h2>3 צעדים ליישום</h2><ol class="task-list">{tasks}</ol></section>
      {tool_box}
      <section class="quiz card"><span class="tag">בדיקה עצמית</span><h2>3 שאלות</h2>{quiz}<p class="quiz-score" data-quiz-score hidden></p></section>
      <div class="complete-row"><button type="button" class="btn btn-outline complete-btn" data-complete>סיימתי את השיעור</button></div>
      <div class="lesson-nav">{nav}</div>
    </div>
    <aside class="side card">
      <h3>כל השיעורים</h3>
      <div class="side-progress"><span><b data-course-progress>0</b>/22 הושלמו</span><div class="progress-bar"><i data-course-bar></i></div></div>
      <ol>
        {"".join(side)}
      </ol>
    </aside>
  </div>
</section>
</main>
'''
        html += footer(prefix="../")
        write(f"lessons/{l['file']}", html)


# ------------------------------------------------------------------
# צ׳ק ליסט חינמי
# ------------------------------------------------------------------

def build_checklist():
    groups = ""
    k = 0
    for gi, (name, ic, items) in enumerate(FREE_CHECKLIST):
        rows = ""
        for title, why in items:
            k += 1
            rows += (f'<label class="check-item" for="c{k}"><input type="checkbox" id="c{k}">'
                     f'<span><strong><em>{k:02d}</em> {inline(title)}</strong><span>{inline(why)}</span></span></label>')
        groups += (f'<section class="check-group card" data-group>'
                   f'<div class="check-group-head">{icon(ic, "icon" + (" icon-teal" if gi % 2 else ""))}'
                   f'<div><h2>{name}</h2><p><span data-group-count></span> בוצעו</p></div></div>{rows}</section>\n')

    html = head(f"צ׳ק ליסט חינמי למפרסמים — 20 פעולות לפני קמפיין | {COURSE}",
                "20 בדיקות שחייבים לעשות לפני שמעלים קמפיין בדיגיטל: מטרה, קהל, קריאייטיב, תקציב ומדידה.",
                body_attr=' data-tool="free"')
    html += header("checklist")
    html += "\n<main>\n" + page_hero(
        "20 פעולות לפני שמעלים קמפיין",
        "הצ׳ק ליסט החינמי למפרסמים. עוברים עליו לפני כל השקה — מסמנים, ומשיקים רק כשהכול מסומן. הסימונים נשמרים בדפדפן שלכם.",
        crumbs=[("הקורס", "index.html"), ("צ׳ק ליסט חינמי", None)], tag="חינם")
    html += f'''<section class="section">
  <div class="container checklist-layout">
    <div>
{groups}
    </div>
    <aside class="progress-card card">
      <h3>ההתקדמות שלכם</h3>
      <p data-progress-msg></p>
      <div class="progress-value"><span data-progress-count>0</span><small>/<span data-progress-total>20</span></small></div>
      <div class="progress-bar"><i data-progress-bar></i></div>
      <button class="btn btn-outline btn-block no-print" type="button" data-print>הדפסה / שמירה כ-PDF</button>
      <button class="reset no-print" type="button" data-reset>איפוס הסימונים</button>
      <div class="upsell no-print">
        <strong>רוצים להבין למה כל בדיקה חשובה?</strong>
        <p>בקורס המלא: 22 שיעורים, 9 כלי עבודה, וצ׳ק־ליסט QA מורחב של 45 בדיקות.</p>
        <a class="btn btn-primary btn-block" href="purchase.html">לקורס המלא · ₪{PRICE}</a>
      </div>
    </aside>
  </div>
</section>
{lead_section()}
</main>
'''
    html += footer(scripts=["assets/js/tools.js"])
    write("checklist.html", html)


# ------------------------------------------------------------------
# ערכת כלים
# ------------------------------------------------------------------

def field(name, label, kind="text", ph="", hint="", full=False, rows=3, value=""):
    cls = "field" + (" full" if full else "")
    h = f'<small>{hint}</small>' if hint else ""
    if kind == "textarea":
        inp = f'<textarea name="{name}" rows="{rows}" placeholder="{escape(ph)}"></textarea>'
    elif kind == "number":
        v = f' value="{value}"' if value != "" else ""
        inp = f'<input name="{name}" type="text" inputmode="decimal" placeholder="{escape(ph)}"{v}>'
    else:
        inp = f'<input name="{name}" type="text" placeholder="{escape(ph)}">'
    return f'<label class="{cls}"><span>{label}</span>{inp}{h}</label>'


def tool_actions(*btns):
    labels = {"copy": ("data-copy", "העתקה"), "print": ("data-print", "הדפסה / PDF"),
              "reset": ("data-reset", "ניקוי"), "save": ("data-save", "שמירה להיסטוריה"),
              "export": ("data-export", "ייצוא לאקסל (CSV)"), "add": ("data-add", "+ הוספת שבוע")}
    return '<div class="tool-actions no-print">' + "".join(
        f'<button type="button" class="btn {"btn-primary" if b in ("copy", "save", "add") else "btn-outline"}" {labels[b][0]}>{labels[b][1]}</button>'
        for b in btns) + "</div>"


def tool_body(slug):
    if slug == "brief":
        return f'''<div class="tool-grid">
  <form id="tool-form" class="tool-form card" autocomplete="off">
    {field("business", "עסק / מוצר", ph="סטודיו לפילאטיס בחיפה")}
    {field("goal", "מטרת הקמפיין", ph="לידים לשיעור ניסיון")}
    {field("audience", "קהל", "textarea", "נשים 30–55, עבודה משרדית, כאבי גב", rows=2, full=True)}
    {field("pain", "הכאב — במילים של הלקוח", "textarea", "״כל ערב הגב הורג אותי ואין לי כוח לחדר כושר״", rows=2, full=True)}
    {field("message", "מסר מרכזי (משפט אחד)", ph="גב חזק ב-2 שיעורים בשבוע — בלי לקפוץ ובלי להזיע", full=True)}
    {field("proof", "הוכחה", ph="400 מתאמנות, דירוג 4.9 בגוגל")}
    {field("offer", "ההצעה", ph="שיעור ניסיון ב-29 ₪ + אבחון יציבה")}
    {field("cta", "קריאה לפעולה", ph="לקביעת שיעור ניסיון")}
    {field("deadline", "דדליין", ph="יום ה׳ 12:00")}
    {field("angles", "זוויות לבדיקה (אחת בכל שורה)", "textarea", "כאבי גב\nאחרי לידה\nאף פעם לא התאמנתי", rows=3, full=True)}
    <fieldset class="field full"><span>פורמטים</span><div class="chips-row">
      <label><input type="checkbox" name="f_1_1" checked> 1:1</label><label><input type="checkbox" name="f_4_5" checked> 4:5</label>
      <label><input type="checkbox" name="f_9_16" checked> 9:16</label><label><input type="checkbox" name="f_16_9"> 16:9</label></div></fieldset>
    {field("must", "חובה", ph="לוגו בסוף, צבעי המותג, כתוביות")}
    {field("avoid", "אסור", ph="תמונות ״לפני ואחרי״, הבטחות רפואיות")}
  </form>
  <div class="tool-out">
    <div class="doc card" id="brief-out"></div>
    {tool_actions("copy", "print", "reset")}
  </div>
</div>'''
    if slug == "budget":
        return f'''<div class="tool-grid">
  <form id="tool-form" class="tool-form card" autocomplete="off">
    {field("customers", "כמה לקוחות חדשים צריך?", "number", "30", "בתקופה אחת (לרוב חודש)", value="30")}
    {field("close", "אחוז סגירה מליד ללקוח (%)", "number", "20", "מכל 100 לידים, כמה נהיים לקוחות?", value="20")}
    {field("profit", "רווח גולמי מלקוח (₪)", "number", "900", "אחרי עלות המוצר / השירות", value="900")}
    {field("cpl", "עלות צפויה לליד (₪)", "number", "60", "מניסיון קודם או הערכה", value="60")}
    {field("days", "מספר ימים", "number", "30", value="30")}
  </form>
  <div class="tool-out"><div class="card result-card" id="budget-out"></div>{tool_actions("print", "reset")}</div>
</div>'''
    if slug == "utm":
        src = "".join(f'<option value="{v}">{t}</option>' for v, t in [
            ("facebook", "facebook"), ("instagram", "instagram"), ("google", "google"), ("tiktok", "tiktok"),
            ("youtube", "youtube"), ("newsletter", "newsletter"), ("whatsapp", "whatsapp"), ("other", "אחר…")])
        med = "".join(f'<option value="{v}">{t}</option>' for v, t in [
            ("paid_social", "paid_social — רשתות ממומן"), ("cpc", "cpc — חיפוש ממומן"), ("display", "display — באנרים"),
            ("email", "email — דיוור"), ("social", "social — אורגני"), ("referral", "referral — הפניה"), ("other", "אחר…")])
        return f'''<div class="tool-grid">
  <form id="tool-form" class="tool-form card" autocomplete="off">
    <label class="field full"><span>כתובת הדף</span><input name="url" type="url" dir="ltr" placeholder="https://site.co.il/offer"></label>
    <label class="field"><span>מקור (utm_source)</span><select name="source">{src}</select></label>
    <label class="field" data-other="source" hidden><span>מקור אחר</span><input name="source_other" dir="ltr"></label>
    <label class="field"><span>ערוץ (utm_medium)</span><select name="medium">{med}</select></label>
    <label class="field" data-other="medium" hidden><span>ערוץ אחר</span><input name="medium_other" dir="ltr"></label>
    <label class="field"><span>קמפיין (utm_campaign)</span><input name="campaign" dir="ltr" placeholder="spring_sale_2026"></label>
    <label class="field"><span>מודעה (utm_content)</span><input name="content" dir="ltr" placeholder="video_testimonial_a"></label>
    <label class="field full"><span>מילת מפתח (utm_term)</span><input name="term" dir="ltr" placeholder="לא חובה"></label>
  </form>
  <div class="tool-out">
    <div class="card result-card">
      <label class="field full"><span>הקישור המתויג</span><textarea id="utm-out" rows="4" dir="ltr" readonly></textarea></label>
      <p id="utm-missing" class="verdict warn">חובה למלא מקור, ערוץ וקמפיין.</p>
      <ul id="utm-warn" class="warn-list"></ul>
      <p class="muted small">חוקים: אותיות קטנות, בלי רווחים, באנגלית. ב-Meta אפשר להשתמש בפרמטרים דינמיים כמו {{{{campaign.name}}}}.</p>
    </div>
    {tool_actions("copy", "save", "reset")}
  </div>
</div>
<section class="card history">
  <div class="history-head"><h3>היסטוריית קישורים</h3>{tool_actions("export")}</div>
  <div class="table-wrap"><table class="data"><thead><tr><th>תאריך</th><th>שם</th><th>קישור</th><th></th></tr></thead><tbody id="utm-history"></tbody></table></div>
</section>'''
    if slug == "control":
        return f'''<form id="targets" class="card targets" autocomplete="off">
  <h3>יעדים</h3>
  {field("cpl", "יעד עלות לליד (₪)", "number", "60")}
  {field("cpa", "יעד עלות ללקוח (₪)", "number", "300")}
  {field("roas", "יעד ROAS", "number", "3")}
</form>
<section class="card control-wrap">
  <div class="table-wrap"><table class="data control"><thead id="ctrl-head"></thead><tbody id="ctrl-body"></tbody></table></div>
  <p class="muted small legend"><span class="up">ירוק</span> = שיפור של 20%+ מהשבוע הקודם או עמידה ביעד · <span class="down">אדום</span> = הרעה של 20%+ או חריגה מהיעד</p>
  {tool_actions("add", "export", "print", "reset")}
</section>'''
    if slug == "diagnosis":
        return f'''<div class="tool-grid">
  <form id="tool-form" class="tool-form card" autocomplete="off">
    <h3 class="full">המספרים (שבוע אחרון)</h3>
    {field("spend", "הוצאה (₪)", "number", "3000")}
    {field("imp", "חשיפות", "number", "120000")}
    {field("clicks", "קליקים", "number", "1200")}
    {field("leads", "לידים", "number", "45")}
    {field("contacted", "לידים שנוצר איתם קשר", "number", "30")}
    {field("customers", "לקוחות", "number", "4")}
    <details class="full thresholds"><summary>ספים (אפשר לשנות לפי הענף שלכם)</summary>
      <div class="tool-form-inner">
      {field("th_ctr", "CTR מינימלי (%)", "number", value="0.8")}
      {field("th_cvr", "המרה בדף מינימלית (%)", "number", value="5")}
      {field("th_contact", "יצירת קשר מינימלית (%)", "number", value="70")}
      {field("th_close", "סגירה מינימלית מתוך שיחות (%)", "number", value="10")}
      </div>
    </details>
  </form>
  <div class="tool-out"><div class="card result-card" id="diag-out"></div>{tool_actions("print", "reset")}</div>
</div>'''
    if slug == "dashboard":
        ch = ""
        for key, name in [("meta", "Meta"), ("google", "Google"), ("other", "אחר / אורגני")]:
            ch += (f'<fieldset class="ch full"><div class="ch-name">{name}</div>'
                   f'{field(key + "_spend", "הוצאה ₪", "number")}{field(key + "_leads", "לידים", "number")}'
                   f'{field(key + "_customers", "לקוחות", "number")}{field(key + "_revenue", "הכנסות ₪", "number")}</fieldset>')
        return f'''<form id="tool-form" class="tool-form card dash-form" autocomplete="off">
  {field("period", "תקופה", ph="אוקטובר 2026")}
  {field("goal_revenue", "יעד הכנסות (₪)", "number")}
  {field("goal_customers", "יעד לקוחות", "number")}
  {field("goal_cpa", "יעד עלות ללקוח (₪)", "number")}
  {field("imp", "חשיפות (סה״כ)", "number")}
  {field("clicks", "קליקים (סה״כ)", "number")}
  {field("relevant", "לידים רלוונטיים (מה-CRM)", "number")}
  {ch}
</form>
<div class="card result-card dash" id="dash-out"></div>
{tool_actions("print", "reset")}'''
    if slug == "report":
        dec = "".join(
            f'<div class="dec-row full">{field(f"d{i}", f"החלטה {i}")}{field(f"o{i}", "אחראי")}{field(f"t{i}", "עד מתי")}</div>'
            for i in range(1, 6))
        return f'''<div class="tool-grid">
  <form id="tool-form" class="tool-form card" autocomplete="off">
    {field("month", "חודש", ph="אוקטובר 2026")}
    {field("client", "עסק / לקוח")}
    {field("spend", "הוצאה (₪)", "number")}
    {field("leads", "לידים", "number")}
    {field("customers", "לקוחות", "number")}
    {field("goal_customers", "יעד לקוחות", "number")}
    {field("revenue", "הכנסות (₪)", "number", full=True)}
    {field("summary", "שורה תחתונה (לא חובה — נכתבת אוטומטית)", "textarea", full=True, rows=2)}
    {field("worked", "מה עבד (שורה לכל נקודה)", "textarea", full=True)}
    {field("failed", "מה לא עבד", "textarea", full=True)}
    {field("insights", "למה — תובנות", "textarea", full=True)}
    {dec}
  </form>
  <div class="tool-out"><div class="doc card" id="report-out"></div>{tool_actions("copy", "print", "reset")}</div>
</div>'''
    if slug == "qa":
        groups, k = "", 0
        for gi, (name, items) in enumerate(QA_CHECKLIST):
            rows = ""
            for t in items:
                k += 1
                rows += f'<label class="check-item" for="q{k}"><input type="checkbox" id="q{k}"><span><strong>{inline(t)}</strong></span></label>'
            groups += (f'<section class="check-group card" data-group><div class="check-group-head"><span class="module-num">{gi + 1}</span>'
                       f'<div><h2>{name}</h2><p><span data-group-count></span></p></div></div>{rows}</section>\n')
        return f'''<div class="checklist-layout">
  <div>
    <form id="qa-meta" class="card tool-form qa-meta" autocomplete="off">
      {field("campaign", "קמפיין")}{field("builder", "מי בנה")}{field("checker", "מי בדק")}{field("date", "תאריך השקה")}
    </form>
{groups}
  </div>
  <aside class="progress-card card">
    <h3>מוכנות להשקה</h3>
    <p data-progress-msg></p>
    <div class="progress-value"><span data-progress-count>0</span><small>/<span data-progress-total></span></small></div>
    <div class="progress-bar"><i data-progress-bar></i></div>
    <button class="btn btn-outline btn-block no-print" type="button" data-print>הדפסה / שמירה כ-PDF</button>
    <button class="reset no-print" type="button" data-reset>איפוס</button>
  </aside>
</div>'''
    if slug == "project":
        stages = [
            ("יעד ומספרים", "02, 04", [("p_goal", "היעד: מה + כמה + עד מתי"), ("p_math", "חישוב לאחור: לקוחות ← לידים ← תקציב"), ("p_kpi", "KPI ראשי + מחיר ליד מקסימלי ויעד CPL")]),
            ("קהל והצעה", "05", [("p_persona", "פרופיל לקוח: מי, מה כואב (ציטוטים), מה מפחיד"), ("p_offer", "ההצעה: מה מקבלים + למה עכשיו + מה מוריד סיכון"), ("p_angles", "3 זוויות למודעות")]),
            ("תוכן ודף נחיתה", "06, 07", [("p_page", "דף הנחיתה: כותרת, יתרונות, הוכחה, טופס, שאלות"), ("p_check7", "אילו מ-7 הרכיבים חסרים ואיך משלימים")]),
            ("קריאייטיב", "08", [("p_brief", "בריף בשש שורות (או קישור לבריף מהמחולל)"), ("p_creatives", "רשימת 3–5 קריאייטיבים ופורמטים")]),
            ("מדידה", "11, 12", [("p_utm", "שיטת UTM: source / medium / campaign"), ("p_events", "אירוע מפתח + פיקסל/API + תוצאת ליד בדיקה")]),
            ("מערכות", "13–15", [("p_flow", "זרימת ליד: מקור ← CRM ← הודעה ← איש מכירות"), ("p_crm", "סטטוסים ושדות חובה ב-CRM")]),
            ("השקה", "09, 10, 22", [("p_campaign", "מבנה הקמפיין: פלטפורמה, מטרה, קבוצות, מודעות, תקציב"), ("p_qa", "צ׳ק־ליסט QA הושלם? מי בדק, מתי")]),
            ("בקרה ו-30 יום", "16–19", [("p_routine", "רוטינה: מה בודקים יומי / שבועי / חודשי, ומי"), ("p_results", "תוצאות אחרי 30 יום"), ("p_decisions", "3–5 החלטות להמשך")]),
        ]
        out = ""
        for si, (name, lessons, fields) in enumerate(stages):
            f = "".join(field(n, lbl, "textarea", full=True, rows=3) for n, lbl in fields)
            out += (f'<section class="card project-stage" data-stage><div class="check-group-head"><span class="module-num">{si + 1}</span>'
                    f'<div><h2>{name}</h2><p>שיעורים {lessons} · <span data-group-count></span></p></div></div><div class="tool-form-inner">{f}</div></section>\n')
        return f'''<div class="checklist-layout">
  <form id="tool-form" autocomplete="off">
    <section class="card project-stage"><div class="tool-form-inner">{field("p_business", "העסק", ph="שם העסק ומה הוא מוכר")}{field("p_launch", "תאריך השקה", ph="1.12.2026")}</div></section>
{out}
  </form>
  <aside class="progress-card card">
    <h3>התקדמות בפרויקט</h3>
    <p>מלאו שלב אחר שלב. הכול נשמר בדפדפן.</p>
    <div class="progress-value"><span data-progress-count>0</span><small>/<span data-progress-total></span></small></div>
    <div class="progress-bar"><i data-progress-bar></i></div>
    <button class="btn btn-outline btn-block no-print" type="button" data-print>הדפסה / שמירה כ-PDF</button>
    <button class="reset no-print" type="button" data-reset>ניקוי</button>
  </aside>
</div>'''
    raise ValueError(slug)


TOOL_INTRO = {
    "brief": "ממלאים את השדות — והבריף נבנה תוך כדי, מוכן להעתקה או להדפסה. עוזר לקבל קריאייטיב טוב בסבב אחד.",
    "budget": "מזינים יעד, אחוז סגירה ורווח מלקוח — ומקבלים כמה לידים ותקציב צריך, ומה מחיר הליד המקסימלי שמותר לשלם.",
    "utm": "בונים קישור מתויג נכון — המחולל מתקן אותיות גדולות, רווחים ועברית, ושומר היסטוריה שאפשר לייצא לאקסל.",
    "control": "מזינים פעם בשבוע 7 מספרים מהפלטפורמה ומה-CRM — וכל המדדים מחושבים, עם סימון של שינויים חריגים ויעדים.",
    "diagnosis": "מזינים את המספרים של הקמפיין — והכלי עובר על המשפך לפי הסדר, מוצא את השלב החריג הראשון ואומר מה לבדוק.",
    "dashboard": "מסך אחד שבעל העסק מבין תוך דקה: תוצאה מול יעד, משפך, והשוואת ערוצים לפי עלות ללקוח.",
    "report": "דוח חודשי בחמישה חלקים, בעמוד אחד: שורה תחתונה, מספרים מול יעד, מה עבד, תובנות והחלטות עם אחראי.",
    "qa": "45 בדיקות בתשעה תחומים — עוברים על כולן לפני כל השקה. עין שנייה בודקת, וחותמים.",
    "project": "תבנית מודרכת בשמונה שלבים לבניית מערכת שיווק שלמה לעסק אמיתי — מהיעד ועד דוח 30 יום.",
}


def build_tools():
    cards = "\n".join(
        f'''      <a class="tool card" href="tools/{slug}.html">{icon(ic, "icon" + (" icon-teal" if k % 2 else ""))}<div><h3>{name}</h3><p>{desc}</p>'''
        f'''<small class="muted">שיעורים {", ".join(f"{x:02d}" for x in ls)}</small></div></a>'''
        for k, (slug, name, ic, desc, ls) in enumerate(TOOLS))
    html = head(f"ערכת כלים — {COURSE}", "9 כלי עבודה למפרסמים: מחולל בריף, מחשבון תקציב, UTM, טבלת בקרה, אבחון, דשבורד, דוח חודשי, QA ופרויקט גמר.")
    html += header("toolkit")
    html += "\n<main>\n" + page_hero(
        "ערכת הכלים",
        "9 כלים שעובדים ישירות בדפדפן — בלי הרשמה ובלי להוריד קבצים. מה שאתם מזינים נשמר אצלכם במחשב, ואפשר להדפיס או לשמור כ-PDF.",
        crumbs=[("הקורס", "index.html"), ("ערכת כלים", None)])
    html += f'''<section class="section"><div class="container"><div class="tools-grid tools-grid-3">
{cards}
</div></div></section>
</main>
'''
    html += footer()
    write("toolkit.html", html)

    for slug, name, ic, desc, ls in TOOLS:
        lesson_links = " · ".join(f'<a href="../lessons/lesson-{x:02d}.html">שיעור {x:02d}</a>' for x in ls)
        html = head(f"{name} — {COURSE}", desc, prefix="../", body_attr=f' data-tool="{slug}"')
        html += header("toolkit", prefix="../")
        html += "\n<main>\n" + page_hero(name, TOOL_INTRO[slug],
                                        crumbs=[("ערכת כלים", "toolkit.html")], prefix="../", tag="כלי עבודה")
        html += f'''<section class="section tool-section">
  <div class="container">
    <p class="tool-lessons no-print">{svg("book")} נלמד ב: {lesson_links}</p>
{tool_body(slug)}
  </div>
</section>
</main>
'''
        html += footer(prefix="../", scripts=["assets/js/tools.js"])
        write(f"tools/{slug}.html", html)


# ------------------------------------------------------------------
# עמוד רכישה
# ------------------------------------------------------------------

def build_purchase():
    if PAYMENT_URL:
        pay = f'<a class="btn btn-primary btn-block" href="{PAYMENT_URL}">לתשלום מאובטח · ₪{PRICE}</a>'
    else:
        pay = (f'<a class="btn btn-primary btn-block" href="#lead">להרשמה לקורס · ₪{PRICE}</a>'
               '<p class="muted small" style="margin-top:10px;text-align:center">השאירו פרטים ונחזור אליכם עם קישור לתשלום וגישה לקורס.</p>')
    stages = "".join(
        f'<li><span class="module-num">{si + 1}</span><div><b>{name}</b><span>{len(items)} שיעורים · {summary}</span></div></li>'
        for si, (name, _, summary, items) in enumerate(STAGES))
    tools = "".join(f'<li><i class="check">✓</i>{name}</li>' for _, name, *_ in TOOLS)
    fmt_cards = "".join(f'<div class="format">{icon(i)}<div><h3>{t}</h3><p>{d}</p></div></div>' for i, t, d in LESSON_FORMAT)
    faq = "\n".join(f'    <details class="card"><summary>{q}</summary><p>{a}</p></details>' for q, a in FAQ)
    html = head(f"רכישת הקורס — {COURSE}", f"הקורס המלא: 22 שיעורים, 9 כלי עבודה ופרויקט גמר. ₪{PRICE}, תשלום אחד.")
    html += header("purchase")
    html += "\n<main>\n" + page_hero(
        "הקורס המלא",
        "22 שיעורים תמציתיים, 9 כלי עבודה ופרויקט גמר — כדי שמחר בבוקר תדעו מה לבקש, מה לבדוק ואיך להפוך פרסום לכסף.",
        crumbs=[("הקורס", "index.html"), ("רכישה", None)])
    html += f'''<section class="section">
  <div class="container purchase">
    <div class="purchase-main">
      <section class="card p-block"><h2>מה מקבלים</h2>
        <ol class="stage-list">{stages}</ol>
      </section>
      <section class="card p-block"><h2>9 כלי עבודה</h2><ul class="tool-checks">{tools}</ul></section>
      <section class="card p-block"><h2>בכל שיעור</h2>
        <div class="format-grid format-grid-2">{fmt_cards}</div>
      </section>
    </div>
    <aside class="purchase-side">
      <div class="price-card">
        <span class="tag">{COURSE}</span>
        <div class="price">₪{PRICE}<small>תשלום אחד</small></div>
        <ul class="price-list">
          <li><i class="check">✓</i>22 שיעורים · כ-{HOURS} שעות</li>
          <li><i class="check">✓</i>9 כלי עבודה בדפדפן</li>
          <li><i class="check">✓</i>צ׳ק־ליסט QA של 45 בדיקות</li>
          <li><i class="check">✓</i>פרויקט גמר מודרך</li>
          <li><i class="check">✓</i>לומדים בקצב שלכם</li>
        </ul>
        {pay}
      </div>
      <a class="card mini-link" href="lessons/lesson-01.html">{icon("play", "icon icon-teal")}<div><b>לא בטוחים?</b><span>קראו את השיעור הראשון</span></div></a>
    </aside>
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
</main>
'''
    html += footer()
    write("purchase.html", html)


# ------------------------------------------------------------------
# מילון מונחים
# ------------------------------------------------------------------

def build_glossary():
    items = sorted(GLOSSARY, key=lambda g: g[0].lower())
    rows = "\n".join(
        f'<div class="term card"><h3 dir="auto">{escape(t)}</h3><p>{inline(d)}</p>'
        f'<a href="lessons/lesson-{n:02d}.html">שיעור {n:02d} ←</a></div>'
        for t, d, n in items)
    html = head(f"מילון מונחים — {COURSE}", "כל המונחים של עולם הפרסום בדיגיטל, בהסבר של משפט אחד.")
    html += header("glossary")
    html += "\n<main>\n" + page_hero(
        "מילון מונחים",
        f"{len(items)} מונחים שכל מפרסם צריך להכיר — כל אחד במשפט אחד, עם קישור לשיעור שבו הוא מוסבר לעומק.",
        crumbs=[("הקורס", "index.html"), ("מילון מונחים", None)])
    html += f'''<section class="section">
  <div class="container">
    <label class="glossary-search"><span class="sr-only">חיפוש מונח</span><input type="search" placeholder="חיפוש מונח… (CPC, UTM, ליד)" oninput="var q=this.value.toLowerCase();document.querySelectorAll('.term').forEach(function(t){{t.hidden=q&&t.textContent.toLowerCase().indexOf(q)<0}})"></label>
    <div class="glossary">
{rows}
    </div>
  </div>
</section>
</main>
'''
    html += footer()
    write("glossary.html", html)


if __name__ == "__main__":
    build_index()
    build_curriculum()
    build_lessons()
    build_checklist()
    build_tools()
    build_purchase()
    build_glossary()
    print(f"נבנו: index, curriculum, checklist, toolkit + {len(TOOLS)} כלים, purchase, glossary ו-22 שיעורים ({TOTAL_MIN} דקות קריאה)")
