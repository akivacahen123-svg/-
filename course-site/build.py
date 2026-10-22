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
# קוד הגישה לקורס. אחרי תשלום מפנים את הקונה ל: welcome.html?code=<הקוד>
# (או שולחים לו את הקוד במייל, והוא מזין אותו באתר). כדי להחליף קוד — משנים כאן ומריצים שוב.
ACCESS_CODE = "NF26-PRO"
# כתובת האתר המלאה (עם / בסוף) — משמשת ל-SEO (canonical, sitemap) ולקישורים מדף הנחיתה.
SITE_URL = "https://lp.kore.co.il/not-frayer11/"
# פרטי קשר — מופיעים בהצהרת הנגישות, בתנאי השימוש ובמדיניות הפרטיות. חובה למלא לפני עלייה לאוויר.
CONTACT_EMAIL = ""
CONTACT_PHONE = ""
# מדידה. ריק = לא נטען כלום ולא מוצג באנר עוגיות. כשממלאים — הקוד נטען רק אחרי הסכמת הגולש.
GA4_ID = ""          # למשל G-XXXXXXX
META_PIXEL_ID = ""   # למשל 1234567890
LEGAL_UPDATED = "אוקטובר 2026"

CONTENT = {**part1.LESSONS, **part2.LESSONS, **part3.LESSONS}


def fnv1a(text):
    """גיבוב קצר של קוד הגישה (זהה לפונקציה ב-main.js), כדי שהקוד עצמו לא יופיע בעמודים."""
    h = 0x811C9DC5
    for b in text.strip().upper().encode("utf-8"):
        h = ((h ^ b) * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


ACCESS_HASH = fnv1a(ACCESS_CODE)

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
    "lock": '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    "a11y": '<circle cx="12" cy="4.5" r="2"/><path d="M4 8.5c2.6.8 5.3 1.2 8 1.2s5.4-.4 8-1.2M12 9.7V15m0 0-3.5 6M12 15l3.5 6"/>',
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

def head(title, desc, prefix="", body_attr="", gated=False, ld=(), noindex=False):
    import json
    ld_html = "".join(f'\n  <script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in ld)
    robots = '\n  <meta name="robots" content="noindex, follow">' if noindex else ""
    return f'''<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(title)}</title>
  <meta name="description" content="{escape(desc)}">
  <link rel="canonical" href="__CANONICAL__">{robots}
  <meta name="theme-color" content="#10253b">
  <link rel="icon" href="{prefix}assets/img/favicon.svg" type="image/svg+xml">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="he_IL">
  <meta property="og:site_name" content="{COURSE}">
  <meta property="og:url" content="__CANONICAL__">
  <meta property="og:title" content="{escape(title)}">
  <meta property="og:description" content="{escape(desc)}">
  <meta property="og:image" content="{SITE_URL}assets/img/hero-sm.jpg">
  <meta name="twitter:card" content="summary_large_image">{ld_html}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Hebrew:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{prefix}assets/css/style.css">
  <script>window.NF_ACCESS="{ACCESS_HASH}";(function(){{var ok=false;try{{ok=localStorage.getItem("nf-access")===window.NF_ACCESS}}catch(e){{}}document.documentElement.classList.add(ok?"has-access":"no-access")}})();</script>
</head>
<body{body_attr}{' data-gated' if gated else ''}>
<a class="skip-link" href="#main">דילוג לתוכן</a>
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
      {link("index.html", "בית", "home")}
      {link("purchase.html", "הקורס המלא", "purchase")}
      {link("curriculum.html", "תוכנית הלימודים", "curriculum")}
      {link("checklist.html", "צ׳ק ליסט חינמי", "checklist")}
      <a class="btn btn-primary only-locked" href="{prefix}purchase.html#join">להצטרפות</a>
      <a class="btn btn-primary only-access" href="{prefix}curriculum.html">הקורס שלי</a>
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
    <div class="legal-links">
      <a href="{prefix}accessibility.html">הצהרת נגישות</a>
      <a href="{prefix}terms.html">תנאי שימוש</a>
      <a href="{prefix}privacy.html">מדיניות פרטיות</a>
      <a href="{prefix}welcome.html">כניסה לקורס</a>
    </div>
    <div class="copyright">© 2026 {AUTHOR} · {COURSE}</div>
  </div>
</footer>
<script>window.NF_CONFIG={{ga4:"{GA4_ID}",pixel:"{META_PIXEL_ID}",privacy:"{prefix}privacy.html",a11y:"{prefix}accessibility.html"}};</script>
<script src="{prefix}assets/js/main.js"></script>{extra}
</body>
</html>
'''


def contact_line():
    parts = []
    parts.append(f"אימייל: <b dir=\"ltr\">{escape(CONTACT_EMAIL)}</b>" if CONTACT_EMAIL else '<mark>[להשלים: אימייל ליצירת קשר]</mark>')
    parts.append(f"טלפון: <b dir=\"ltr\">{escape(CONTACT_PHONE)}</b>" if CONTACT_PHONE else '<mark>[להשלים: טלפון]</mark>')
    return " · ".join(parts)


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
            f'''          <li><a class="lesson" data-lesson="{l["n"]}"{"" if l["n"] == 1 else " data-locked"} href="{prefix}lessons/{l["file"]}"><span class="lesson-num">{l["num"]}</span>'''
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


def gate(prefix=""):
    """מסך נעילה לעמודים שבתשלום — מוצג רק כשאין גישה."""
    return f'''<section class="gate section" aria-labelledby="gate-title">
  <div class="container">
    <div class="gate-card card">
      {icon("lock", "icon gate-icon")}
      <span class="tag">הקורס המלא</span>
      <h2 id="gate-title">התוכן הזה פתוח לתלמידי הקורס</h2>
      <p>השיעור הראשון, הצ׳ק ליסט החינמי ומילון המונחים פתוחים לכולם. שאר 21 השיעורים ו-9 כלי העבודה — בקורס המלא.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="{prefix}purchase.html">לרכישת הקורס</a>
        <a class="btn btn-outline" href="{prefix}lessons/lesson-01.html">לשיעור הראשון — חינם</a>
      </div>
      {access_form("gate")}
    </div>
  </div>
</section>
'''


def access_form(id_prefix):
    return f'''<form class="access-form" data-access-form novalidate>
        <label for="{id_prefix}-code">כבר רכשתם? הזינו את קוד הגישה</label>
        <div class="access-row">
          <input id="{id_prefix}-code" name="code" type="text" dir="ltr" autocomplete="off" placeholder="XXXX-XXX" required>
          <button class="btn btn-primary" type="submit">כניסה</button>
        </div>
        <p class="access-msg" data-access-msg role="status"></p>
      </form>'''


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
    url = SITE_URL + ("" if path == "index.html" else path)
    html = html.replace("__CANONICAL__", url)
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(html, encoding="utf-8")


# ------------------------------------------------------------------
# עמוד הבית
# ------------------------------------------------------------------

TICKER = [("doc", "מבינים את הדוח"), ("question", "יודעים מה לשאול"), ("money", "שולטים בתקציב"),
          ("check", "בודקים לפני שמשיקים"), ("chart", "מודדים מה עובד"), ("users", "מדברים לקהל הנכון"),
          ("spark", "קריאייטיב שעוצר גלילה"), ("plug", "מערכות שמדברות ביניהן"), ("gauge", "מסך אחד ברור"),
          ("handshake", "עובדים טוב עם הסוכנות")]

PAIN_ROWS = [
    ("01", "money", "התקציב נגמר. התוצאות לא.",
     "הכסף יוצא כל חודש, ואף אחד לא באמת מסביר לאן הוא הלך ולמה. עוד חודש, עוד ״ננסה קהל אחר״.",
     ["₪4,800 הוצאה", "3 לקוחות", "?"]),
    ("02", "doc", "מקבלים דוח מלא במספרים.",
     "CTR, CPM, ROAS, Reach, Frequency — עשרה גרפים, ועדיין לא ברור אם הקמפיין הצליח ומה עושים מחר.",
     ["CTR 1.4%", "CPM ₪38", "ROAS 2.1"]),
    ("03", "question", "לא יודעים מה לשאול.",
     "קשה לבדוק עבודה מקצועית כשלא מבינים מה קורה מאחורי הקמפיין. אז סומכים — ומקווים.",
     ["פיקסל?", "UTM?", "CRM?"]),
]

AUDIENCE_V2 = [
    ("briefcase", "בעלי עסקים", "שמוציאים כסף על פרסום ורוצים לדעת מה הם מקבלים בתמורה.",
     "תדעו לקרוא דוח ולשאול את השאלות הנכונות"),
    ("spark", "מתחילים מאפס", "שלא יודעים מה זה CPC, UTM או API — ורוצים להבין בלי להתבייש.",
     "תבינו את כל המושגים והיגיון העבודה"),
    ("handshake", "עובדים עם סוכנות או פרילנסר", "שרוצים להבין את הדוחות ולבדוק את העבודה שנעשית עבורם.",
     "תדעו מה לבקש ואיך לזהות בעיה"),
    ("rocket", "מנהלים קמפיינים לבד", "שרוצים לבנות, למדוד ולשפר בצורה מסודרת ולא לפי תחושה.",
     "תקבלו שיטה, כלים וצ׳ק־ליסטים"),
]


def checklist_zone():
    """אזור הצ׳ק ליסט החינמי — הבולט בעמוד: הבעיה ← פתרון חינמי ← טופס."""
    items = [t for _, _, group in FREE_CHECKLIST for t, _ in group]
    pick = [items[i] for i in (0, 1, 5, 8, 13, 16, 18)]
    rows = "".join(f'<li style="--i:{k}"><i aria-hidden="true"></i><span>{inline(t)}</span></li>' for k, t in enumerate(pick))
    groups = "".join(f'<span>{name}</span>' for name, _, _ in FREE_CHECKLIST)
    return f'''<section class="zone zone-check" id="checklist">
  <div class="blob b1" aria-hidden="true"></div><div class="blob b2" aria-hidden="true"></div>
  <div class="container check-zone">
    <div class="check-copy reveal">
      <span class="free-badge">חינם · 20 בדיקות</span>
      <h2>לפני שמעלים עוד קמפיין — <em>עוברים על הצ׳ק ליסט.</em></h2>
      <p>20 הבדיקות שחוסכות את רוב הכסף שנשרף בקמפיינים: קישור שבור, טופס שלא נשלח, מדידה שלא עובדת, קהל לא נכון. 10 דקות לפני כל השקה.</p>
      <div class="check-groups">{groups}</div>
      <div class="sheet-mock" aria-hidden="true">
        <div class="sheet-head"><b>צ׳ק ליסט למפרסמים</b><span class="sheet-prog"><i></i></span></div>
        <ol>{rows}</ol>
      </div>
    </div>
    <aside class="lead-panel check-form reveal" id="lead">
      <h3>שלחו לי את הצ׳ק ליסט</h3>
      <p>השאירו פרטים — ונשלח לכם את הצ׳ק ליסט החינמי עם הסבר לכל בדיקה, וגם פרטים על הקורס.</p>
      <form class="lead-form" method="post">
        <label class="sr-only" for="ck-name">שם מלא</label>
        <input id="ck-name" name="name" type="text" autocomplete="name" placeholder="שם מלא" required>
        <label class="sr-only" for="ck-phone">טלפון</label>
        <input id="ck-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="טלפון" required>
        <label class="sr-only" for="ck-email">אימייל</label>
        <input id="ck-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="אימייל" required>
        <button class="btn btn-primary btn-block" type="submit">שלחו לי את הצ׳ק ליסט — חינם</button>
      </form>
      <div class="lead-note">הפרטים נשמרים לצורך שליחת החומרים בלבד. <a href="privacy.html">מדיניות פרטיות</a></div>
      <a class="peek" href="checklist.html">או הציצו בצ׳ק ליסט עכשיו ←</a>
    </aside>
  </div>
</section>
'''


def build_index():
    ticker = "".join(f'<span><b class="t-ic">{svg(ic)}</b>{t}</span>' for ic, t in TICKER)
    pains = "\n".join(
        f'''      <article class="pain-row reveal" data-tone="{k + 1}">
        <span class="pain-num" aria-hidden="true">{num}</span>
        <div class="pain-body">{icon(ic, "icon")}<div><h3>{t}</h3><p>{d}</p></div></div>
        <div class="pain-chips" aria-hidden="true">{"".join(f"<span>{c}</span>" for c in chips)}</div>
      </article>'''
        for k, (num, ic, t, d, chips) in enumerate(PAIN_ROWS))
    audience = "\n".join(
        f'''      <article class="aud reveal" data-tone="{k + 1}" style="--d:{k}">
        {icon(i)}
        <h3>{t}</h3>
        <p>{d}</p>
        <div class="aud-gain"><i class="check">✓</i>{gain}</div>
      </article>'''
        for k, (i, t, d, gain) in enumerate(AUDIENCE_V2))
    steps = "\n".join(
        f'''      <li class="path-step reveal" style="--d:{si}">
        <span class="path-dot">{si + 1}</span>
        <div class="path-card"><h3>{name}</h3><p>{summary}</p></div>
      </li>'''
        for si, (name, _, summary, items) in enumerate(STAGES))
    faq = "\n".join(f'    <details class="card"><summary>{q}</summary><p>{a}</p></details>' for q, a in FAQ[:4])

    html = head(f"{COURSE} — קורס דיגיטלי מעשי",
                "קורס דיגיטלי מעשי ב-22 שיעורים: להבין מה איש הפרסום עושה, מה קורה מאחורי הקמפיין, ואיך לנהל את כל המערכת — מהמודעה ועד המכירה.",
                ld=[course_ld(), faq_ld()])
    html += header("home")
    html += f'''
<main id="main" class="home">
<section class="hero">
  <div class="container hero-inner">
    <div class="hero-copy">
      <span class="tag tag-solid">קורס דיגיטלי מעשי · 22 שיעורים</span>
      <h1 style="margin-top:22px">אל תצאו פראיירים.
        <span class="accent">תבינו מה איש הפרסום עושה, ומה באמת קורה מאחורי הקמפיין</span></h1>
      <p class="hero-intro">איך לנהל את כל המערכת — מהמודעה ועד המכירה. בלי להפוך לאיש מדיה, אבל עם מספיק הבנה כדי לשאול את השאלות הנכונות ולהיות בשליטה על הכסף שלכם.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#checklist">לצ׳ק ליסט החינמי</a>
        <a class="btn btn-ghost" href="purchase.html">לפרטים על הקורס</a>
      </div>
    </div>
  </div>
</section>

<div class="ticker" aria-hidden="true"><div class="ticker-track">{ticker * 2}{ticker * 2}</div></div>

<section class="zone zone-dark pain-zone">
  <div class="orb o1" aria-hidden="true"></div><div class="orb o2" aria-hidden="true"></div>
  <div class="container">
    <div class="zone-head reveal">
      <span class="eyebrow">נשמע מוכר?</span>
      <h2>מכירים את <em>זה?</em></h2>
      <p>לפעמים בעל העסק מקבל דוח מלא במספרים, ועדיין לא באמת יודע מה קרה עם הכסף שלו.</p>
    </div>
    <div class="pain-rows">
{pains}
    </div>
    <div class="answer-band reveal">
      <div><span class="eyebrow light">אפשר אחרת</span><p>מתחילים ב-20 בדיקות פשוטות — <strong>ומבינים מספיק כדי להיות בשליטה.</strong></p></div>
      <a class="btn btn-light" href="#checklist">לצ׳ק ליסט החינמי</a>
    </div>
  </div>
</section>

{checklist_zone()}
<section class="zone zone-mesh">
  <div class="container">
    <div class="zone-head reveal">
      <span class="eyebrow">למי זה מתאים</span>
      <h2>למי הקורס מיועד?</h2>
      <p>לא צריך רקע בשיווק. צריך רצון להבין מה קורה עם הכסף שיוצא על פרסום.</p>
    </div>
    <div class="aud-grid">
{audience}
    </div>
  </div>
</section>

<section class="zone zone-path" id="how">
  <div class="container">
    <div class="zone-head reveal">
      <span class="eyebrow">כך לומדים</span>
      <h2>לא קופצים ישר ל-<span dir="ltr">Facebook Ads</span></h2>
      <p>קודם מבינים מהו קמפיין, מטרות ומספרים. אחר כך קהל, מסר ותוכן — ורק אז נכנסים ל-Meta ולגוגל. אחרי שהקמפיין קיים לומדים למדוד, לחבר מערכות ולנהל.</p>
    </div>
    <ol class="path">
{steps}
    </ol>
    <div class="center-cta"><a class="btn btn-primary" href="purchase.html">לכל פרטי הקורס</a></div>
  </div>
</section>

<section class="zone zone-dots" id="about">
  <div class="container about about-v2">
    <div class="about-card reveal">
      <div class="avatar">ע</div>
      <h3>{AUTHOR}</h3>
      <p>מדיה ודיגיטל</p>
    </div>
    <div class="about-copy reveal">
      <span class="eyebrow">קצת עליי</span>
      <h2 style="margin-top:10px">אני {AUTHOR}</h2>
      <p>אני עוסק במדיה ובדיגיטל כבר {YEARS} שנים. במהלך השנים יצא לי לראות מקרוב איך קמפיינים נבנים, איך תקציבים מתבזבזים, ואיך לפעמים בעל העסק מקבל דוח מלא במספרים ועדיין לא באמת יודע מה קרה עם הכסף שלו.</p>
      <div class="quote">בניתי את הקורס הזה כדי לא להפוך אותך לאיש מדיה, אלא לגרום לך להבין מספיק כדי לשאול את השאלות הנכונות, לבדוק עבודה מקצועית, לזהות בעיות ולהיות בשליטה על הכסף והנתונים שלך.</div>
    </div>
  </div>
</section>

<section class="zone zone-light" id="faq">
  <div class="container">
    <div class="zone-head reveal"><span class="eyebrow">שאלות ותשובות</span><h2>שאלות נפוצות</h2></div>
    <div class="faq">
{faq}
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="container">
    <div class="cta-band reveal">
      <h2>מוכנים להפסיק לנחש?</h2>
      <p>22 שיעורים קצרים, 9 כלי עבודה ופרויקט גמר — מהמודעה ועד המכירה.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="purchase.html">לעמוד הקורס</a>
        <a class="btn btn-ghost" href="#checklist">קודם הצ׳ק ליסט החינמי</a>
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
    html += "\n<main id=\"main\">\n" + page_hero(
        "תוכנית הלימודים",
        f"22 שיעורים בששה שלבים, כ-{HOURS} שעות בסך הכול. כל שלב נבנה על הקודם — כך שכשמגיעים למערכות, כבר מבינים מה עושים בהן ולמה.",
        crumbs=[("בית", "index.html"), ("תוכנית הלימודים", None)])
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

        html = head(f'{l["num"]}. {l["title"]} — {COURSE}', l["desc"], prefix="../", gated=l["n"] > 1, ld=lesson_ld(l))
        html += header("curriculum", prefix="../")
        html += f'''
<main id="main" data-current-lesson="{l["n"]}">
{gate("../") if l["n"] > 1 else ""}
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
    html += "\n<main id=\"main\">\n" + page_hero(
        "20 פעולות לפני שמעלים קמפיין",
        "הצ׳ק ליסט החינמי למפרסמים. עוברים עליו לפני כל השקה — מסמנים, ומשיקים רק כשהכול מסומן. הסימונים נשמרים בדפדפן שלכם.",
        crumbs=[("בית", "index.html"), ("צ׳ק ליסט חינמי", None)], tag="חינם")
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
        <a class="btn btn-primary btn-block" href="purchase.html">לקורס המלא</a>
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
        f'''      <a class="tool card" data-locked href="tools/{slug}.html">{icon(ic, "icon" + (" icon-teal" if k % 2 else ""))}<div><h3>{name}</h3><p>{desc}</p>'''
        f'''<small class="muted">שיעורים {", ".join(f"{x:02d}" for x in ls)}</small></div></a>'''
        for k, (slug, name, ic, desc, ls) in enumerate(TOOLS))
    html = head(f"ערכת כלים — {COURSE}", "9 כלי עבודה למפרסמים: מחולל בריף, מחשבון תקציב, UTM, טבלת בקרה, אבחון, דשבורד, דוח חודשי, QA ופרויקט גמר.")
    html += header("toolkit")
    html += "\n<main id=\"main\">\n" + page_hero(
        "ערכת הכלים",
        "9 כלים שעובדים ישירות בדפדפן — בלי הרשמה ובלי להוריד קבצים. מה שאתם מזינים נשמר אצלכם במחשב, ואפשר להדפיס או לשמור כ-PDF.",
        crumbs=[("בית", "index.html"), ("ערכת כלים", None)])
    html += f'''<section class="section"><div class="container"><div class="tools-grid tools-grid-3">
{cards}
</div></div></section>
</main>
'''
    html += footer()
    write("toolkit.html", html)

    for slug, name, ic, desc, ls in TOOLS:
        lesson_links = " · ".join(f'<a href="../lessons/lesson-{x:02d}.html">שיעור {x:02d}</a>' for x in ls)
        html = head(f"{name} — {COURSE}", desc, prefix="../", body_attr=f' data-tool="{slug}"', gated=True, noindex=True)
        html += header("toolkit", prefix="../")
        html += "\n<main id=\"main\">\n" + gate("../") + page_hero(name, TOOL_INTRO[slug],
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
        pay = f'<a class="btn btn-primary btn-block" href="{PAYMENT_URL}">לתשלום מאובטח</a>'
    else:
        pay = ('<a class="btn btn-primary btn-block" href="#lead">להרשמה לקורס</a>'
               '<p class="muted small" style="margin-top:10px;text-align:center">השאירו פרטים ונחזור אליכם עם קישור לתשלום וגישה לקורס.</p>')
    steps = "\n".join(
        f'''      <li class="path-step reveal" style="--d:{si}">
        <span class="path-dot">{si + 1}</span>
        <div class="path-card"><h3>{name}</h3><p>{summary}</p><span class="count">{len(items)} שיעורים</span></div>
      </li>'''
        for si, (name, _, summary, items) in enumerate(STAGES))
    bento = "\n".join(
        f'      <div class="bento-tile reveal" data-tile="{k + 1}">{icon(i)}<h3>{t}</h3><p>{d}</p></div>'
        for k, (i, t, d) in enumerate(LESSON_FORMAT))
    tools = "\n".join(
        f'      <a class="glass-tool reveal" href="tools/{slug}.html" style="--d:{k}">{icon(ic)}<div><h3>{name}</h3><p>{desc}</p></div></a>'
        for k, (slug, name, ic, desc, _) in enumerate(TOOLS))
    faq = "\n".join(f'    <details class="card"><summary>{q}</summary><p>{a}</p></details>' for q, a in FAQ)

    html = head(f"הקורס המלא — {COURSE}", "הקורס המלא: 22 שיעורים בששה שלבים, 9 כלי עבודה ופרויקט גמר — מהמודעה ועד המכירה.",
                ld=[course_ld(), faq_ld()])
    html += header("purchase")
    html += f'''
<main id="main" class="course-page">
<section class="hero course-hero">
  <div class="container hero-inner">
    <div class="hero-copy">
      <nav class="breadcrumbs"><a href="index.html">בית</a><span>/</span><span>הקורס המלא</span></nav>
      <span class="tag tag-solid">הקורס המלא</span>
      <h1 style="margin-top:18px">{COURSE}
        <span class="accent">מהמודעה ועד המכירה — 22 שיעורים שעושים סדר</span></h1>
      <p class="hero-intro">22 שיעורים תמציתיים, 9 כלי עבודה ופרויקט גמר — כדי שמחר בבוקר תדעו מה לבקש, מה לבדוק ואיך להפוך פרסום לכסף.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#join">להצטרפות לקורס</a>
        <a class="btn btn-ghost" href="lessons/lesson-01.html">לשיעור הראשון — חינם</a>
      </div>
      <div class="hero-stats">
        <div class="stat"><strong>22</strong><span>שיעורים קצרים</span></div>
        <div class="stat"><strong>6</strong><span>שלבי למידה</span></div>
        <div class="stat"><strong>9</strong><span>כלי עבודה</span></div>
      </div>
    </div>
  </div>
</section>

<section class="zone zone-path">
  <div class="container">
    <div class="zone-head reveal">
      <span class="eyebrow">המסלול</span>
      <h2>ששה שלבים. כל שלב נבנה על הקודם.</h2>
      <p>כשמגיעים למערכות — כבר מבינים מה עושים בהן ולמה.</p>
    </div>
    <ol class="path">
{steps}
    </ol>
  </div>
</section>

<section class="zone zone-soft" id="curriculum">
  <div class="big-num" aria-hidden="true">22</div>
  <div class="container">
    <div class="zone-head reveal">
      <span class="eyebrow">תוכנית הלימודים</span>
      <h2>כל 22 השיעורים</h2>
      <p>כ-{HOURS} שעות בסך הכול. לחצו על שלב כדי לראות את השיעורים שבו.</p>
    </div>
    <div class="modules">
{module_list()}
    </div>
  </div>
</section>

<section class="zone zone-light">
  <div class="container">
    <div class="zone-head reveal">
      <span class="eyebrow">מבנה כל שיעור</span>
      <h2>תמציתי. מדויק. ליישום מחר בבוקר.</h2>
      <p>כל שיעור בנוי סביב מטרה אחת, ונגמר בצעדים שעושים בעסק — לא בעוד תיאוריה.</p>
    </div>
    <div class="bento">
{bento}
    </div>
  </div>
</section>

<section class="zone zone-dark tools-zone" id="tools">
  <div class="orb o3" aria-hidden="true"></div>
  <div class="container">
    <div class="zone-head reveal">
      <span class="eyebrow">ערכת כלים</span>
      <h2>9 כלים שעובדים — לא רק קבצים</h2>
      <p>מחשבונים, מחוללים וצ׳ק־ליסטים שעובדים ישירות בדפדפן ושומרים את מה שהזנתם.</p>
    </div>
    <div class="glass-grid">
{tools}
    </div>
  </div>
</section>

<section class="zone zone-gradient" id="join">
  <div class="container pricing">
    <div class="zone-head reveal" style="text-align:right;margin:0;justify-items:start">
      <span class="eyebrow light">הצטרפות</span>
      <h2>להיות בשליטה על הכסף והנתונים שלכם</h2>
      <p>תשלום אחד, גישה מלאה, לומדים בקצב שלכם.</p>
      <div class="card access-card join-access">{access_form("purchase")}</div>
    </div>
    <div class="reveal">
      <div class="price-card">
        <span class="tag">{COURSE}</span>
        <div class="price">₪{PRICE}<small>תשלום אחד</small></div>
        <ul class="price-list">
          <li><i class="check">✓</i>22 שיעורים · כ-{HOURS} שעות</li>
          <li><i class="check">✓</i>9 כלי עבודה בדפדפן</li>
          <li><i class="check">✓</i>צ׳ק־ליסט QA של 45 בדיקות</li>
          <li><i class="check">✓</i>פרויקט גמר מודרך</li>
          <li><i class="check">✓</i>משימה ובוחן בכל שיעור</li>
        </ul>
        {pay}
      </div>
    </div>
  </div>
</section>

{lead_section()}
<section class="zone zone-light" id="faq">
  <div class="container">
    <div class="zone-head reveal"><span class="eyebrow">שאלות ותשובות</span><h2>שאלות נפוצות</h2></div>
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
    html = head(f"מילון מונחים — {COURSE}", "כל המונחים של עולם הפרסום בדיגיטל, בהסבר של משפט אחד.",
                ld=[{"@context": "https://schema.org", "@type": "DefinedTermSet", "name": f"מילון מונחים — {COURSE}", "inLanguage": "he",
                     "hasDefinedTerm": [{"@type": "DefinedTerm", "name": t, "description": d.replace("**", "")} for t, d, _ in GLOSSARY]}])
    html += header("glossary")
    html += "\n<main id=\"main\">\n" + page_hero(
        "מילון מונחים",
        f"{len(items)} מונחים שכל מפרסם צריך להכיר — כל אחד במשפט אחד, עם קישור לשיעור שבו הוא מוסבר לעומק.",
        crumbs=[("בית", "index.html"), ("מילון מונחים", None)])
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


# ------------------------------------------------------------------
# נתונים מובנים (Schema.org) ל-SEO
# ------------------------------------------------------------------

def course_ld():
    return {
        "@context": "https://schema.org", "@type": "Course", "name": COURSE, "inLanguage": "he",
        "description": "קורס דיגיטלי מעשי ב-22 שיעורים: יעדים ומספרים, קהל ותוכן, Meta ו-Google Ads, UTM ו-Analytics, API, אוטומציות, CRM, דשבורדים ופרויקט גמר.",
        "url": SITE_URL,
        "provider": {"@type": "Person", "name": AUTHOR},
        "offers": {"@type": "Offer", "price": PRICE, "priceCurrency": "ILS", "category": "Paid",
                   "availability": "https://schema.org/InStock", "url": SITE_URL + "purchase.html"},
        "hasCourseInstance": {"@type": "CourseInstance", "courseMode": "Online", "courseWorkload": f"PT{TOTAL_MIN}M"},
        "syllabusSections": [{"@type": "Syllabus", "name": st[0], "description": st[2]} for st in STAGES],
        "teaches": ["פרסום ממומן", "Meta Ads", "Google Ads", "UTM", "Google Analytics 4", "CRM", "אוטומציות שיווק"],
    }


def faq_ld():
    return {"@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}


def lesson_ld(l):
    free = l["n"] == 1
    page = {
        "@context": "https://schema.org", "@type": "LearningResource", "name": l["title"], "description": l["desc"],
        "inLanguage": "he", "learningResourceType": "Lesson", "timeRequired": f"PT{l['minutes']}M",
        "isPartOf": {"@type": "Course", "name": COURSE, "url": SITE_URL},
        "isAccessibleForFree": free,
    }
    if not free:
        page["hasPart"] = {"@type": "WebPageElement", "isAccessibleForFree": False, "cssSelector": ".lesson-section"}
    crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "הקורס", "item": SITE_URL},
        {"@type": "ListItem", "position": 2, "name": "תוכנית הלימודים", "item": SITE_URL + "curriculum.html"},
        {"@type": "ListItem", "position": 3, "name": l["title"], "item": SITE_URL + "lessons/" + l["file"]},
    ]}
    return [page, crumbs]


# ------------------------------------------------------------------
# כניסה לקורס (חזרה מדף התשלום)
# ------------------------------------------------------------------

def build_welcome():
    html = head(f"כניסה לקורס — {COURSE}", "כניסה לקורס עם קוד הגישה.", noindex=True)
    html += header("welcome")
    html += '\n<main id="main">\n' + page_hero(
        "ברוכים הבאים לקורס",
        "אחרי התשלום מגיעים לכאן עם הגישה פתוחה. אם קיבלתם קוד גישה במייל — הזינו אותו כאן פעם אחת, והקורס ייפתח בדפדפן הזה.",
        crumbs=[("בית", "index.html"), ("כניסה לקורס", None)])
    html += f'''<section class="section">
  <div class="container welcome">
    <div class="card welcome-card only-access">
      {icon("check", "icon icon-teal")}
      <h2>הגישה שלכם פעילה</h2>
      <p>22 שיעורים ו-9 כלי עבודה פתוחים. מומלץ להתחיל מהשיעור הראשון ולעבור שיעור ביום.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="lessons/lesson-01.html">להתחיל את הקורס</a>
        <a class="btn btn-outline" href="toolkit.html">לערכת הכלים</a>
      </div>
    </div>
    <div class="card welcome-card only-locked">
      {icon("lock")}
      <h2>כניסה עם קוד גישה</h2>
      {access_form("welcome")}
      <p class="muted small">אין לכם קוד? <a href="purchase.html">לרכישת הקורס</a>.</p>
    </div>
    <div class="card welcome-tips">
      <h3>איך ללמוד נכון</h3>
      <ul class="checks">
        <li>שיעור אחד ביום — 6 עד 10 דקות.</li>
        <li>לסיים כל שיעור במשימה ״למחר בבוקר״, על העסק שלכם.</li>
        <li>לפתוח את הכלי שמצורף לשיעור ולמלא אותו.</li>
        <li>הגישה וההתקדמות נשמרות בדפדפן. במחשב או בטלפון אחר — מזינים את הקוד שוב.</li>
      </ul>
    </div>
  </div>
</section>
</main>
'''
    html += footer()
    write("welcome.html", html)


# ------------------------------------------------------------------
# דפים משפטיים
# ------------------------------------------------------------------

def legal_page(path, title, intro, body, desc):
    html = head(f"{title} — {COURSE}", desc)
    html += header("legal")
    html += '\n<main id="main">\n' + page_hero(title, intro, crumbs=[("בית", "index.html"), (title, None)])
    html += f'''<section class="section">
  <div class="container">
    <article class="card legal">
{body}
      <p class="legal-date">עודכן לאחרונה: {LEGAL_UPDATED}</p>
    </article>
  </div>
</section>
</main>
'''
    html += footer()
    write(path, html)


def build_legal():
    c = contact_line()
    legal_page("accessibility.html", "הצהרת נגישות",
               "אנחנו רוצים שכל אחד ואחת יוכלו ללמוד בקורס ולהשתמש באתר — כולל אנשים עם מוגבלות.",
               f'''
      <h2>מחויבות לנגישות</h2>
      <p>האתר נבנה מתוך מטרה לעמוד בדרישות תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע״ג-2013, ובתקן הישראלי ת״י 5568 המבוסס על הנחיות WCAG 2.0 ברמה AA — ככל שהדבר אפשרי.</p>
      <h2>מה עשינו באתר</h2>
      <ul>
        <li>מבנה כותרות היררכי, וציון שפה וכיוון (עברית, מימין לשמאל) בכל עמוד.</li>
        <li>ניווט מלא במקלדת, עם סימון פוקוס ברור, וקישור ״דילוג לתוכן״ בתחילת כל עמוד.</li>
        <li>תוויות לכל שדות הטפסים, והודעות שגיאה ואישור בטקסט.</li>
        <li>ניגודיות צבעים מספקת בטקסט הרגיל, ופריסה שמתאימה את עצמה לטלפון, לטאבלט ולמחשב.</li>
        <li>אייקונים דקורטיביים מוסתרים מקוראי מסך; כפתורים בלי טקסט מקבלים תיאור.</li>
        <li>כיבוד הגדרת ״הפחתת תנועה״ של מערכת ההפעלה.</li>
      </ul>
      <h2>תפריט הנגישות</h2>
      <p>בכל עמוד יש כפתור נגישות (בפינה התחתונה של המסך) שמאפשר: הגדלת טקסט בשלוש רמות, ריווח טקסט, ניגודיות גבוהה, גווני אפור, הדגשת קישורים, גופן קריא, עצירת אנימציות וסמן גדול. ההגדרות נשמרות בדפדפן.</p>
      <h2>דפדפנים וטכנולוגיות מסייעות</h2>
      <p>האתר מותאם לגרסאות העדכניות של Chrome, Safari, Edge ו-Firefox, ולקוראי המסך NVDA ו-VoiceOver.</p>
      <h2>מגבלות ידועות</h2>
      <ul>
        <li>חלק מהטבלאות בשיעורים רחבות, ובטלפון נגללות לצדדים בתוך המסגרת שלהן.</li>
        <li>כלי העבודה (מחשבונים וטבלאות) כוללים טבלאות אינטראקטיביות; אם משהו בהם לא נגיש לכם — נשמח לעזור.</li>
        <li>תכנים חיצוניים (כמו מערכות סליקה) אינם בשליטתנו המלאה.</li>
      </ul>
      <p>אנחנו ממשיכים לשפר את הנגישות. אם נתקלתם בבעיה — נשמח שתספרו לנו.</p>
      <h2>רכז/ת נגישות ופניות</h2>
      <p>{AUTHOR} · {c}</p>
      <p>בפנייה כדאי לציין: תיאור הבעיה, העמוד שבו נתקלתם בה, הדפדפן והטכנולוגיה המסייעת שבה השתמשתם. נשתדל להשיב תוך 14 ימי עבודה.</p>
''', "הצהרת הנגישות של אתר הקורס: מה הונגש, תפריט הנגישות, מגבלות ידועות ופרטי רכז הנגישות.")

    legal_page("terms.html", "תנאי שימוש",
               "השימוש באתר ורכישת הקורס כפופים לתנאים הבאים. מומלץ לקרוא אותם לפני הרכישה.",
               f'''
      <p>האתר והקורס ״{COURSE}״ מופעלים על ידי {AUTHOR} (״המפעיל״). השימוש באתר מהווה הסכמה לתנאים אלה. התנאים מנוסחים בלשון רבים ופונים לכל המגדרים.</p>
      <h2>1. השירות</h2>
      <p>הקורס הוא קורס דיגיטלי ללמידה עצמית: שיעורים כתובים, בוחנים, משימות וכלי עבודה שפועלים בדפדפן. הצ׳ק ליסט, השיעור הראשון ומילון המונחים פתוחים לכולם ללא תשלום.</p>
      <h2>2. רכישה וגישה</h2>
      <ul>
        <li>מחיר הקורס הוא {PRICE} ₪, כולל מע״מ ככל שחל, בתשלום אחד, אלא אם צוין אחרת בדף התשלום.</li>
        <li>לאחר התשלום מתקבלת גישה לקורס באמצעות קוד גישה. הקוד אישי, ואין להעבירו או לפרסמו.</li>
        <li>ההתקדמות בקורס ומה שמוזן בכלים נשמרים בדפדפן של המשתמש בלבד. ניקוי נתוני הדפדפן עלול למחוק אותם.</li>
      </ul>
      <h2>3. ביטול עסקה</h2>
      <p>ביטול עסקה והחזר כספי יתאפשרו בהתאם להוראות חוק הגנת הצרכן, התשמ״א-1981 והתקנות שמכוחו, לרבות ההוראות לעניין עסקת מכר מרחוק. בקשת ביטול נשלחת בכתב לפרטי הקשר שבתחתית העמוד.</p>
      <h2>4. קניין רוחני</h2>
      <p>כל התכנים באתר — טקסטים, שיעורים, כלים, עיצוב וקוד — שייכים למפעיל ומוגנים בזכויות יוצרים. מותר להשתמש בהם לצורך לימוד אישי ועבודה בעסק של הרוכש. אסור להעתיק, להפיץ, למכור או לפרסם אותם, כולם או חלקם, ללא אישור בכתב.</p>
      <h2>5. אחריות</h2>
      <ul>
        <li>התכנים בקורס הם מידע מקצועי כללי ואינם ייעוץ אישי, משפטי, חשבונאי או פיננסי.</li>
        <li>תוצאות פרסום תלויות בגורמים רבים (מוצר, שוק, תקציב, ביצוע ופלטפורמות חיצוניות). המפעיל אינו מתחייב לתוצאה עסקית כלשהי.</li>
        <li>פלטפורמות הפרסום משנות ממשקים וכללים מעת לעת, ולכן ייתכן שפרטים מסוימים בקורס ישתנו. נעדכן את התכנים ככל האפשר.</li>
        <li>החישובים בכלי העבודה מבוססים על הנתונים שהמשתמש מזין, והאחריות לבדיקתם על המשתמש.</li>
      </ul>
      <h2>6. שימוש הוגן</h2>
      <p>אין לעשות שימוש באתר שעלול לפגוע בפעולתו, לעקוף את מנגנון הגישה, או להעתיק תכנים באופן אוטומטי.</p>
      <h2>7. פרטיות</h2>
      <p>איסוף ושימוש במידע אישי מתוארים ב<a href="privacy.html">מדיניות הפרטיות</a>.</p>
      <h2>8. שינויים בתנאים</h2>
      <p>המפעיל רשאי לעדכן תנאים אלה. התנאים המחייבים הם אלה שפורסמו באתר במועד הרכישה.</p>
      <h2>9. דין וסמכות שיפוט</h2>
      <p>על תנאים אלה יחולו דיני מדינת ישראל, וסמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים בישראל.</p>
      <h2>10. יצירת קשר</h2>
      <p>{AUTHOR} · {c}</p>
''', "תנאי השימוש באתר ובקורס: רכישה וגישה, ביטול עסקה, קניין רוחני ואחריות.")

    legal_page("privacy.html", "מדיניות פרטיות",
               "מה אנחנו אוספים, למה, ומה הזכויות שלכם.",
               f'''
      <p>מדיניות זו מתארת כיצד {AUTHOR} (״המפעיל״) אוסף ומשתמש במידע אישי באתר ״{COURSE}״, בהתאם לחוק הגנת הפרטיות, התשמ״א-1981 והתקנות שמכוחו.</p>
      <h2>1. איזה מידע נאסף</h2>
      <ul>
        <li><b>פרטים שאתם מוסרים</b> — שם, טלפון ואימייל, כשאתם ממלאים טופס באתר.</li>
        <li><b>פרטי רכישה</b> — נמסרים לחברת הסליקה ומעובדים על ידה. פרטי כרטיס אשראי אינם נשמרים אצלנו.</li>
        <li><b>מידע שנשמר רק אצלכם</b> — התקדמות בקורס, סימונים בצ׳ק ליסט, הגדרות נגישות ומה שמוזן בכלי העבודה נשמרים בדפדפן שלכם בלבד (Local Storage) ואינם נשלחים אלינו.</li>
        <li><b>מידע סטטיסטי</b> — אם הופעלו כלי מדידה (כמו Google Analytics או פיקסל של Meta), הם נטענים רק אחרי שאישרתם זאת בבאנר העוגיות.</li>
      </ul>
      <h2>2. למה אנחנו משתמשים במידע</h2>
      <ul>
        <li>כדי לשלוח לכם את החומרים שביקשתם (כמו הצ׳ק ליסט) ולחזור אליכם בנוגע לקורס.</li>
        <li>כדי לספק את הקורס, לתת גישה ולתת תמיכה.</li>
        <li>כדי לשפר את האתר ואת הפרסום — רק במידע סטטיסטי ובהסכמה.</li>
        <li>דיוור שיווקי יישלח רק אם הסכמתם לכך, בהתאם לסעיף 30א לחוק התקשורת (בזק ושידורים), התשמ״ב-1982. אפשר להסיר את עצמכם בכל עת.</li>
      </ul>
      <h2>3. העברת מידע לצדדים שלישיים</h2>
      <p>איננו מוכרים מידע אישי. המידע עשוי להיות מעובד על ידי ספקי שירות שעובדים עבורנו — אחסון האתר ודפי הנחיתה, מערכת ניהול לקוחות (CRM), שירותי דיוור וחברת הסליקה — לצורך מתן השירות בלבד, או אם נדרש לפי דין.</p>
      <h2>4. עוגיות</h2>
      <p>האתר משתמש באחסון מקומי בדפדפן לצורך תפקוד (התקדמות, הגדרות). עוגיות מדידה ושיווק נטענות רק לאחר הסכמה, ואפשר לבחור ״רק הכרחיות״. אפשר גם לחסום או למחוק עוגיות בהגדרות הדפדפן.</p>
      <h2>5. אבטחת מידע</h2>
      <p>אנחנו נוקטים אמצעים סבירים להגנה על המידע. עם זאת, אין מערכת חסינה לחלוטין.</p>
      <h2>6. הזכויות שלכם</h2>
      <p>אתם רשאים לעיין במידע שנשמר עליכם, לבקש לתקנו או למחוק אותו, ולבקש להפסיק לקבל דיוור. פנו אלינו ונטפל בבקשה בהקדם.</p>
      <h2>7. שינויים במדיניות</h2>
      <p>נעדכן מדיניות זו בעת הצורך; הגרסה המעודכנת תפורסם בעמוד זה.</p>
      <h2>8. יצירת קשר</h2>
      <p>{AUTHOR} · {c}</p>
''', "מדיניות הפרטיות של אתר הקורס: איזה מידע נאסף, למה, עם מי הוא משותף ומה הזכויות שלכם.")


# ------------------------------------------------------------------
# sitemap, robots, favicon
# ------------------------------------------------------------------

def build_seo_files():
    pages = ["index.html", "curriculum.html", "checklist.html", "purchase.html", "toolkit.html", "glossary.html",
             "accessibility.html", "terms.html", "privacy.html"] + [f"lessons/{l['file']}" for l in LESSONS]
    prio = {"index.html": "1.0", "checklist.html": "0.9", "purchase.html": "0.9", "curriculum.html": "0.8"}
    urls = "\n".join(
        f"  <url><loc>{SITE_URL + ('' if p == 'index.html' else p)}</loc><priority>{prio.get(p, '0.6')}</priority></url>"
        for p in pages)
    (ROOT / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n',
        encoding="utf-8")
    from urllib.parse import urlparse
    base = urlparse(SITE_URL).path or "/"
    (ROOT / "robots.txt").write_text(
        f"User-agent: *\nDisallow: {base}tools/\nDisallow: {base}welcome.html\n\nSitemap: {SITE_URL}sitemap.xml\n", encoding="utf-8")
    (ROOT / "assets/img/favicon.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#1677ff"/><stop offset="1" stop-color="#22c9bc"/></linearGradient></defs>'
        '<rect width="64" height="64" rx="16" fill="url(#g)"/><path d="m18 33 9 9 19-20" fill="none" stroke="#fff" '
        'stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>\n', encoding="utf-8")


# ------------------------------------------------------------------
# דף נחיתה (קובץ יחיד להעלאה ל-Lando)
# ------------------------------------------------------------------

def build_landing():
    import base64
    import json
    css = (ROOT / "assets/css/style.css").read_text(encoding="utf-8")
    hero = base64.b64encode((ROOT / "assets/img/hero.jpg").read_bytes()).decode()
    hero_sm = base64.b64encode((ROOT / "assets/img/hero-sm.jpg").read_bytes()).decode()
    css = css.replace("url('../img/hero.jpg')", f"url('data:image/jpeg;base64,{hero}')")
    css = css.replace("url('../img/hero-sm.jpg')", f"url('data:image/jpeg;base64,{hero_sm}')")
    js = (ROOT / "assets/js/main.js").read_text(encoding="utf-8")
    site = SITE_URL

    steps = "\n".join(
        f'      <div class="step"><span class="n">{si + 1:02d}</span><h3>{name}</h3><p>{summary}</p>'
        f'<span class="count">{len(items)} שיעורים</span></div>'
        for si, (name, _, summary, items) in enumerate(STAGES))
    groups = ""
    k = 0
    for gi, (name, ic, items) in enumerate(FREE_CHECKLIST):
        li = ""
        for t, _ in items:
            k += 1
            li += f"<li><em>{k:02d}</em>{inline(t)}</li>"
        groups += f'<div class="lp-group card">{icon(ic, "icon" + (" icon-teal" if gi % 2 else ""))}<h3>{name}</h3><ul>{li}</ul></div>'
    fmt_cards = "\n".join(
        f'      <div class="format card">{icon(i, "icon" + (" icon-teal" if n % 2 else ""))}<div><h3>{t}</h3><p>{d}</p></div></div>'
        for n, (i, t, d) in enumerate(LESSON_FORMAT))
    faq = "\n".join(f'    <details class="card"><summary>{q}</summary><p>{a}</p></details>' for q, a in FAQ)

    html = f'''<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>אל תצאו פראיירים | צ׳ק ליסט חינמי למפרסמים + קורס דיגיטלי</title>
  <meta name="description" content="לפני שמעלים קמפיין בדיגיטל — מבינים מה באמת עושים. צ׳ק ליסט חינמי עם 20 פעולות לפני העלייה לאוויר, וקורס דיגיטלי של 22 שיעורים.">
  <meta name="theme-color" content="#10253b">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="he_IL">
  <meta property="og:title" content="אל תצאו פראיירים — צ׳ק ליסט חינמי למפרסמים">
  <meta property="og:description" content="20 פעולות שחייבים לבדוק לפני שמעלים קמפיין בדיגיטל.">
  <meta property="og:image" content="{site}assets/img/hero-sm.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">{json.dumps(course_ld(), ensure_ascii=False)}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Hebrew:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
{css}
/* דף נחיתה */
.lp-board {{ display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(320px, .9fr); gap: 28px; align-items: start; }}
.lp-board .lead-panel {{ position: sticky; top: 24px; }}
.lp-groups {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }}
.lp-group {{ padding: 22px; }}
.lp-group:hover {{ transform: none; }}
.lp-group .icon {{ margin-bottom: 12px; width: 48px; height: 48px; }}
.lp-group h3 {{ font-size: 19px; margin-bottom: 10px; }}
.lp-group ul {{ list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }}
.lp-group li {{ display: grid; grid-template-columns: 28px 1fr; font-size: 14.5px; line-height: 1.55; color: #34506b; }}
.lp-group em {{ font-style: normal; font-weight: 700; color: #1d91d6; font-size: 12.5px; padding-top: 2px; }}
.lp-group:last-child {{ grid-column: 1 / -1; }}
.lp-top {{ display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }}
.lp-top h2 {{ font-size: clamp(28px, 3vw, 38px); }}
@media (max-width: 1000px) {{ .lp-board {{ grid-template-columns: minmax(0, 1fr); }} .lp-board .lead-panel {{ position: static; order: -1; }} }}
@media (max-width: 700px) {{ .lp-groups {{ grid-template-columns: 1fr; }} }}
  </style>
  <script>window.NF_ACCESS="{ACCESS_HASH}";</script>
</head>
<body>
<a class="skip-link" href="#main">דילוג לתוכן</a>
<main id="main">
<section class="hero">
  <div class="container hero-inner">
    <div class="hero-copy">
      <span class="tag tag-solid">צ׳ק ליסט חינמי · 20 פעולות</span>
      <h1 style="margin-top:22px">אל תצאו פראיירים.
        <span class="accent">מבינים מה באמת צריך לעשות לפני שמעלים קמפיין בדיגיטל</span></h1>
      <p class="hero-intro">צ׳ק ליסט חינמי עם 20 פעולות שחייבים לבדוק לפני העלייה לאוויר — וקורס דיגיטלי של 22 שיעורים שעושה סדר בכל עולם הפרסום, מהמודעה ועד המכירה.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#lead">שלחו לי את הצ׳ק ליסט</a>
        <a class="btn btn-ghost" href="{site}">לפרטים על הקורס</a>
      </div>
    </div>
  </div>
</section>

<section class="section" id="lead">
  <div class="container lp-board">
    <div>
      <div class="lp-top"><h2>מה בודקים לפני שמשיקים?</h2><span class="tag tag-teal">20 פעולות · 5 תחומים</span></div>
      <div class="lp-groups">{groups}</div>
    </div>
    <aside class="lead-panel">
      <h3>רוצים את הצ׳ק ליסט ואת כל הפרטים על הקורס?</h3>
      <p>מלאו פרטים וקבלו גישה לצ׳ק ליסט החינמי — עם ההסבר למה כל בדיקה חשובה — ולמידע נוסף על הקורס.</p>
      <div class="lead-mini">{svg("play")}<div><strong>22 שיעורים + 9 כלי עבודה</strong><span>מהמודעה ועד המכירה</span></div></div>
      <form class="lead-form" method="post">
        <label class="sr-only" for="lp-name">שם מלא</label>
        <input id="lp-name" name="name" type="text" autocomplete="name" placeholder="שם מלא" required>
        <label class="sr-only" for="lp-phone">טלפון</label>
        <input id="lp-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="טלפון" required>
        <label class="sr-only" for="lp-email">אימייל</label>
        <input id="lp-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="אימייל" required>
        <button class="btn btn-primary btn-block" type="submit">שלחו לי את הצ׳ק ליסט ואת פרטי הקורס</button>
      </form>
      <div class="lead-note">הפרטים נשמרים לצורך שליחת החומרים בלבד. <a href="{site}privacy.html" style="text-decoration:underline">מדיניות פרטיות</a></div>
    </aside>
  </div>
</section>

<section class="section section-soft">
  <div class="container">
    <div class="section-head">
      <span class="tag">הקורס המלא</span>
      <h2>לא קופצים ישר ל-Facebook Ads</h2>
      <p>22 שיעורים בששה שלבים. קודם מבינים מטרות ומספרים, אחר כך קהל, מסר ותוכן — ורק אז נכנסים ל-Meta ולגוגל, למדידה ולמערכות.</p>
    </div>
    <div class="flow">
{steps}
    </div>
    <div class="center-cta"><a class="btn btn-outline" href="{site}curriculum.html">לתוכנית הלימודים המלאה</a></div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head">
      <span class="tag tag-teal">מבנה כל שיעור</span>
      <h2>תמציתי. מדויק. ליישום מחר בבוקר.</h2>
    </div>
    <div class="format-grid">
{fmt_cards}
    </div>
  </div>
</section>

<section class="section section-soft">
  <div class="container about">
    <div class="about-card">
      <div class="avatar">ע</div>
      <h3>{AUTHOR}</h3>
      <p>מדיה ודיגיטל</p>
    </div>
    <div class="about-copy">
      <span class="tag">קצת עליי</span>
      <h2 style="margin-top:14px">אני {AUTHOR}</h2>
      <p>אני עוסק במדיה ובדיגיטל כבר {YEARS} שנים. ראיתי מקרוב איך קמפיינים נבנים, איך תקציבים מתבזבזים, ואיך בעל העסק מקבל דוח מלא במספרים ועדיין לא יודע מה קרה עם הכסף שלו.</p>
      <div class="quote">הצ׳ק ליסט והקורס נבנו כדי שתבינו מספיק כדי לשאול את השאלות הנכונות, לבדוק עבודה מקצועית ולהיות בשליטה על הכסף והנתונים שלכם.</div>
    </div>
  </div>
</section>

<section class="section">
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
      <p>20 בדיקות לפני כל קמפיין — בחינם.</p>
      <div class="hero-actions"><a class="btn btn-primary" href="#lead">שלחו לי את הצ׳ק ליסט</a></div>
    </div>
  </div>
</section>
</main>
<footer class="site-footer">
  <div class="container">
    <div class="legal-links">
      <a href="{site}accessibility.html">הצהרת נגישות</a>
      <a href="{site}terms.html">תנאי שימוש</a>
      <a href="{site}privacy.html">מדיניות פרטיות</a>
    </div>
    <div class="copyright">© 2026 {AUTHOR} · {COURSE}</div>
  </div>
</footer>
<script>window.NF_CONFIG={{ga4:"{GA4_ID}",pixel:"{META_PIXEL_ID}",privacy:"{site}privacy.html",a11y:"{site}accessibility.html"}};</script>
<script>
{js}
</script>
</body>
</html>
'''
    (ROOT / "landing").mkdir(exist_ok=True)
    (ROOT / "landing/index.html").write_text(html, encoding="utf-8")


if __name__ == "__main__":
    build_index()
    build_curriculum()
    build_lessons()
    build_checklist()
    build_tools()
    build_purchase()
    build_glossary()
    build_welcome()
    build_legal()
    build_seo_files()
    build_landing()
    print(f"נבנו: index, curriculum, checklist, toolkit + {len(TOOLS)} כלים, purchase, glossary ו-22 שיעורים ({TOTAL_MIN} דקות קריאה)")
