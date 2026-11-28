/** The window around the screens: title bars, top bar, banners, status bar, Quick Open and the theme button. */
export const AR_APP: Record<string, string> = {
  // a screen that crashed while drawing
  'Something went wrong on this screen: {error}': 'حدث خطأ في هذه الشاشة: {error}',
  'Reload the app': 'إعادة تحميل التطبيق',

  // title bars
  Minimize: 'تصغير',
  Maximize: 'تكبير',
  mini: 'مصغّر',
  'Unpin from top': 'إلغاء التثبيت في الأعلى',
  'Pin on top': 'تثبيت في الأعلى',
  'Stays above other windows': 'يبقى فوق النوافذ الأخرى',
  'Pin above other windows': 'تثبيت فوق النوافذ الأخرى',
  'Open in Yomi': 'فتح في Yomi',
  'Continue in the main window': 'المتابعة في النافذة الرئيسية',
  'Close mini reader': 'إغلاق القارئ المصغّر',
  'Close the mini reader': 'إغلاق القارئ المصغّر',

  // banners
  "Yomi's screen restarted because your PC ran out of memory.":
    'أُعيد تشغيل شاشة Yomi لأن ذاكرة جهازك نفدت.',
  "Close some other apps (or turn Windows' page file back on) to stop it happening again.":
    'أغلق بعض التطبيقات الأخرى (أو أعد تفعيل ملف ترحيل الصفحات في Windows) حتى لا يتكرر ذلك.',
  'Your progress is saved.': 'تقدّمك محفوظ.',
  "Yomi's screen crashed and restarted": 'تعطّلت شاشة Yomi وأُعيد تشغيلها',
  'Keep reading in your browser': 'تابع القراءة في متصفحك',
  'Your library is still loading from disk.': 'لا تزال مكتبتك تُحمَّل من القرص.',
  "Your sites and progress are safe — Yomi can't read the file this very second and is trying again. Nothing is being overwritten.":
    'مواقعك وتقدّمك في أمان — لا يستطيع Yomi قراءة الملف في هذه اللحظة ويحاول مجددًا. لا يُكتب فوق أي شيء.',
  'Try again now': 'حاول الآن',
  'is ready. It installs when you close Yomi, or now:': 'جاهز. يُثبَّت عند إغلاق Yomi، أو الآن:',
  'Restart and update': 'إعادة التشغيل والتحديث',
  Later: 'لاحقًا',

  // top bar
  'Yomi home': 'الصفحة الرئيسية في Yomi',
  'Main navigation': 'التنقل الرئيسي',
  Discover: 'استكشاف',
  New: 'الجديد',
  Following: 'المتابَعة',
  'Added by me': 'أضفتُها',
  Downloads: 'التنزيلات',
  Sites: 'المواقع',
  Stats: 'الإحصائيات',
  Settings: 'الإعدادات',
  'Search catalog': 'البحث في الفهرس',
  'Search {n} titles across all your sites…': 'ابحث في {n} عنوان على كل مواقعك…',
  'Quick Open: jump to any screen or series (Ctrl+P)':
    'فتح سريع: انتقل إلى أي شاشة أو سلسلة (Ctrl+P)',

  // status bar
  titles: 'عنوان',
  '{n} sites': '{n} موقع',
  'The mini reader is open': 'القارئ المصغّر مفتوح',
  'Mini reader': 'القارئ المصغّر',
  '+ {n} more': '+ {n} أخرى',
  'Checked for new chapters {when}': 'فُحصت الفصول الجديدة {when}',

  // Quick Open
  'Quick open': 'فتح سريع',
  'Go to a screen, a series you read, or any title…':
    'انتقل إلى شاشة، أو سلسلة تقرؤها، أو أي عنوان…',
  Screen: 'شاشة',
  'Continue · {chapter} · {site}': 'متابعة القراءة · {chapter} · {site}',
  reading: 'قيد القراءة',
  'Following · {n} new · {site}': 'متابَعة · {n} جديد · {site}',
  'Following · {site}': 'متابَعة · {site}',
  'On {n} sites': 'على {n} موقع',
  'Type to search': 'اكتب للبحث',
  'Nothing found': 'لا توجد نتائج',

  // theme button
  'Dark theme': 'المظهر الداكن',
  'Light theme': 'المظهر الفاتح',
  'Switch theme': 'تبديل المظهر'
}
