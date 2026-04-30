// i18n/locales/ur.ts
// Urdu — Pakistan's national language. Right-to-left.
//
// Notes:
//   - We avoid Romanized "Urdu" (Roman Urdu) because the audience reading
//     Urdu mode expects native script. Pakistani financial Urdu mixes
//     Persian-Arabic loanwords (حساب، رقم، خرچ) with English fintech terms
//     ("notification" stays English in many UIs); we keep the technical
//     ones English when they're more recognised that way (SMS, FlowMoney,
//     Groq) and translate the user-facing concepts.
//   - Numbers / currency stay LTR even on RTL pages — i18n-js doesn't auto
//     flip those, but our money formatter outputs Western digits anyway.

import type { Translations } from './en';

export const ur: Translations = {
  common: {
    cancel: 'منسوخ',
    delete: 'حذف کریں',
    done: 'مکمل',
    save: 'محفوظ کریں',
    ok: 'ٹھیک ہے',
    notNow: 'ابھی نہیں',
    seeAll: 'سب دیکھیں',
    more: 'مزید',
    today: 'آج',
    yesterday: 'کل',
    income: 'آمدنی',
    monthSuffix: '/ماہ',
    perDay: 'یومیہ',
  },

  greeting: {
    morning: 'صبح بخیر',
    afternoon: 'دوپہر بخیر',
    evening: 'شام بخیر',
  },

  ask: {
    label: 'پوچھیں',
  },

  onboarding: {
    welcome: {
      eyebrow: 'خوش آمدید',
      headline: 'آپ کی رقم،\nاب واضح۔',
      subtext:
        'FlowMoney آپ کے بینک الرٹس پڑھ کر آپ کی مالی زندگی کی تصویر بناتا ہے۔ کوئی مینوئل اندراج نہیں۔ کوئی اسپریڈشیٹ نہیں۔',
      cta: 'شروع کریں',
    },
    privacy: {
      eyebrow: 'پہلے رازداری',
      headline: 'آپ کا ڈیٹا کبھی\nفون سے باہر نہیں جاتا۔',
      subtext:
        'ہم صرف ٹرانزیکشن الرٹس پڑھتے ہیں — کبھی ذاتی پیغامات نہیں۔ سب کچھ آپ کے فون پر ہی پراسیس ہوتا ہے۔ FlowMoney کا کوئی سرور نہیں ہے۔',
      cta: 'یہ مجھے قبول ہے',
    },
    goal: {
      eyebrow: 'ایک آخری بات',
      headline: 'آپ کے لیے سب سے\nزیادہ کیا اہم ہے؟',
      subtext: 'یہ طے کرتا ہے کہ ہم آپ کی رقم کیسے دکھائیں۔',
      saveMoney: { label: 'زیادہ بچت کرنا', sub: 'جانیں کیا چیز روک رہی ہے' },
      controlSpending: {
        label: 'اخراجات قابو میں رکھنا',
        sub: 'ہر روپیہ کہاں جاتا ہے، جانیں',
      },
      justTrack: { label: 'ابھی صرف ٹریک کرنا', sub: 'بغیر دباؤ کے آگاہی' },
      finish: 'ٹریکنگ شروع کریں',
    },
  },

  home: {
    todayLabel: 'آج آپ نے خرچ کیا',
    weekLabel: 'اس ہفتے',
    monthLabel: 'اس ماہ',
    sectionWeekly: 'گزشتہ 7 دن',
    sectionPattern: 'پیٹرن',
    sectionPatterns: 'پیٹرنز',
    sectionRecent: 'حالیہ',
    addAccessibility: 'ٹرانزیکشن شامل کریں',
    askAccessibility: 'منی اسسٹنٹ سے پوچھیں',
    emptyNoSms: {
      title: 'آئیں آپ کی رقم دیکھیں',
      description:
        'SMS کنیکٹ کریں تاکہ FlowMoney بینک الرٹس پڑھ کر آپ کے اخراجات کی واضح تصویر بنا سکے۔',
      cta: 'SMS کنیکٹ کریں',
    },
    emptyHasSms: {
      title: 'ابھی کوئی ٹرانزیکشن نہیں',
      description:
        'جیسے ہی بینک الرٹ آئے گا، یہاں نظر آئے گا۔ آپ مینوئل بھی شامل کر سکتے ہیں۔',
      cta: 'مینوئل شامل کریں',
    },
  },

  feed: {
    title: 'ٹرانزیکشنز',
    countThisMonth: 'اس ماہ {{count}}',
    filters: {
      all: 'سب',
      food: 'کھانا',
      transport: 'ٹرانسپورٹ',
      shopping: 'خریداری',
      bills: 'بل',
      entertainment: 'تفریح',
      subscriptions: 'سبسکرپشنز',
      other: 'دیگر',
    },
    emptyAll: {
      title: 'ابھی کوئی ٹرانزیکشن نہیں',
      description: 'جیسے ہی بینک الرٹ آئے گا یا آپ مینوئل شامل کریں گے، یہاں نظر آئے گا۔',
    },
    emptyFiltered: {
      title: 'اس زمرے میں کچھ نہیں',
      description: 'کوئی اور فلٹر آزمائیں، یا ہوم سے اس زمرے میں ٹرانزیکشن شامل کریں۔',
    },
  },

  subscriptionAlert: {
    title: '{{count}} سبسکرپشن غیر استعمال شدہ',
    titlePlural: '{{count}} سبسکرپشنز غیر استعمال شدہ',
    bodyOne: '{{amount}}/ماہ ایسی سروس کے لیے جسے آپ نے حالیہ نہیں کھولا۔',
    bodyMany: '{{amount}}/ماہ ایسی سروسز کے لیے جنہیں آپ نے حالیہ نہیں کھولا۔',
  },

  insights: {
    title: 'انسائٹس',
    subtitle: 'آپ کے اخراجات کیا کہتے ہیں',
    heroLabel: 'اس ماہ',
    monthlyChange: '{{change}} گزشتہ ماہ کے مقابلے میں',
    sectionWhereItGoes: 'کہاں جاتا ہے',
    sectionSubscriptions: 'سبسکرپشنز',
    sectionPatterns: 'پیٹرنز',
    sectionQuickStats: 'اہم اعداد',
    statDailyAverage: 'یومیہ اوسط',
    statVsLastMonth: 'گزشتہ ماہ کے مقابلے',
    subUnused: '{{count}} غیر استعمال شدہ',
    subActive: 'فعال',
    subNotUsed: 'حالیہ استعمال نہیں',
    emptyNoInsights: {
      title: 'ابھی کوئی انسائٹ نہیں',
      description:
        'جیسے جیسے آپ کی ٹرانزیکشنز بڑھیں گی، FlowMoney یہاں پیٹرنز اور غیر استعمال شدہ سبسکرپشنز سامنے لائے گا۔',
    },
  },

  profile: {
    title: 'پروفائل',
    yourGoal: 'آپ کا مقصد',
    goalNotSet: 'متعین نہیں',
    goalSaveMoney: 'زیادہ بچت کرنا',
    goalControlSpending: 'اخراجات قابو میں رکھنا',
    goalJustTrack: 'ابھی صرف ٹریک کرنا',
    sectionStats: 'اعداد',
    sectionSettings: 'ترتیبات',
    spentThisMonth: 'اس ماہ خرچ',
    dailyAverage: 'یومیہ اوسط',
    vsLastMonth: 'گزشتہ ماہ کے مقابلے',
    notifications: 'نوٹیفیکیشنز',
    notificationsHint: 'جب ٹرانزیکشن کا پتا چلے تو مجھے مطلع کریں',
    smsReading: 'SMS ریڈنگ',
    smsActive: 'فعال',
    smsTapToEnable: 'فعال کرنے کے لیے دبائیں',
    currency: 'کرنسی',
    language: 'زبان',
    privacyTitle: 'صرف ڈیوائس پر',
    privacyText:
      'آپ کی ٹرانزیکشنز کبھی فون سے باہر نہیں جاتیں۔ SMS مقامی طور پر پارس ہوتے ہیں۔ FlowMoney کا کوئی سرور نہیں ہے۔',
    version: 'FlowMoney {{version}}',
    androidOnlyTitle: 'صرف اینڈرائیڈ',
    androidOnlyMessage: 'SMS پر مبنی ٹریکنگ صرف اینڈرائیڈ پر دستیاب ہے۔',
  },

  chat: {
    headerTitle: 'منی اسسٹنٹ',
    backButton: 'مکمل',
    newChat: 'نیا',
    newChatAccessibility: 'نیا چیٹ شروع کریں',
    welcome:
      'اس ماہ آپ کے اخراجات {{amount}} ہیں۔ اپنی رقم کے بارے میں کچھ بھی پوچھیں — مجھے آپ کی پوری ٹرانزیکشن ہسٹری نظر آتی ہے۔',
    inputPlaceholder: 'اپنے اخراجات کے بارے میں پوچھیں...',
    quickPromptsLabel: 'کچھ پوچھیں',
    sendButton: 'بھیجیں',
    cooldown: '{{seconds}} ث',
    quickPrompts: {
      overspending: 'میں کہاں زیادہ خرچ کر رہا ہوں؟',
      afford: 'کیا میں اس ہفتے کچھ خرید سکتا ہوں؟',
      saveMore: 'میں مزید کیسے بچا سکتا ہوں؟',
      biggestHabit: 'میری سب سے بڑی عادت کیا ہے؟',
    },
    errors: {
      noKey: 'Groq API کلید غائب۔ .env میں EXPO_PUBLIC_GROQ_API_KEY سیٹ کریں۔',
      generic: 'ابھی کنکشن نہیں ہو سکا۔ انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔',
    },
  },

  addTransaction: {
    title: 'ٹرانزیکشن شامل کریں',
    typeSpent: 'خرچ',
    typeReceived: 'موصول',
    amountPlaceholder: '0.00',
    merchantPlaceholder: 'مرچنٹ یا تفصیل',
    categoryLabel: 'زمرہ',
    save: 'ٹرانزیکشن محفوظ کریں',
    errorEnterNumber: 'نمبر درج کریں',
    errorMustBePositive: 'رقم صفر سے زیادہ ہونی چاہیے',
    errorTooLarge: 'یہ رقم بہت زیادہ ہے',
    errorAddMerchant: 'مرچنٹ یا تفصیل شامل کریں',
    hintEnterBoth: 'رقم اور مرچنٹ درج کریں',
    hintEnterAmount: 'رقم درج کریں',
  },

  transactionDetail: {
    notFound: 'ٹرانزیکشن نہیں ملی',
    source: 'ذریعہ',
    sourceSms: 'SMS سے خود کار',
    sourceManual: 'مینوئل اندراج',
    bookmark: 'بک مارک',
    removeBookmark: 'بک مارک ہٹائیں',
    changeCategory: 'زمرہ تبدیل کریں',
    originalAlert: 'اصل الرٹ',
    deleteButton: 'ٹرانزیکشن حذف کریں',
    deleteAccessibility: 'ٹرانزیکشن حذف کریں',
    deleteTitle: 'ٹرانزیکشن حذف کریں؟',
    deleteMessage: '{{merchant}} پر {{amount}} ہٹا دیا جائے گا۔ یہ واپس نہیں ہو سکتا۔',
  },

  smsPermissionSheet: {
    title: 'صرف بینک الرٹس پڑھیں، اور کچھ نہیں',
    subtitle:
      'FlowMoney صرف بینک/ٹرانزیکشن SMS اسکین کرتا ہے۔ ذاتی پیغامات کبھی نہیں پڑھے یا محفوظ کیے جاتے۔',
    exampleLabel: 'مثال',
    exampleSender: 'HBL-Alert',
    exampleBody: 'Debit Rs. 1,250 at FOODPANDA on 12-Apr. Avl Bal: Rs. 84,310.',
    bulletStaysOnPhone: 'اسی فون پر رہتا ہے — کوئی سرور نہیں، کوئی اپ لوڈ نہیں۔',
    bulletReadsFinancial: 'صرف وہ پیغامات پڑھتا ہے جو مالی نظر آئیں۔',
    bulletNeverReadsOtps: 'کبھی OTPs، دوستوں کے پیغامات یا میڈیا نہیں پڑھتا۔',
    continue: 'جاری رکھیں',
    iosGotIt: 'سمجھ گیا',
    openSettings: 'ترتیبات کھولیں',
    deniedHelper:
      'اجازت مسترد ہوئی۔ جاری رکھنے کے لیے ترتیبات میں FlowMoney کے لیے SMS رسائی فعال کریں۔',
  },

  categories: {
    food: 'کھانا',
    transport: 'ٹرانسپورٹ',
    bills: 'بل',
    shopping: 'خریداری',
    entertainment: 'تفریح',
    health: 'صحت',
    subscriptions: 'سبسکرپشنز',
    transfer: 'منتقلی',
    other: 'دیگر',
  },

  insightEngine: {
    weeklyUp: {
      title: 'اس ہفتے اخراجات {{change}}% بڑھے',
      description:
        'آپ {{daily}} یومیہ پر چل رہے ہیں — گزشتہ ہفتے سے زیادہ تیز۔',
    },
    weeklyDown: {
      title: 'اس ہفتے آپ بہتر کر رہے ہیں',
      description:
        'آپ کے اخراجات گزشتہ ہفتے سے {{change}}% کم ہیں۔ یہی برقرار رکھیں۔',
    },
    topCategory: {
      title: '{{category}} آپ کا سب سے بڑا خرچ',
      description: '{{category}} اس ماہ کا {{percent}}% — {{total}}۔{{tail}}',
      tail: ' یہ آپ کے اگلے زمرے {{runnerUp}} ({{runnerUpTotal}}) سے {{ratio}}× زیادہ ہے۔',
    },
    weekend: {
      title: 'آپ کے ویک اینڈز زیادہ مہنگے',
      description:
        'ویک اینڈ کے دن ہفتے کے دنوں سے {{percent}}% زیادہ خرچ ہوئے۔ گزشتہ ویک اینڈ {{total}} رہا۔',
    },
    lateNight: {
      title: 'دیر رات کے اخراجات نمایاں',
      description:
        'گزشتہ 30 دنوں میں {{total}} رات 9 سے 12 بجے کے درمیان خرچ ہوئے۔{{tail}}',
      tail: ' زیادہ تر {{category}} ({{percent}}%) میں ہے۔',
    },
    frequentMerchant: {
      title: 'اس ہفتے {{merchant}} پر {{count}} آرڈرز',
      description: 'یہ {{count}} ٹرانزیکشنز میں کل {{total}} ہیں — اوسطاً {{average}}۔',
    },
    accelerating: {
      title: 'اخراجات کی رفتار تیز ہو رہی',
      description:
        'گزشتہ 3 دنوں کی اوسط {{recent}} یومیہ — پچھلے دو ہفتوں کی {{baseline}} یومیہ سے زیادہ۔',
    },
    biggestThisWeek: {
      title: 'اس ہفتے کا سب سے بڑا خرچ',
      description: '{{day}} کو {{merchant}} پر {{amount}}۔',
    },
    betterMonth: {
      title: 'بہتر ماہ کی طرف',
      description:
        'گزشتہ ماہ کے اس وقت سے آپ {{change}}% کم خرچ کر رہے ہیں — {{thisMonth}} بمقابلہ {{lastMonth}}۔',
    },
  },

  insightCard: {
    label: {
      positive: 'اچھی خبر',
      warning: 'دھیان دیں',
      alert: 'فوری توجہ',
      neutral: 'پیٹرن',
    },
  },

  trend: {
    onTrack: 'ٹھیک راستے پر',
    up: '{{percent}}% زیادہ',
    down: '{{percent}}% کم',
  },

  notifications: {
    received: '{{merchant}} سے {{amount}} موصول ہوئے',
    receivedShort: '{{merchant}} سے +{{amount}}',
    receivedDash: '{{merchant}} — +{{amount}}',
    spent: 'آپ نے ابھی {{merchant}} پر {{amount}} خرچ کیے',
    spentShort: '{{merchant}} پر {{amount}}',
    spentDash: '{{merchant}} — {{amount}}',
    overAverageTitle: 'آپ معمول سے زیادہ تیزی سے خرچ کر رہے ہیں',
    overAverageBody:
      'آج آپ کی اوسط سے {{percent}}% زیادہ چل رہا ہے۔ {{amount}} خرچ ہوئے۔',
  },

  language: {
    en: 'English',
    ur: 'اردو',
    hi: 'हिन्दी',
    systemDefault: 'سسٹم ڈیفالٹ',
  },
};
