/** The Sites screen and its daily check. */
export const AR_SCREENS: Record<string, string> = {
  // how a site is doing
  Working: 'يعمل',
  'Needs a look': 'يحتاج نظرة',
  Broken: 'معطّل',
  'Not checked yet': 'لم يُفحص بعد',

  // page head
  '{n} sites · {titles} titles merged.': '{n} موقع · {titles} عنوان مدمج.',
  "Re-check tests a site like you would use it: title list, a chapter list, a chapter's pages and one image.":
    '«إعادة الفحص» تختبر الموقع كما تستخدمه: قائمة العناوين، وقائمة فصول، وصفحات فصل، وصورة واحدة.',
  'Checking…': 'جارٍ الفحص…',
  'Check all now': 'افحص الكل الآن',
  'Add site': 'إضافة موقع',
  '{n} Yomi Library site is hidden. Turn on "Show the Yomi Library" in Settings to see it.':
    'مواقع مكتبة Yomi المخفية: {n}. فعّل «إظهار مكتبة Yomi» في الإعدادات لتراها.',
  '{n} Yomi Library sites are hidden. Turn on "Show the Yomi Library" in Settings to see them.':
    'مواقع مكتبة Yomi المخفية: {n}. فعّل «إظهار مكتبة Yomi» في الإعدادات لتراها.',
  'No sites yet. Add one from the main screen.':
    'لا توجد مواقع بعد. أضف موقعًا من الشاشة الرئيسية.',

  // a site's row
  '{n} titles': '{n} عنوان',
  'scanning…': 'جارٍ الفحص…',
  'reading genres…': 'جارٍ قراءة التصنيفات…',
  'genres: {genres} · {titles} titles tagged · {when}':
    'التصنيفات: {genres} · {titles} عنوان مصنّف · {when}',
  'no genre pages this site lets the app read': 'لا يتيح هذا الموقع للتطبيق قراءة صفحات التصنيفات',
  'genres: not read yet': 'التصنيفات: لم تُقرأ بعد',
  Details: 'التفاصيل',
  'Hide details': 'إخفاء التفاصيل',
  'Re-scan titles': 'إعادة فحص العناوين',
  "Read this site's genre pages now, so its titles can be filtered by genre":
    'اقرأ صفحات التصنيفات في هذا الموقع الآن، لتتمكن من تصفية عناوينه حسب التصنيف',
  'Read genres': 'قراءة التصنيفات',
  'Re-check': 'إعادة الفحص',
  'Delete this site from Yomi': 'حذف هذا الموقع من Yomi',
  'Fixed by itself:': 'أُصلح تلقائيًا:',
  'broken since {when}': 'تعطّل {when}',

  // details
  'Your last {n} series opens: {ok} fine, {cut} cut short, {failed} failed (latest {when})':
    'آخر {n} مرة فتحت فيها سلسلة: {ok} سليمة، {cut} انقطعت، {failed} فشلت (آخرها {when})',
  'Your last {n} series opens: {ok} fine, {cut} cut short, {failed} failed':
    'آخر {n} مرة فتحت فيها سلسلة: {ok} سليمة، {cut} انقطعت، {failed} فشلت',
  'No series opened from this site yet.': 'لم تُفتح أي سلسلة من هذا الموقع بعد.',
  'last error: {error}': 'آخر خطأ: {error}',
  'Out of rotation': 'مُستبعَد مؤقتًا',
  Unsteady: 'غير مستقر',
  'since {when}': 'بدأ {when}',
  'the old address is tried again in {n} min': 'يُجرَّب الرابط القديم مجددًا بعد {n} د',
  'the old address is being tried again': 'يُجرَّب الرابط القديم مجددًا الآن',
  'back up': 'عاد للعمل',
  degraded: 'غير مستقر',
  down: 'متوقف',
  'Last re-check {when}:': 'آخر إعادة فحص {when}:',
  'Title list': 'قائمة العناوين',
  'Chapter list': 'قائمة الفصول',
  'Chapter pages': 'صفحات الفصل',
  Image: 'الصورة',
  '{n} s': '{n} ث',
  'Not re-checked yet. Press Re-check.': 'لم يُعَد فحصه بعد. اضغط «إعادة الفحص».',

  // the daily check
  'Daily check': 'الفحص اليومي',
  'Checking {n} of {total}: {site}…': 'جارٍ فحص {n} من {total}: {site}…',
  'Checking {n} of {total}: {site} ({doing})…': 'جارٍ فحص {n} من {total}: {site} ({doing})…',
  'reading its title list again': 'يعيد قراءة قائمة عناوينه',
  '{n} working': 'يعمل: {n}',
  '{n} needs a look': 'يحتاج نظرة: {n}',
  '{n} need a look': 'يحتاج نظرة: {n}',
  '{n} broken': 'معطّل: {n}',
  'the daily check is off in Settings': 'الفحص اليومي متوقف في الإعدادات',
  'Every site is tried once a day in the background (it waits while you read). The first run starts a few minutes after Yomi opens.':
    'يُجرَّب كل موقع مرة يوميًا في الخلفية (وينتظر أثناء قراءتك). يبدأ أول فحص بعد دقائق من فتح Yomi.',
  'Off in Settings. "Check all now" still runs it once.':
    'متوقف في الإعدادات. زر «افحص الكل الآن» يشغّله مرة واحدة رغم ذلك.',
  'The daily check, last 14 days': 'الفحص اليومي، آخر 14 يومًا',
  worked: 'عمل',
  'half worked': 'عمل جزئيًا',
  broken: 'معطّل',

  // what the daily check found (templates from the main process; {step} and {detail} are filled in there)
  'Everything works: titles, chapters, pages and pictures.':
    'كل شيء يعمل: العناوين والفصول والصفحات والصور.',
  'Works, with a catch. {step}: {detail}.': 'يعمل، مع ملاحظة. {step}: {detail}.',
  'No titles are saved for this site, so there was nothing to open.':
    'لا توجد عناوين محفوظة لهذا الموقع، فلم يكن هناك ما يُفتح.',
  'The site asks for a "verify you are human" check. Open one of its series in Yomi and pass the check once.':
    'يطلب الموقع اختبار «تحقّق من أنك إنسان». افتح إحدى سلاسله في Yomi واجتز الاختبار مرة واحدة.',
  'The site seems to have moved to a new address. Yomi looks for it and switches over by itself.':
    'يبدو أن الموقع انتقل إلى رابط جديد. يبحث عنه Yomi وينتقل إليه تلقائيًا.',
  "The site didn't answer. It may be down for now; Yomi tries again later and uses your other sites meanwhile.":
    'لم يستجب الموقع. ربما هو متوقف حاليًا؛ سيحاول Yomi مجددًا لاحقًا ويستخدم مواقعك الأخرى في الأثناء.',
  'The site answered with an error ({detail}). It is often down for a short while; Yomi tries again later.':
    'ردّ الموقع بخطأ ({detail}). غالبًا ما يتوقف لفترة قصيرة؛ سيحاول Yomi مجددًا لاحقًا.',
  'Chapters open, but the site refused to send the pictures. Yomi reads those chapters from your other sites.':
    'الفصول تُفتح، لكن الموقع رفض إرسال الصور. يقرأ Yomi تلك الفصول من مواقعك الأخرى.',
  "The site seems to have changed how its pages are built, so Yomi can't read its chapter lists right now ({detail}).":
    'يبدو أن الموقع غيّر طريقة بناء صفحاته، لذا لا يستطيع Yomi قراءة قوائم فصوله الآن ({detail}).',
  "The site seems to have changed how its pages are built, so Yomi can't read its chapter pages right now ({detail}).":
    'يبدو أن الموقع غيّر طريقة بناء صفحاته، لذا لا يستطيع Yomi قراءة صفحات فصوله الآن ({detail}).',
  '{step}: {detail}.': '{step}: {detail}.',
  'Yomi read its title list again, and it works now.':
    'أعاد Yomi قراءة قائمة عناوينه، وهو يعمل الآن.'
}
