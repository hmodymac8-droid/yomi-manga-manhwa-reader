/** The Settings screen (the Language section is written in both languages and needs nothing here). */
export const AR_SETTINGS: Record<string, string> = {
  'How Yomi looks and what it shows you.': 'كيف يبدو Yomi وما يعرضه لك.',

  // Yomi Library
  'Yomi Library': 'مكتبة Yomi',
  'Ready-made sites that come with your Yomi account: their titles and genres are already loaded, so you can search and read straight away. Sites you add yourself are always shown.':
    'مواقع جاهزة تأتي مع حسابك في Yomi: عناوينها وتصنيفاتها محمّلة مسبقًا، فتستطيع البحث والقراءة فورًا. المواقع التي تضيفها بنفسك تظهر دائمًا.',
  '{n} Library site · {titles} titles on this computer.':
    'مواقع المكتبة: {n} · {titles} عنوان على هذا الجهاز.',
  '{n} Library sites · {titles} titles on this computer.':
    'مواقع المكتبة: {n} · {titles} عنوان على هذا الجهاز.',
  'No Library sites on this computer yet. They arrive when you sign in to your Yomi account.':
    'لا توجد مواقع من المكتبة على هذا الجهاز بعد. تصل عند تسجيل الدخول إلى حسابك في Yomi.',
  'Hiding them keeps everything saved; turn this back on to see them again.':
    'إخفاؤها يُبقي كل شيء محفوظًا؛ فعّل هذا الخيار مجددًا لتراها.',
  'Show the Yomi Library': 'إظهار مكتبة Yomi',

  // Auto-download
  'Auto-download new chapters': 'التنزيل التلقائي للفصول الجديدة',
  'When a series you follow gets a new chapter, Yomi downloads it for you so it is ready to read, even offline. You can also turn this on or off for each series on its card in Following.':
    'عندما يصدر فصل جديد لسلسلة تتابعها، ينزّله Yomi لك ليكون جاهزًا للقراءة، حتى دون اتصال. يمكنك أيضًا تشغيل هذا أو إيقافه لكل سلسلة من بطاقتها في المتابَعة.',
  'For all followed series': 'لكل السلاسل المتابَعة',

  // Recommendations
  Recommendations: 'الاقتراحات',
  "“Similar on your sites” on a series page and “Because you read” on Discover come from AniList's community recommendations. To get them, Yomi sends AniList the title of the series you open or read recently (no account, nothing else). Answers are kept for a week.":
    '«مشابهة على مواقعك» في صفحة السلسلة و«لأنك قرأت» في الاستكشاف تأتي من اقتراحات مجتمع AniList. للحصول عليها، يرسل Yomi إلى AniList عنوان السلسلة التي تفتحها أو قرأتها مؤخرًا (دون حساب، ولا شيء غير ذلك). تُحفظ الإجابات لمدة أسبوع.',
  'Show recommendations': 'إظهار الاقتراحات',

  // Daily site check
  'Daily site check': 'الفحص اليومي للمواقع',
  "Once a day Yomi tries every site the way you use it: its titles, a chapter list, a chapter's pages and one picture. It waits while you read. When a site breaks you get a notice and Sites says why; simple problems are fixed by themselves.":
    'مرة كل يوم يجرّب Yomi كل موقع كما تستخدمه: عناوينه، وقائمة فصول، وصفحات فصل، وصورة واحدة. وينتظر أثناء قراءتك. عندما يتعطّل موقع يصلك إشعار وتوضّح شاشة المواقع السبب؛ أما المشكلات البسيطة فتُصلَح تلقائيًا.',
  'Check my sites every day': 'افحص مواقعي كل يوم',

  // MyAnimeList
  "Shows a series' MyAnimeList score and rank on its page, and MyAnimeList's top lists on Discover (only the titles on your sites). To get them, Yomi sends MyAnimeList the title of the series you open (no account, nothing else). Answers are kept for a week.":
    'يعرض تقييم السلسلة وترتيبها في MyAnimeList على صفحتها، وقوائم MyAnimeList الأعلى تقييمًا في الاستكشاف (العناوين الموجودة على مواقعك فقط). للحصول عليها، يرسل Yomi إلى MyAnimeList عنوان السلسلة التي تفتحها (دون حساب، ولا شيء غير ذلك). تُحفظ الإجابات لمدة أسبوع.',
  'Show MyAnimeList': 'إظهار MyAnimeList',

  // Discord
  'Shows “Playing Yomi” on your Discord profile while the app is open, with the series and chapter you are reading. It only talks to the Discord app on this computer.':
    'يعرض «Playing Yomi» في ملفك على Discord ما دام التطبيق مفتوحًا، مع السلسلة والفصل اللذين تقرؤهما. ولا يتصل إلا بتطبيق Discord على هذا الجهاز.',
  'Show on Discord': 'الظهور على Discord',
  "Show what I'm reading": 'إظهار ما أقرؤه',

  // Tracking (AniList)
  Tracking: 'التتبّع',
  'Connect AniList to update your reading progress when you finish a chapter. This stays off until you add a client ID and sign in. Linked series, and how to register a client, are explained in the README.':
    'اربط AniList ليُحدَّث تقدّم قراءتك عند إنهاء فصل. يبقى هذا متوقفًا حتى تضيف معرّف العميل (Client ID) وتسجّل الدخول. السلاسل المرتبطة وطريقة تسجيل عميل مشروحة في ملف README.',
  'Connected as {name}.': 'متصل باسم {name}.',
  'Connected.': 'متصل.',
  'Client ID saved. Press Connect AniList to sign in.':
    'حُفظ معرّف العميل. اضغط «ربط AniList» لتسجيل الدخول.',
  'No client ID yet. Register an AniList API client and paste the ID below.':
    'لا يوجد معرّف عميل بعد. سجّل عميل API في AniList والصق المعرّف أدناه.',
  'Client ID': 'معرّف العميل',
  'AniList client ID': 'معرّف عميل AniList',
  'Import finished: {updated} updated, {skipped} already ahead or equal, {failed} failed. Local progress never moved backward.':
    'انتهى الاستيراد: حُدّث {updated}، و{skipped} متقدّمة أو مساوية من قبل، وفشل {failed}. لم يرجع التقدّم المحلي إلى الوراء.',
  Disconnect: 'قطع الاتصال',
  'Connecting…': 'جارٍ الاتصال…',
  'Connect AniList': 'ربط AniList',
  'Import progress from AniList': 'استيراد التقدّم من AniList',

  // Mihon / Tachiyomi import
  'Import from Mihon or Tachiyomi': 'الاستيراد من Mihon أو Tachiyomi',
  'Choose a backup file (.tachibk) made in Mihon, Tachiyomi or a fork of them. Every series in its library is found on your sites, followed on the matching shelf, and the chapters you read there are marked read here. Nothing in Yomi is removed or moved back.':
    'اختر ملف نسخة احتياطية (.tachibk) أُنشئ في Mihon أو Tachiyomi أو أحد تفرّعاتهما. يُبحث عن كل سلسلة في مكتبته على مواقعك وتُتابَع على الرف المطابق، وتُعلَّم الفصول التي قرأتها هناك كمقروءة هنا. لا يُحذف شيء من Yomi ولا يرجع أي تقدّم إلى الوراء.',
  'Looking at “{title}”': 'جارٍ فحص «{title}»',
  'Finishing…': 'جارٍ الإنهاء…',
  "Couldn't import: {error}": 'تعذّر الاستيراد: {error}',
  '{n} series in the backup': 'السلاسل في النسخة الاحتياطية: {n}',
  '{n} now followed': 'تُتابَع الآن: {n}',
  '{n} already followed': 'متابَعة من قبل: {n}',
  'read chapters added for {n} ({chapters} chapters)':
    'أُضيفت الفصول المقروءة إلى {n} سلسلة ({chapters} فصل)',
  '{n} not on your sites': 'غير موجودة على مواقعك: {n}',
  'Importing…': 'جارٍ الاستيراد…',
  'Choose backup…': 'اختيار نسخة احتياطية…',

  // Updates
  Updates: 'التحديثات',
  'New versions download by themselves in the background. When one is ready you can restart now to install it, or it installs the next time you close Yomi. Your library and settings are kept.':
    'تُنزَّل الإصدارات الجديدة تلقائيًا في الخلفية. عندما يجهز أحدها يمكنك إعادة التشغيل الآن لتثبيته، أو يُثبَّت في المرة القادمة التي تغلق فيها Yomi. تبقى مكتبتك وإعداداتك كما هي.',
  'Version {v}.': 'الإصدار {v}.',
  'Yomi looks for updates when it starts and every few hours.':
    'يبحث Yomi عن التحديثات عند تشغيله وكل بضع ساعات.',
  'Looking for a newer version…': 'جارٍ البحث عن إصدار أحدث…',
  'You have the newest version.': 'لديك أحدث إصدار.',
  'You have the newest version. Last checked {when}.': 'لديك أحدث إصدار. آخر تحقق: {when}.',
  'Downloading Yomi {version}… {percent}%': 'جارٍ تنزيل Yomi {version}… {percent}%',
  'Yomi {version} is downloaded and ready to install.': 'نُزّل Yomi {version} وهو جاهز للتثبيت.',
  "Couldn't check for updates: {error}": 'تعذّر التحقق من التحديثات: {error}',
  'Updates are only checked in the installed app.': 'يُتحقَّق من التحديثات في التطبيق المثبّت فقط.',
  'Check for updates': 'التحقق من التحديثات'
}
