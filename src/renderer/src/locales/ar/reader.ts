/** The reader (bar, reading settings, end of chapter), the magnifying glass, your reading stats and the share card. */
export const AR_READER: Record<string, string> = {
  // ---- opening a chapter ----
  '{series} · {chapter} (saved)': '{series} · {chapter} (محفوظ)',
  'No manga pages found on that chapter page.': 'لم نجد صفحات مانجا في صفحة هذا الفصل.',
  '{site} is down. Looking for another copy…': '{site} متوقف حاليًا. نبحث عن نسخة أخرى…',
  "{site} didn't open this chapter. Looking for it on your other sites…":
    'لم يفتح {site} هذا الفصل. نبحث عنه في مواقعك الأخرى…',
  "Opened from {other} — {site} didn't load this chapter.":
    'فُتح من {other}، لأن {site} لم يحمّل هذا الفصل.',
  'Trying {site}…': 'نجرّب {site}…',
  'Opening chapter and collecting pages…': 'جارٍ فتح الفصل وجمع الصفحات…',

  // ---- the bar ----
  'Back to the chapter list (Esc)': 'رجوع إلى قائمة الفصول (Esc)',
  'Previous chapter': 'الفصل السابق',
  'Next chapter': 'الفصل التالي',
  'All chapters': 'كل الفصول',
  'Ch. {n}': 'فصل {n}',
  'Page width (- / + keys, or Ctrl + wheel)': 'عرض الصفحة (المفتاحان - و+، أو Ctrl مع عجلة الفأرة)',
  'Narrower pages': 'صفحات أضيق',
  'Wider pages': 'صفحات أعرض',
  'Zoom in on a page (Z). Scroll to zoom, drag to move':
    'تكبير جزء من الصفحة (Z). مرّر للتكبير، واسحب للتحريك',
  'Zoom in on a page': 'تكبير جزء من الصفحة',
  'Mini reader: a small window that stays on top':
    'القارئ المصغّر: نافذة صغيرة تبقى فوق النوافذ الأخرى',
  'Mini reader': 'القارئ المصغّر',
  'Download this chapter': 'تنزيل هذا الفصل',
  'Full screen': 'ملء الشاشة',
  'Reading settings': 'إعدادات القراءة',

  // ---- reading settings ----
  Brightness: 'السطوع',
  Darker: 'أغمق',
  // the marks around [ and ] keep the key from being drawn mirrored in Arabic text
  'Darker ( [ )': 'أغمق ( \u200E[\u200E )',
  'Page brightness': 'سطوع الصفحة',
  Brighter: 'أفتح',
  'Brighter ( ] )': 'أفتح ( \u200E]\u200E )',
  'Reading mode': 'طريقة القراءة',
  'Scroll down': 'تمرير عمودي',
  'Page by page': 'صفحة بصفحة',
  Mode: 'الوضع',
  Direction: 'الاتجاه',
  'Right to left': 'من اليمين لليسار',
  'Left to right': 'من اليسار لليمين',
  Pages: 'الصفحات',
  'Single page': 'صفحة واحدة',
  'Two pages': 'صفحتان',
  'Cover on its own': 'الغلاف وحده',
  'By type': 'حسب النوع',
  On: 'تشغيل',
  Off: 'إيقاف',
  'On — manga RTL, manhwa scroll': 'تشغيل — المانجا من اليمين لليسار، والمانهوا بالتمرير',
  'Apply to': 'التطبيق على',
  'This series': 'هذه السلسلة',
  'All series': 'كل السلاسل',
  'Reset to default': 'العودة إلى الافتراضي',
  'Extras (all optional)': 'إضافات (كلها اختيارية)',
  'Shortcut: F': 'الاختصار: F',
  Fit: 'ملء',
  Width: 'العرض',
  Height: 'الارتفاع',
  'At the end of a chapter, keep scrolling down to open the next one':
    'في نهاية الفصل، واصل التمرير لأسفل لفتح الفصل التالي',
  'Scroll on to next chapter': 'تمرير متواصل',
  Background: 'الخلفية',
  Theme: 'حسب المظهر',
  Black: 'أسود',
  Sepia: 'بني فاتح',
  'Shortcut: A · Up / Down arrows change the speed':
    'الاختصار: A · السهمان للأعلى وللأسفل يغيّران السرعة',
  'Works in vertical scroll': 'يعمل في التمرير العمودي',
  'Auto-scroll': 'تمرير تلقائي',
  'The speed control at the bottom while auto-scrolling':
    'شريط السرعة في الأسفل أثناء التمرير التلقائي',
  'Auto-scroll controls': 'أدوات التمرير التلقائي',
  'Hide by themselves': 'تختفي وحدها',
  'Always show': 'ظاهرة دائمًا',
  'Never show': 'مخفية دائمًا',
  'Page colour': 'لون الصفحة',
  Original: 'الأصلي',
  'Warm (night)': 'دافئ (ليلي)',
  Dim: 'خافت',
  Gray: 'رمادي',
  'Makes blurry, low-quality pages crisper': 'يجعل الصفحات الضبابية ومنخفضة الجودة أوضح',
  Sharpen: 'زيادة الحدة',
  'Cuts the plain white or black margins around pages': 'يقص الهوامش البيضاء أو السوداء حول الصفحات',
  'Cut white borders': 'قص الحواف البيضاء',
  'Pages {a}–{b} of {n}': 'الصفحات {a}–{b} من {n}',
  'Page {i} of {n}': 'الصفحة {i} من {n}',
  '{n} pages': 'الصفحات: {n}',

  // ---- auto-scroll ----
  Slower: 'أبطأ',
  Faster: 'أسرع',
  'Auto-scroll speed': 'سرعة التمرير التلقائي',
  'Drag to set the speed (or use the Up / Down arrows)':
    'اسحب لضبط السرعة (أو استخدم السهمين للأعلى وللأسفل)',
  'Shortcut: A': 'الاختصار: A',
  Stop: 'إيقاف',

  // ---- pages and the end of a chapter ----
  'Pages still downloading': 'لا تزال الصفحات قيد التنزيل',
  '{done}/{n} pages': 'الصفحات {done}/{n}',
  'Pages are still loading · {done} of {n}': 'لا تزال الصفحات قيد التحميل · {done} من {n}',
  "1 page didn't load. Scroll up and press Try again on it.":
    'لم تُحمَّل صفحة واحدة. مرّر للأعلى واضغط «حاول مرة أخرى» عليها.',
  "{n} pages didn't load. Scroll up and press Try again on it.":
    'لم تُحمَّل {n} صفحة. مرّر للأعلى واضغط «حاول مرة أخرى» على كل منها.',
  'End of {chapter}': 'نهاية {chapter}',
  'Up next: {chapter}': 'التالي: {chapter}',
  "You're all caught up": 'وصلت إلى آخر فصل',
  'or keep scrolling down': 'أو واصل التمرير لأسفل',
  "Page {n} didn't load": 'لم تُحمَّل الصفحة {n}',
  'Loading page {n} of {of}…': 'جارٍ تحميل الصفحة {n} من {of}…',

  // ---- magnifying glass ----
  'Zoom out (-)': 'تصغير (-)',
  'Zoom in (+)': 'تكبير (+)',
  'Close (Esc)': 'إغلاق (Esc)',

  // ---- your reading (stats) ----
  '{n} min': '{n} دقيقة',
  '{h} h {m} min': '{h} ساعة و{m} دقيقة',
  '{n} h': '{n} ساعة',
  'Your reading': 'قراءتك',
  'Counted on this computer as you read: each chapter the first time you finish it, and time in the reader.':
    'تُحسب على هذا الجهاز أثناء قراءتك: كل فصل عند إنهائه أول مرة، والوقت الذي تقضيه في القارئ.',
  'Nothing yet. Finish a chapter and it shows up here.': 'لا شيء بعد. أنهِ فصلًا وسيظهر هنا.',
  'This week': 'هذا الأسبوع',
  Streak: 'أيام متتالية',
  'All time': 'منذ البداية',
  chapter: 'فصل',
  chapters: 'فصل',
  day: 'يوم',
  days: 'يوم',
  '{time} reading': '{time} من القراءة',
  'Longest: 1 day': 'الأطول: يوم واحد',
  'Longest: {n} days': 'الأطول: {n} يوم',
  'Top genres': 'أكثر التصنيفات',
  'Last 90 days, by chapters read': 'آخر 90 يومًا، حسب الفصول المقروءة',
  'Genres show up once the series you read have them.':
    'تظهر التصنيفات عندما تكون للسلاسل التي تقرؤها تصنيفات.',
  'Most read': 'الأكثر قراءة',
  'Last 90 days': 'آخر 90 يومًا',
  'Chapters per day': 'الفصول يوميًا',
  'Last 30 days': 'آخر 30 يومًا',
  'Chapters read per day for the last 30 days': 'الفصول المقروءة يوميًا خلال آخر 30 يومًا',
  '1 chapter': 'فصل واحد',
  '{n} chapters': '{n} فصل',
  'Chapters and reading time per day, last 30 days': 'الفصول ووقت القراءة يوميًا، آخر 30 يومًا',
  Today: 'اليوم',

  // ---- share card ----
  "I'm on {chapter} of {n}": 'وصلت إلى {chapter} من {n}',
  "I'm on {chapter}": 'وصلت إلى {chapter}',
  'Read it on Yomi': 'اقرأها على Yomi'
}
